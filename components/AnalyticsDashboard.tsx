'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Ticket, Users, FileText, RefreshCw, BarChart2, ChevronDown, Globe, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ── Types ── */
interface KPIs {
  totalTickets: number;
  totalRevenue: number;
  totalSubscribers: number;
  totalApplications: number;
  conversionRate: number;
}

interface TicketByEvent {
  slug: string;
  title: string;
  tickets: number;
  revenue: number;
}

interface MonthRevenue {
  month: string;
  label: string;
  revenue: number;
}

interface SubscriberWeek {
  week: string;
  label: string;
  new: number;
  cumulative: number;
}

interface RecentTicket {
  buyer: string;
  event: string;
  tickets: number;
  date: string;
}

interface EventOption {
  slug: string;
  title: string;
}

interface AnalyticsData {
  events: EventOption[];
  kpis: KPIs;
  ticketsByEvent: TicketByEvent[];
  revenueByMonth: MonthRevenue[];
  subscriberGrowth: SubscriberWeek[];
  recentTickets: RecentTicket[];
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

/* ── Tiny SVG Line Chart ── */
function LineChart({ data, color = '#731515' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;

  const W = 400, H = 80, PAD = 8;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });

  const area = [
    `M ${pts[0]}`,
    ...pts.slice(1).map((p) => `L ${p}`),
    `L ${W - PAD},${H - PAD}`,
    `L ${PAD},${H - PAD}`,
    'Z',
  ].join(' ');

  const line = [`M ${pts[0]}`, ...pts.slice(1).map((p) => `L ${p}`)].join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lineGrad)" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => {
        const [x, y] = p.split(',').map(Number);
        return (
          <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
        );
      })}
    </svg>
  );
}

/* ── Horizontal Bar Chart ── */
function HBarChart({ items, maxValue, color = '#731515' }: {
  items: { label: string; value: number; sub?: string }[];
  maxValue: number;
  color?: string;
}) {
  if (items.length === 0) return (
    <p className="text-xs text-[#7a4a4a]/40 italic py-4" style={{ fontFamily: 'var(--font-nunito)' }}>
      No data yet.
    </p>
  );

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const pct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={item.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#1a0505] truncate flex-1" style={{ fontFamily: 'var(--font-nunito)' }}>
                {item.label}
              </span>
              <span className="text-xs font-medium text-[#731515] shrink-0" style={{ fontFamily: 'var(--font-syne)' }}>
                {item.value}{item.sub ?? ''}
              </span>
            </div>
            <div className="h-1.5 bg-[#e8d5d5] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Vertical Bar Chart (for monthly revenue) ── */
function VBarChart({ items, color = '#731515' }: {
  items: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="flex items-end gap-2 h-24">
      {items.map((item) => {
        const pct = (item.value / max) * 100;
        return (
          <div key={item.label} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="w-full relative flex items-end" style={{ height: '72px' }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(pct, item.value > 0 ? 4 : 0)}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="w-full rounded-sm"
                style={{ backgroundColor: item.value > 0 ? color : '#e8d5d5' }}
              />
            </div>
            <span
              className="text-[8px] text-[#7a4a4a]/50 leading-none"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {item.label}
            </span>
          </div>
        );
      })}
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

  useEffect(() => { load(''); }, [load]);

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'newsletter_subscribers' }, scheduleRefresh)
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

  const { kpis, ticketsByEvent, revenueByMonth, subscriberGrowth, recentTickets } = data;
  const isFiltered = !!selectedEvent;
  const selectedTitle = isFiltered
    ? (data.events.find((e) => e.slug === selectedEvent)?.title ?? selectedEvent)
    : '';

  const maxTickets = Math.max(...ticketsByEvent.map((e) => e.tickets), 1);

  const growthValues = subscriberGrowth.map((w) => w.cumulative);

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
          value={`€${kpis.totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub={isFiltered ? selectedTitle : 'from Stripe'}
          icon={TrendingUp}
          delay={0}
        />
        <KpiCard
          label="TICKETS SOLD"
          value={kpis.totalTickets}
          sub={isFiltered ? selectedTitle : 'all events'}
          icon={Ticket}
          delay={0.06}
        />
        <KpiCard
          label="SUBSCRIBERS"
          value={kpis.totalSubscribers}
          sub="newsletter"
          icon={Users}
          delay={0.12}
        />
        <KpiCard
          label="APPLICATIONS"
          value={kpis.totalApplications}
          sub={`${kpis.conversionRate}% conversion`}
          icon={FileText}
          delay={0.18}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Tickets per event */}
        <Card title={isFiltered ? `TICKETS — ${selectedTitle.toUpperCase()}` : 'TICKETS SOLD PER EVENT'}>
          <HBarChart
            items={ticketsByEvent.map((e) => ({
              label: e.title,
              value: e.tickets,
              sub: e.revenue > 0 ? ` · €${e.revenue}` : ' · free',
            }))}
            maxValue={maxTickets}
          />
        </Card>

        {/* Monthly Revenue */}
        <Card title="MONTHLY REVENUE (EUR)">
          {revenueByMonth.every((m) => m.revenue === 0) ? (
            <p className="text-xs text-[#7a4a4a]/40 italic py-4" style={{ fontFamily: 'var(--font-nunito)' }}>
              No revenue recorded yet.
            </p>
          ) : (
            <>
              <VBarChart items={revenueByMonth.map((m) => ({ label: m.label, value: m.revenue }))} />
              <div className="flex items-center justify-between pt-2 border-t border-[#e8d5d5]">
                <span className="text-[9px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                  Last 6 months
                </span>
                <span className="text-sm font-medium text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
                  €{revenueByMonth.reduce((s, m) => s + m.revenue, 0).toFixed(0)} total
                </span>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Subscriber growth */}
      <Card title="NEWSLETTER SUBSCRIBER GROWTH (LAST 12 WEEKS)">
        {kpis.totalSubscribers === 0 ? (
          <p className="text-xs text-[#7a4a4a]/40 italic py-4" style={{ fontFamily: 'var(--font-nunito)' }}>
            No subscribers yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="h-20 w-full">
              <LineChart data={growthValues} />
            </div>
            {/* X axis labels */}
            <div className="flex justify-between px-1">
              {subscriberGrowth
                .filter((_, i) => i % 2 === 0 || i === subscriberGrowth.length - 1)
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
                New this period: +{subscriberGrowth.reduce((s, w) => s + w.new, 0)}
              </span>
              <span className="text-sm font-medium text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
                {kpis.totalSubscribers} total
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Recent activity */}
      {recentTickets.length > 0 && (
        <Card title="RECENT TICKET ORDERS">
          <div className="flex flex-col divide-y divide-[#e8d5d5]">
            {recentTickets.map((t, i) => (
              <div key={i} className="py-3 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
                    {t.buyer}
                  </span>
                  <span className="text-[10px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {t.event}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[9px] tracking-[0.15em] px-2 py-0.5 border border-[#e8d5d5] text-[#7a4a4a]">
                    {t.tickets} ticket{t.tickets > 1 ? 's' : ''}
                  </span>
                  <span className="text-[9px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
                <div className="flex items-end gap-2 h-20">
                  {(() => {
                    const maxV = Math.max(...visitors.weeklyChart.map((w) => w.visitors), 1);
                    return visitors.weeklyChart.map((w, i) => {
                      const pct = (w.visitors / maxV) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                            <div className="bg-[#1a0505] text-white text-[9px] px-2 py-1 whitespace-nowrap rounded-sm" style={{ fontFamily: 'var(--font-nunito)' }}>
                              {w.visitors.toLocaleString('it-IT')} utenti
                            </div>
                            <div className="w-1.5 h-1.5 bg-[#1a0505] rotate-45 -mt-[3px]" />
                          </div>
                          <div className="w-full relative flex items-end" style={{ height: '60px' }}>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${Math.max(pct, w.visitors > 0 ? 5 : 0)}%` }}
                              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                              className="w-full rounded-sm"
                              style={{ backgroundColor: w.visitors > 0 ? '#731515' : '#e8d5d5' }}
                            />
                          </div>
                          <span className="text-[7px] text-[#7a4a4a]/40 leading-none text-center" style={{ fontFamily: 'var(--font-nunito)' }}>
                            {w.label}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
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
