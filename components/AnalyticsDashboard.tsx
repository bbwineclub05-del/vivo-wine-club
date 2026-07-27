'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Ticket, Users, FileText, RefreshCw, BarChart2, ChevronDown, Globe, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────────
   Chart palette — validated (dataviz skill):
   node scripts/validate_palette.js "#aa4848,#2a78d6" --mode light → ALL PASS
   #aa4848 is already the app's own bordeaux-hover shade (not a new color);
   #2a78d6 is the skill's default blue. Single-series charts keep the
   brand's primary bordeaux #731515 directly (no categorical pairing gate).
───────────────────────────────────────────── */
const SERIES = { tickets: '#aa4848', guests: '#2a78d6', primary: '#731515' };

/* ── Types ── */
interface KPIs {
  totalTickets: number;
  totalGuests: number;
  totalParticipants: number;
  totalRevenue: number;
  totalCustomers: number;
  totalApplications: number;
  approvalRate: number;
}

interface TicketByEvent {
  slug: string;
  title: string;
  tickets: number;
  guests: number;
  revenue: number;
  participants: number;
}

interface MonthRevenue {
  month: string;
  label: string;
  revenue: number;
}

interface ParticipantWeek {
  week: string;
  label: string;
  tickets: number;
  guests: number;
  total: number;
}

interface CustomerWeek {
  week: string;
  label: string;
  new: number;
  cumulative: number;
}

interface EventOption {
  slug: string;
  title: string;
}

interface AnalyticsData {
  events: EventOption[];
  kpis: KPIs;
  selectedEventPrice: number | null;
  ticketsByEvent: TicketByEvent[];
  revenueByMonth: MonthRevenue[];
  participantsGrowth: ParticipantWeek[];
  customerGrowth: CustomerWeek[];
}

interface VisitorWeek {
  label: string;
  visitors: number;
}

interface VisitorData {
  todayVisitors: number;
  last7daysVisitors: number;
  last30daysVisitors: number;
  weeklyChart: VisitorWeek[];
}

/* ── Legend dot ── */
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-[#7a4a4a]/70" style={{ fontFamily: 'var(--font-nunito)' }}>
      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

/* ── Tiny SVG Line Chart — single series, with hover ── */
function LineChart({ data, labels, color = SERIES.primary, valueSuffix = '' }: {
  data: number[];
  labels: string[];
  color?: string;
  valueSuffix?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length < 2) return null;

  const W = 400, H = 90, PAD = 8;
  const min = Math.min(...data, 0);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
    return [x, y] as const;
  });

  const area = [`M ${pts[0][0]},${pts[0][1]}`, ...pts.slice(1).map(([x, y]) => `L ${x},${y}`), `L ${W - PAD},${H - PAD}`, `L ${PAD},${H - PAD}`, 'Z'].join(' ');
  const line = [`M ${pts[0][0]},${pts[0][1]}`, ...pts.slice(1).map(([x, y]) => `L ${x},${y}`)].join(' ');

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#lineGrad)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <g key={i}>
            {hover === i && <line x1={x} y1={PAD} x2={x} y2={H - PAD} stroke={color} strokeOpacity="0.25" strokeWidth="1" />}
            <circle cx={x} cy={y} r={hover === i ? 4 : 2.5} fill={color} />
            {/* generous invisible hit target */}
            <rect
              x={x - (W / data.length) / 2} y={0} width={W / data.length} height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div
          className="absolute -top-1 -translate-x-1/2 -translate-y-full bg-[#1a0505] text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none z-10"
          style={{ left: `${(pts[hover][0] / W) * 100}%`, fontFamily: 'var(--font-nunito)' }}
        >
          {labels[hover]}: <strong>{data[hover]}{valueSuffix}</strong>
        </div>
      )}
    </div>
  );
}

/* ── Horizontal Stacked Bar Chart (tickets vs guest-list, per event) ── */
function StackedHBarChart({ items, maxValue }: {
  items: { label: string; tickets: number; guests: number; revenue: number }[];
  maxValue: number;
}) {
  const [hover, setHover] = useState<{ idx: number; seg: 'tickets' | 'guests' } | null>(null);

  if (items.length === 0) return (
    <p className="text-xs text-[#7a4a4a]/40 italic py-4" style={{ fontFamily: 'var(--font-nunito)' }}>
      No data yet.
    </p>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <LegendDot color={SERIES.tickets} label="Ticket" />
        <LegendDot color={SERIES.guests} label="Lista" />
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item, idx) => {
          const total = item.tickets + item.guests;
          const pctTickets = maxValue > 0 ? (item.tickets / maxValue) * 100 : 0;
          const pctGuests  = maxValue > 0 ? (item.guests  / maxValue) * 100 : 0;
          const onlyTickets = item.tickets > 0 && item.guests === 0;
          const onlyGuests  = item.guests > 0 && item.tickets === 0;
          return (
            <div key={item.label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#1a0505] truncate flex-1" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {item.label}
                </span>
                <span className="text-xs font-medium text-[#731515] shrink-0" style={{ fontFamily: 'var(--font-syne)' }}>
                  {total} {item.revenue > 0 ? `· €${item.revenue}` : ''}
                </span>
              </div>
              <div className="h-2.5 bg-[#f5eded] rounded-full overflow-hidden flex">
                {item.tickets > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctTickets}%` }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-full ${onlyTickets ? 'rounded-full' : 'rounded-l-full'}`}
                    style={{ backgroundColor: SERIES.tickets, marginRight: item.guests > 0 ? 2 : 0 }}
                    onMouseEnter={() => setHover({ idx, seg: 'tickets' })}
                    onMouseLeave={() => setHover(null)}
                  />
                )}
                {item.guests > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctGuests}%` }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-full ${onlyGuests ? 'rounded-full' : 'rounded-r-full'}`}
                    style={{ backgroundColor: SERIES.guests }}
                    onMouseEnter={() => setHover({ idx, seg: 'guests' })}
                    onMouseLeave={() => setHover(null)}
                  />
                )}
              </div>
              {hover?.idx === idx && (
                <span className="text-[10px] text-[#7a4a4a]/70" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {hover.seg === 'tickets' ? `${item.tickets} ticket venduti` : `${item.guests} iscritti in lista`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Vertical Bar Chart (single series, with hover) ── */
function VBarChart({ items, color = SERIES.primary, valuePrefix = '' }: {
  items: { label: string; value: number }[];
  color?: string;
  valuePrefix?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="flex items-end gap-1.5 h-24">
      {items.map((item, i) => {
        const pct = (item.value / max) * 100;
        return (
          <div key={item.label} className="flex-1 flex flex-col items-center gap-1 group relative">
            {hover === i && (
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-[#1a0505] text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none z-10" style={{ fontFamily: 'var(--font-nunito)' }}>
                {valuePrefix}{item.value.toLocaleString('it-IT')}
              </div>
            )}
            <div
              className="w-full relative flex items-end"
              style={{ height: '72px' }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(pct, item.value > 0 ? 4 : 0)}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full rounded-sm"
                style={{ backgroundColor: item.value > 0 ? color : '#e8d5d5' }}
              />
            </div>
            <span className="text-[7px] text-[#7a4a4a]/50 leading-none" style={{ fontFamily: 'var(--font-nunito)' }}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Stacked Vertical Bar Chart (participants: tickets + guest-list, over time) ── */
function StackedVBarChart({ items }: {
  items: { label: string; tickets: number; guests: number }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...items.map((i) => i.tickets + i.guests), 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <LegendDot color={SERIES.tickets} label="Ticket" />
        <LegendDot color={SERIES.guests} label="Lista" />
      </div>
      <div className="flex items-end gap-1.5 h-24">
        {items.map((item, i) => {
          const total = item.tickets + item.guests;
          const pctTickets = (item.tickets / max) * 100;
          const pctGuests  = (item.guests  / max) * 100;
          return (
            <div key={item.label} className="flex-1 flex flex-col items-center gap-1 group relative">
              {hover === i && (
                <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-[#1a0505] text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none z-10" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {item.tickets} ticket · {item.guests} lista
                </div>
              )}
              <div
                className="w-full relative flex flex-col justify-end gap-[2px]"
                style={{ height: '72px' }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {total === 0 ? (
                  <div className="w-full rounded-sm" style={{ height: '3px', backgroundColor: '#e8d5d5' }} />
                ) : (
                  <>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pctGuests}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full rounded-t-sm"
                      style={{ backgroundColor: SERIES.guests }}
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pctTickets, item.tickets > 0 ? 3 : 0)}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full rounded-b-sm"
                      style={{ backgroundColor: SERIES.tickets }}
                    />
                  </>
                )}
              </div>
              <span className="text-[7px] text-[#7a4a4a]/50 leading-none" style={{ fontFamily: 'var(--font-nunito)' }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── KPI Card ── */
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  delay,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white border border-[#e8d5d5] p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60">{label}</div>
        <div className="w-7 h-7 bg-[#fde8e8] flex items-center justify-center">
          <Icon size={13} className="text-[#731515]" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span
          className="text-[clamp(1.6rem,3vw,2rem)] font-light text-[#1a0505] leading-none"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {value}
        </span>
        {sub && (
          <span className="text-xs text-[#7a4a4a]/50 mb-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
            {sub}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ── Section card wrapper ── */
function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[#e8d5d5] p-6 flex flex-col gap-5 ${className}`}>
      <div className="text-[9px] tracking-[0.4em] text-[#731515]">{title}</div>
      {children}
    </div>
  );
}

/* ── Main component ── */
export default function AnalyticsDashboard() {
  const [data, setData]             = useState<AnalyticsData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [visitors, setVisitors]     = useState<VisitorData | null>(null);
  const [visitorsLoading, setVisitorsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep selected event accessible inside the realtime callback without stale closure
  const selectedEventRef = useRef(selectedEvent);
  useEffect(() => { selectedEventRef.current = selectedEvent; }, [selectedEvent]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });
  }, []);

  const load = useCallback(async (slug = '') => {
    setLoading(true);
    setError('');
    try {
      const url  = slug ? `/api/analytics?event_slug=${encodeURIComponent(slug)}` : '/api/analytics';
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load analytics');
      setData(json);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading analytics');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(selectedEventRef.current); }, [load]);

  /* ── Load visitor stats from Google Analytics Data API ── */
  const loadVisitors = useCallback(async () => {
    if (!accessToken) return;
    setVisitorsLoading(true);
    try {
      const res  = await fetch('/api/analytics/visitors', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok) setVisitors(json);
    } catch {/* non-fatal */} finally {
      setVisitorsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { loadVisitors(); }, [loadVisitors]);

  /* ── Supabase Realtime — debounced refresh when underlying data changes ── */
  useEffect(() => {
    if (!accessToken) return;
    supabase.realtime.setAuth(accessToken);

    function scheduleRefresh() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => load(selectedEventRef.current), 2500);
    }

    const channel = supabase
      .channel('analytics_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets'      }, scheduleRefresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets'      }, scheduleRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'merch_orders' }, scheduleRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_guests' }, scheduleRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'customers'    }, scheduleRefresh)
      .subscribe((status) => {
        setLiveConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [accessToken, load]);

  function handleEventChange(slug: string) {
    setSelectedEvent(slug);
    load(slug);
  }

  const eventOptions = data?.events ?? [];

  /* Header */
  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#fde8e8] flex items-center justify-center shrink-0">
          <BarChart2 size={15} className="text-[#731515]" />
        </div>
        <h2 className="text-[10px] tracking-[0.4em] text-[#1a0505]">ANALYTICS</h2>
        <a
          href="https://analytics.google.com/analytics/web/#/a395406455p538468146"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[8px] tracking-[0.2em] text-[#7a4a4a]/50 hover:text-[#731515] border border-[#e8d5d5] bg-white hover:border-[#731515]/30 px-2 py-1 transition-all duration-200"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          GA4
          <ExternalLink size={9} />
        </a>
        <a
          href="https://business.facebook.com/events_manager2/list/pixel/889556867506381/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[8px] tracking-[0.2em] text-[#7a4a4a]/50 hover:text-[#731515] border border-[#e8d5d5] bg-white hover:border-[#731515]/30 px-2 py-1 transition-all duration-200"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          META PIXEL
          <ExternalLink size={9} />
        </a>
        {liveConnected && (
          <span className="flex items-center gap-1 text-[8px] tracking-[0.2em] text-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Event filter dropdown */}
        {eventOptions.length > 0 && (
          <div className="relative">
            <select
              value={selectedEvent}
              onChange={(e) => handleEventChange(e.target.value)}
              className="appearance-none text-[9px] tracking-[0.2em] border border-[#e8d5d5] bg-white text-[#6b3333] pl-3 pr-7 py-1.5 focus:outline-none focus:border-[#731515]/40 cursor-pointer transition-colors"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              <option value="">ALL EVENTS</option>
              {eventOptions.map((e) => (
                <option key={e.slug} value={e.slug}>{e.title}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9a6060] pointer-events-none" />
          </div>
        )}
        {lastRefresh && (
          <span className="text-[9px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
            Updated {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button
          onClick={() => load(selectedEvent)}
          disabled={loading}
          className="w-7 h-7 flex items-center justify-center border border-[#e8d5d5] bg-white text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515] disabled:opacity-40 transition-all duration-200"
          aria-label="Refresh"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div className="py-12 text-center text-xs text-[#7a4a4a]/40 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
          Loading analytics…
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div className="py-8 text-center text-xs text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, ticketsByEvent, revenueByMonth, participantsGrowth, customerGrowth } = data;
  const isFiltered = !!selectedEvent;
  const selectedTitle = isFiltered
    ? (data.events.find((e) => e.slug === selectedEvent)?.title ?? selectedEvent)
    : '';
  const isFreeEvent = isFiltered && data.selectedEventPrice === 0;

  const maxParticipants = Math.max(...ticketsByEvent.map((e) => e.participants), 1);

  return (
    <div className="flex flex-col gap-6">
      {header}

      {/* Event filter active banner */}
      {isFiltered && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#fde8e8] border border-[#731515]/15 text-[9px] tracking-[0.25em] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
          <span>FILTERING:</span>
          <span className="font-medium">{selectedTitle}</span>
          <button
            onClick={() => handleEventChange('')}
            className="ml-auto underline underline-offset-2 hover:no-underline transition-all"
          >
            CLEAR
          </button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="TOTAL REVENUE"
          value={isFreeEvent ? '€0' : `€${kpis.totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub={isFreeEvent ? 'free event' : isFiltered ? selectedTitle : 'from Stripe'}
          icon={TrendingUp}
          delay={0}
        />
        <KpiCard
          label="TICKETS SOLD"
          value={kpis.totalParticipants}
          sub={isFiltered ? selectedTitle : `${kpis.totalTickets} ticket + ${kpis.totalGuests} lista`}
          icon={Ticket}
          delay={0.06}
        />
        <KpiCard
          label="PARTECIPANTI"
          value={kpis.totalParticipants}
          sub={`ticket + ${kpis.totalGuests} lista`}
          icon={Users}
          delay={0.12}
        />
        <KpiCard
          label="APPLICATIONS"
          value={kpis.totalApplications}
          sub={`${kpis.approvalRate}% approvate`}
          icon={FileText}
          delay={0.18}
        />
      </div>

      {/* Tickets + list per event */}
      <Card title={isFiltered ? `PARTECIPANTI — ${selectedTitle.toUpperCase()}` : 'PARTECIPANTI PER EVENTO (TICKET + LISTA) — ULTIMI 6'}>
        <StackedHBarChart
          items={ticketsByEvent.map((e) => ({ label: e.title, tickets: e.tickets, guests: e.guests, revenue: e.revenue }))}
          maxValue={maxParticipants}
        />
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Monthly Revenue */}
        <Card title="MONTHLY REVENUE (EUR) — ULTIMI 12 MESI">
          {revenueByMonth.every((m) => m.revenue === 0) ? (
            <p className="text-xs text-[#7a4a4a]/40 italic py-4" style={{ fontFamily: 'var(--font-nunito)' }}>
              No revenue recorded yet.
            </p>
          ) : (
            <>
              <VBarChart items={revenueByMonth.map((m) => ({ label: m.label, value: m.revenue }))} valuePrefix="€" />
              <div className="flex items-center justify-between pt-2 border-t border-[#e8d5d5]">
                <span className="text-[9px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                  Ultimi 12 mesi
                </span>
                <span className="text-sm font-medium text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
                  €{revenueByMonth.reduce((s, m) => s + m.revenue, 0).toFixed(0)} total
                </span>
              </div>
            </>
          )}
        </Card>

        {/* Participants growth (tickets + list, weekly) */}
        <Card title="PARTECIPANTI — ULTIME 12 SETTIMANE">
          {participantsGrowth.every((w) => w.total === 0) ? (
            <p className="text-xs text-[#7a4a4a]/40 italic py-4" style={{ fontFamily: 'var(--font-nunito)' }}>
              Nessun ticket o iscrizione lista ancora.
            </p>
          ) : (
            <>
              <StackedVBarChart items={participantsGrowth.map((w) => ({ label: w.label, tickets: w.tickets, guests: w.guests }))} />
              <div className="flex items-center justify-between pt-2 border-t border-[#e8d5d5]">
                <span className="text-[9px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                  Nuovi in questo periodo
                </span>
                <span className="text-sm font-medium text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
                  {participantsGrowth.reduce((s, w) => s + w.total, 0)}
                </span>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* CRM customer growth (replaces recent ticket orders) */}
      <Card title="CRESCITA CLIENTI CRM (ULTIME 12 SETTIMANE)">
        {kpis.totalCustomers === 0 ? (
          <p className="text-xs text-[#7a4a4a]/40 italic py-4" style={{ fontFamily: 'var(--font-nunito)' }}>
            Nessun cliente ancora.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="h-24 w-full">
              <LineChart
                data={customerGrowth.map((w) => w.cumulative)}
                labels={customerGrowth.map((w) => w.label)}
              />
            </div>
            {/* X axis labels */}
            <div className="flex justify-between px-1">
              {customerGrowth
                .filter((_, i) => i % 2 === 0 || i === customerGrowth.length - 1)
                .map((w) => (
                  <span
                    key={w.week}
                    className="text-[8px] text-[#7a4a4a]/40"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {w.label}
                  </span>
                ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#e8d5d5]">
              <span className="text-[9px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                Nuovi in questo periodo: +{customerGrowth.reduce((s, w) => s + w.new, 0)}
              </span>
              <span className="text-sm font-medium text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
                {kpis.totalCustomers} totali
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* ── Visitatori del Sito (Google Analytics) ── */}
      <Card title="VISITATORI DEL SITO — GOOGLE ANALYTICS">
        {visitorsLoading ? (
          <p className="text-xs text-[#7a4a4a]/40 italic py-4" style={{ fontFamily: 'var(--font-nunito)' }}>
            Caricamento dati visitatori…
          </p>
        ) : !visitors ? (
          <a
            href="https://analytics.google.com/analytics/web/#/a395406455p538468146"
            target="_blank"
            rel="noopener noreferrer"
            className="self-start inline-flex items-center gap-2 bg-[#731515] hover:bg-[#5a1010] text-white text-[10px] tracking-[0.25em] px-5 py-2.5 transition-colors duration-200"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Apri Google Analytics →
          </a>
        ) : (
          <div className="flex flex-col gap-6">
            {/* KPI row: oggi / 7gg / 30gg */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'OGGI',          value: visitors.todayVisitors      },
                { label: 'ULTIMI 7 GG',   value: visitors.last7daysVisitors  },
                { label: 'ULTIMI 30 GG',  value: visitors.last30daysVisitors },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <Globe size={11} className="text-[#731515]" />
                    <span className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60">{label}</span>
                  </div>
                  <span
                    className="text-[clamp(1.4rem,3vw,2rem)] font-light text-[#1a0505] leading-none"
                    style={{ fontFamily: 'var(--font-syne)' }}
                  >
                    {value.toLocaleString('it-IT')}
                  </span>
                  <span className="text-[10px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
                    utenti attivi
                  </span>
                </div>
              ))}
            </div>

            {/* Weekly bar chart */}
            {visitors.weeklyChart.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="text-[9px] tracking-[0.3em] text-[#7a4a4a]/50">UTENTI ATTIVI PER SETTIMANA (ULTIME 4 SETTIMANE)</div>
                <VBarChart items={visitors.weeklyChart.map((w) => ({ label: w.label, value: w.visitors }))} />
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#e8d5d5]">
              <span className="text-[9px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
                Via Google Analytics Data API · Property 538468146
              </span>
              <button
                onClick={loadVisitors}
                className="text-[9px] tracking-[0.15em] text-[#7a4a4a]/40 hover:text-[#731515] transition-colors"
              >
                Aggiorna
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
