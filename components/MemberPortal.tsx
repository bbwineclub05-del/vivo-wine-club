'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, KeyRound, LogOut, Menu, X, ArrowUpRight,
  Tag, Wine, CreditCard, User, CalendarDays, GlassWater, Ticket,
  Download, MapPin, Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DiscountsView from '@/components/DiscountsView';
import type { EventData } from '@/lib/events';

// ── Types ──────────────────────────────────────────────────────────────────────

type MemberSection = 'home' | 'my-events' | 'events' | 'discounts' | 'profile' | 'settings';

export interface MemberPortalProps {
  user:            { name?: string | null; email?: string | null };
  token:           string;
  onLogout:        () => void;
  initialSection?: MemberSection;
}

// ── Wine interests ─────────────────────────────────────────────────────────────

const WINE_INTERESTS = [
  'Natural Wine',
  'Biodynamic',
  'Italian Wines',
  'French Wines',
  'Sparkling',
  'Rosé',
  'Orange Wine',
  'Aged Reds',
  'Wine & Food Pairing',
  'Wine Visits',
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function UserAvatar({ name, size = 36, src }: { name: string; size?: number; src?: string | null }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size, minWidth: size }}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, minWidth: size, fontSize: Math.round(size * 0.37) }}
      className="rounded-full bg-gradient-to-br from-[#731515] to-[#3d0808] flex items-center justify-center text-white font-semibold select-none"
    >
      {initials}
    </div>
  );
}

interface NavItem {
  id:    MemberSection;
  label: string;
  icon:  React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',      label: 'Home',           icon: Home       },
  { id: 'my-events', label: 'My Events',       icon: Ticket     },
  { id: 'events',    label: 'Upcoming Events', icon: CalendarDays},
  { id: 'discounts', label: 'Deals & Perks',   icon: Tag        },
  { id: 'profile',   label: 'My Profile',      icon: User       },
  { id: 'settings',  label: 'Settings',        icon: KeyRound   },
];

function NavBtn({
  item,
  active,
  onClick,
}: {
  item:    NavItem;
  active:  boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-left transition-all duration-150 text-[12.5px] relative ${
        active
          ? 'bg-[#731515]/25 text-white'
          : 'text-white/45 hover:text-white/75 hover:bg-white/[0.06]'
      }`}
      style={{ fontFamily: 'var(--font-nunito)' }}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#c84040] rounded-r-full" />
      )}
      <Icon size={14} className={active ? 'text-[#c84040]' : 'text-white/35'} />
      {item.label}
    </button>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1
        className="text-[clamp(1.6rem,2.5vw,2.2rem)] font-light text-white leading-none tracking-tight"
        style={{ fontFamily: 'var(--font-syne)' }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className="mt-2 text-sm text-white/50 font-light"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {subtitle}
        </p>
      )}
      <div className="mt-5 h-px w-16 bg-white/20" />
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white border border-[#eddada] rounded-xl p-6 shadow-[0_1px_4px_rgba(107,26,26,0.06),0_6px_20px_rgba(107,26,26,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

function CardLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon size={13} className="text-[#731515]" />
      <span className="text-[9px] tracking-[0.42em] text-[#731515] uppercase">{label}</span>
    </div>
  );
}

// ── Settings section ───────────────────────────────────────────────────────────

function SettingsSection() {
  const [pwd,    setPwd]    = useState('');
  const [conf,   setConf]   = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error,  setError]  = useState('');

  const inputClass =
    'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-4 py-2.5 text-sm placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200 rounded-lg';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pwd !== conf)   { setError("Passwords don't match."); return; }
    if (pwd.length < 6) { setError('Minimum 6 characters.'); return; }
    setStatus('loading');
    const { error: err } = await supabase.auth.updateUser({ password: pwd });
    if (err) { setError(err.message); setStatus('error'); }
    else     { setStatus('success'); setPwd(''); setConf(''); }
  }

  return (
    <>
      <SectionHeader title="Settings" subtitle="Manage your account security." />
      <div className="max-w-md">
        <Card>
          <CardLabel icon={KeyRound} label="Change Password" />
          {status === 'success' ? (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-[#2d6e2d] bg-[#2d6e2d]/8 border border-[#2d6e2d]/20 px-4 py-3 rounded-lg"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Password updated successfully.
            </motion.p>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">NEW PASSWORD</label>
                <input
                  type="password" required placeholder="••••••••" value={pwd}
                  onChange={e => { setPwd(e.target.value); setStatus('idle'); }}
                  className={inputClass} style={{ fontFamily: 'var(--font-nunito)' }}
                />
              </div>
              <div>
                <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">CONFIRM PASSWORD</label>
                <input
                  type="password" required placeholder="••••••••" value={conf}
                  onChange={e => { setConf(e.target.value); setStatus('idle'); }}
                  className={inputClass} style={{ fontFamily: 'var(--font-nunito)' }}
                />
              </div>
              {error && (
                <p className="text-[12px] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] hover:bg-[#9b2323] disabled:opacity-55 disabled:cursor-not-allowed transition-colors duration-200 rounded-lg mt-1"
              >
                {status === 'loading' ? 'UPDATING…' : 'UPDATE PASSWORD'}
              </button>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}

// ── My Events section ──────────────────────────────────────────────────────────

interface TicketWithEvent {
  order_id:   string;
  event_id:   string;
  name:       string;
  checked_in: boolean;
  event:      EventData | null;
}

function MyEventsSection({ token, userEmail }: { token: string; userEmail: string }) {
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/member/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setTickets(d.tickets ?? []);
      })
      .catch(() => setError('Failed to load tickets.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function downloadPdf(orderId: string, slug: string) {
    setDownloading(orderId);
    try {
      const res = await fetch(`/api/member/tickets/${encodeURIComponent(orderId)}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setError('Failed to download ticket.'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `vivo-ticket-${slug}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download ticket.');
    } finally {
      setDownloading(null);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function isUpcoming(ticket: TicketWithEvent) {
    if (!ticket.event) return false;
    const d = new Date(`${ticket.event.year}-${ticket.event.month}-${ticket.event.day}`);
    return d >= today;
  }

  const upcoming = tickets.filter(isUpcoming);
  const past     = tickets.filter(t => !isUpcoming(t));

  if (loading) {
    return (
      <>
        <SectionHeader title="My Events" subtitle="Your ticket history." />
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <SectionHeader title="My Events" subtitle="Your ticket history and upcoming events." />

      {error && (
        <p className="mb-6 text-sm text-[#e88a8a]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
      )}

      {tickets.length === 0 ? (
        <Card>
          <p className="text-center text-[#7a4a4a]/60 py-4" style={{ fontFamily: 'var(--font-nunito)' }}>
            No tickets yet. Book your first event below.
          </p>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-8">
              <div className="text-[9px] tracking-[0.45em] text-white/40 uppercase mb-4" style={{ fontFamily: 'var(--font-nunito)' }}>
                Upcoming
              </div>
              <div className="flex flex-col gap-4">
                {upcoming.map(t => (
                  <TicketCard
                    key={t.order_id}
                    ticket={t}
                    isUpcoming={true}
                    onDownload={downloadPdf}
                    downloading={downloading}
                  />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div className="text-[9px] tracking-[0.45em] text-white/40 uppercase mb-4" style={{ fontFamily: 'var(--font-nunito)' }}>
                Past Events
              </div>
              <div className="flex flex-col gap-4">
                {past.map(t => (
                  <TicketCard
                    key={t.order_id}
                    ticket={t}
                    isUpcoming={false}
                    onDownload={downloadPdf}
                    downloading={downloading}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function TicketCard({
  ticket,
  isUpcoming,
  onDownload,
  downloading,
}: {
  ticket:     TicketWithEvent;
  isUpcoming: boolean;
  onDownload: (orderId: string, slug: string) => void;
  downloading: string | null;
}) {
  const ev = ticket.event;
  const isDownloading = downloading === ticket.order_id;

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-stretch">
        {/* Date column */}
        <div className="shrink-0 w-[60px] sm:w-[72px] bg-[#fdf6f6] border-r border-[#eddada] flex flex-col items-center justify-center py-5 px-1 sm:px-2">
          <div className="text-[10px] tracking-[0.3em] text-[#731515] uppercase font-semibold">
            {ev?.month ?? '—'}
          </div>
          <div className="text-[28px] font-light text-[#1a0505] leading-none mt-0.5" style={{ fontFamily: 'var(--font-syne)' }}>
            {ev?.day ?? '—'}
          </div>
          <div className="text-[10px] text-[#7a4a4a]/50 mt-0.5">
            {ev?.year ?? ''}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              {ev && (
                <div className="text-[9px] tracking-[0.35em] text-[#731515] uppercase mb-1">
                  {ev.type}
                </div>
              )}
              <div className="text-[14px] font-medium text-[#1a0505] leading-tight truncate" style={{ fontFamily: 'var(--font-syne)' }}>
                {ev?.title ?? ticket.event_id}
              </div>
            </div>
            <span
              className={`shrink-0 text-[9px] tracking-wider px-2 py-0.5 rounded-full border ${
                isUpcoming
                  ? 'bg-[#2d6e2d]/10 border-[#2d6e2d]/25 text-[#2d6e2d]'
                  : 'bg-[#7a4a4a]/10 border-[#7a4a4a]/20 text-[#7a4a4a]/70'
              }`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {isUpcoming ? 'Upcoming' : 'Past'}
            </span>
          </div>

          {ev && (
            <div className="flex items-center gap-3 mb-3">
              {ev.time && (
                <div className="flex items-center gap-1 text-[11px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
                  <Clock size={10} />
                  {ev.time}
                </div>
              )}
              <div className="flex items-center gap-1 text-[11px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
                <MapPin size={10} />
                {ev.location}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-[#eddada] gap-2">
            <span
              className="text-[10px] text-[#7a4a4a]/40 font-mono truncate min-w-0"
            >
              {ticket.order_id}
            </span>
            <button
              onClick={() => onDownload(ticket.order_id, ev?.slug ?? ticket.event_id)}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.3em] text-white bg-[#731515] px-3 py-2.5 rounded-lg hover:bg-[#9b2323] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 uppercase shrink-0"
            >
              {isDownloading ? (
                <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={10} />
              )}
              {isDownloading ? 'Generating…' : 'Download Ticket'}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Upcoming Events section ────────────────────────────────────────────────────

function UpcomingEventsSection() {
  const [events,  setEvents]  = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const filtered = (d.events as EventData[]).filter(ev => {
          if (ev.status !== 'open' && ev.status !== 'soon') return false;
          const evDate = new Date(`${ev.year}-${ev.month}-${ev.day}`);
          return evDate >= today;
        });
        setEvents(filtered);
      })
      .catch(() => setError('Failed to load events.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <SectionHeader title="Upcoming Events" subtitle="Book your next wine experience." />
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <SectionHeader title="Upcoming Events" subtitle="Book your next wine experience." />

      {error && (
        <p className="mb-6 text-sm text-[#e88a8a]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
      )}

      {events.length === 0 ? (
        <Card>
          <p className="text-center text-[#7a4a4a]/60 py-4" style={{ fontFamily: 'var(--font-nunito)' }}>
            No upcoming events at the moment. Check back soon.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map(ev => (
            <EventCard key={ev.slug} event={ev} />
          ))}
        </div>
      )}
    </>
  );
}

function EventCard({ event: ev }: { event: EventData }) {
  return (
    <Card className="!p-0 overflow-hidden flex flex-col">
      {ev.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ev.image_url}
          alt={ev.title}
          className="w-full h-36 object-cover"
        />
      )}
      <div className="flex-1 p-5 flex flex-col">
        <div className="text-[8px] tracking-[0.45em] text-[#731515] uppercase mb-2">
          {ev.type}
        </div>
        <div className="text-[15px] font-light text-[#1a0505] leading-snug mb-3 flex-1" style={{ fontFamily: 'var(--font-syne)' }}>
          {ev.title}
        </div>
        <div className="flex flex-col gap-1 mb-4">
          <div className="flex items-center gap-1.5 text-[11px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
            <CalendarDays size={10} className="shrink-0" />
            {ev.month} {ev.day}, {ev.year}{ev.time ? ` · ${ev.time}` : ''}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
            <MapPin size={10} className="shrink-0" />
            {ev.location}
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-[#eddada]">
          <span className="text-[13px] font-medium text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
            {ev.price === 0 ? 'Free' : `€${ev.price.toFixed(2)}`}
          </span>
          {ev.status === 'soldout' ? (
            <span className="text-[9px] tracking-[0.3em] text-[#7a4a4a]/50 uppercase">Sold Out</span>
          ) : ev.status === 'soon' ? (
            <span className="text-[9px] tracking-[0.3em] text-[#7a4a4a]/50 uppercase">Coming Soon</span>
          ) : (
            <Link
              href={`/checkout/${ev.slug}`}
              className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.3em] text-white bg-[#731515] px-3 py-1.5 rounded-lg hover:bg-[#9b2323] transition-colors duration-200 uppercase"
            >
              Book Tickets
              <ArrowUpRight size={9} />
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Profile section ────────────────────────────────────────────────────────────

interface ProfileData {
  full_name:      string | null;
  city:           string | null;
  wine_interests: string[];
  avatar_url:     string | null;
}

function ProfileSection({ user, token }: { user: MemberPortalProps['user']; token: string }) {
  const [profile,   setProfile]   = useState<ProfileData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status,    setStatus]    = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg,  setErrorMsg]  = useState('');

  const [name,      setName]      = useState('');
  const [city,      setCity]      = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/member/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        const p: ProfileData = d.profile ?? {
          full_name:      user.name ?? null,
          city:           null,
          wine_interests: [],
          avatar_url:     null,
        };
        setProfile(p);
        setName(p.full_name ?? user.name ?? '');
        setCity(p.city ?? '');
        setInterests(p.wine_interests ?? []);
        setAvatarUrl(p.avatar_url ?? null);
      })
      .catch(() => setErrorMsg('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [token, user.name]);

  function toggleInterest(interest: string) {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest],
    );
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res  = await fetch('/api/member/profile/avatar', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });
      const data = await res.json();
      if (data.error) { setErrorMsg(data.error); return; }
      setAvatarUrl(data.url);
    } catch {
      setErrorMsg('Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus('idle');
    setErrorMsg('');
    try {
      const res  = await fetch('/api/member/profile', {
        method:  'PATCH',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ full_name: name, city, wine_interests: interests }),
      });
      const data = await res.json();
      if (data.error) { setErrorMsg(data.error); setStatus('error'); return; }
      setProfile(data.profile);
      setStatus('success');
    } catch {
      setErrorMsg('Failed to save profile.');
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }

  const displayName = name || user.name || user.email?.split('@')[0] || 'Member';

  const inputClass =
    'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-4 py-2.5 text-sm placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200 rounded-lg';

  if (loading) {
    return (
      <>
        <SectionHeader title="My Profile" subtitle="Update your personal information." />
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <SectionHeader title="My Profile" subtitle="Update your personal information." />
      <div className="max-w-xl">
        <form onSubmit={handleSave}>
          <Card className="mb-5">
            <CardLabel icon={User} label="Avatar" />

            {/* Avatar */}
            <div className="flex items-center gap-5 mb-2">
              <div className="relative">
                <UserAvatar name={displayName} size={80} src={avatarUrl} />
                {uploading && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-[9px] tracking-[0.3em] text-[#731515] border border-[#731515]/30 px-4 py-2 rounded-lg hover:bg-[#731515]/5 disabled:opacity-50 transition-colors duration-200 uppercase"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {uploading ? 'Uploading…' : 'Change Photo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <p className="mt-1.5 text-[10px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
                  JPG, PNG or WebP. Max 5 MB.
                </p>
              </div>
            </div>
          </Card>

          <Card className="mb-5">
            <CardLabel icon={User} label="Personal Info" />
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">FULL NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setStatus('idle'); }}
                  placeholder="Your full name"
                  className={inputClass}
                  style={{ fontFamily: 'var(--font-nunito)' }}
                />
              </div>
              <div>
                <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">CITY</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => { setCity(e.target.value); setStatus('idle'); }}
                  placeholder="Your city"
                  className={inputClass}
                  style={{ fontFamily: 'var(--font-nunito)' }}
                />
              </div>
              <div>
                <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-3">EMAIL</label>
                <div
                  className="text-[13px] text-[#7a4a4a]/60 px-4 py-2.5 bg-[#fdf6f6] border border-[#eddada] rounded-lg"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {user.email}
                </div>
              </div>
            </div>
          </Card>

          <Card className="mb-5">
            <CardLabel icon={GlassWater} label="Wine Interests" />
            <div className="flex flex-wrap gap-2">
              {WINE_INTERESTS.map(interest => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 py-1.5 text-[11px] tracking-wider rounded-full border transition-all ${
                    interests.includes(interest)
                      ? 'bg-[#731515] border-[#731515] text-white'
                      : 'bg-transparent border-[#eddada] text-[#7a4a4a] hover:border-[#731515]/40'
                  }`}
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {interest}
                </button>
              ))}
            </div>
          </Card>

          {errorMsg && (
            <p className="mb-4 text-[12px] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{errorMsg}</p>
          )}

          {status === 'success' && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 text-sm text-[#2d6e2d] bg-[#2d6e2d]/8 border border-[#2d6e2d]/20 px-4 py-3 rounded-lg"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Profile saved successfully.
            </motion.p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] hover:bg-[#9b2323] disabled:opacity-55 disabled:cursor-not-allowed transition-colors duration-200 rounded-lg"
          >
            {saving ? 'SAVING…' : 'SAVE PROFILE'}
          </button>
        </form>
      </div>
    </>
  );
}

// ── Home section ───────────────────────────────────────────────────────────────

function HomeSection({
  user,
  token,
  onNavigate,
}: {
  user:       { name?: string | null; email?: string | null };
  token:      string;
  onNavigate: (s: MemberSection) => void;
}) {
  const firstName = user.name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Member';
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/member/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.profile?.avatar_url) setAvatarUrl(d.profile.avatar_url); })
      .catch(() => {/* silent — avatar is optional */});
  }, [token]);

  return (
    <>
      <SectionHeader
        title={`Welcome, ${firstName}!`}
        subtitle="Your exclusive Vivo Wine Club space."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Membership card */}
        <Card>
          <CardLabel icon={CreditCard} label="My Membership" />
          <div className="bg-gradient-to-br from-[#6b1a1a] to-[#350707] rounded-lg p-5 text-white mb-5 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }}
            />
            <div className="text-[9px] tracking-[0.35em] text-white/50 mb-1">TIER</div>
            <div className="text-[22px] font-light leading-tight" style={{ fontFamily: 'var(--font-syne)' }}>
              Member
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-white/45">
              <Wine size={10} />
              <span className="text-[9px] tracking-[0.3em]">VIVO WINE CLUB</span>
            </div>
          </div>

          <ul className="space-y-2">
            {[
              'Priority access to all events',
              'Exclusive private winery visits',
              'Members-only experiences',
              'Access to Vivo merch',
            ].map(b => (
              <li
                key={b}
                className="flex items-start gap-2 text-[12.5px] text-[#6a3a3a]/70"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                <span className="mt-[6px] w-1 h-1 rounded-full bg-[#731515]/50 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </Card>

        {/* Profile summary */}
        <Card className="lg:col-span-2">
          <CardLabel icon={User} label="My Profile" />
          <div className="flex items-center gap-4 mb-6">
            <UserAvatar name={user.name || user.email?.split('@')[0] || 'Member'} size={56} src={avatarUrl} />
            <div className="min-w-0">
              <div
                className="text-[15px] font-light text-[#1a0505] truncate leading-tight"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {user.name ?? <span className="text-[#7a4a4a]/40 italic text-[13px]">No name set</span>}
              </div>
              <div
                className="text-[11px] text-[#7a4a4a]/60 truncate mt-0.5"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {user.email}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {[
              { label: 'FULL NAME',    value: user.name,  muted: !user.name },
              { label: 'EMAIL',        value: user.email, muted: false      },
            ].map(({ label, value, muted }) => (
              <div key={label} className="border-l-2 border-[#eddada] pl-4">
                <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">{label}</div>
                <div
                  className={`text-[13px] leading-snug ${muted ? 'text-[#7a4a4a]/40 italic' : 'text-[#1a0505]'}`}
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {value ?? '—'}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigate('profile')}
            className="text-[9px] tracking-[0.3em] text-[#731515] border border-[#731515]/30 px-4 py-2 rounded-lg hover:bg-[#731515]/5 transition-colors duration-200 uppercase"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Edit Profile
          </button>
        </Card>

        {/* Quick action cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              id:       'my-events' as MemberSection,
              icon:     Ticket,
              label:    'Members Only',
              title:    'My Events',
              subtitle: 'View and download tickets for your booked events.',
              cta:      'View Tickets',
            },
            {
              id:       'events' as MemberSection,
              icon:     CalendarDays,
              label:    'Wine Experiences',
              title:    'Upcoming Events',
              subtitle: 'Explore and book your next Vivo Wine Club experience.',
              cta:      'Browse Events',
            },
            {
              id:       'discounts' as MemberSection,
              icon:     Tag,
              label:    'Members Only',
              title:    'Deals & Perks',
              subtitle: 'Access exclusive offers and perks reserved for members.',
              cta:      'Explore',
            },
          ].map(card => (
            <div
              key={card.id}
              className="rounded-xl bg-[#0d0202] border border-white/5 p-6 flex flex-col gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.25)] cursor-pointer"
              onClick={() => onNavigate(card.id)}
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
                  <card.icon size={16} className="text-white/70" />
                </div>
                <div className="min-w-0">
                  <div className="text-[8px] tracking-[0.5em] text-white/30 mb-0.5 uppercase">{card.label}</div>
                  <div className="text-[14px] font-light text-white/90" style={{ fontFamily: 'var(--font-syne)' }}>
                    {card.title}
                  </div>
                  <p className="text-[11px] text-white/35 mt-0.5 leading-snug" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {card.subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onNavigate(card.id); }}
                className="w-full inline-flex items-center justify-center gap-2 text-[9px] tracking-[0.3em] text-white bg-[#731515] px-4 py-2.5 rounded-lg hover:bg-[#9b2323] transition-colors duration-200 uppercase"
              >
                {card.cta}
                <ArrowUpRight size={10} />
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* ── Quote ── */}
      <div className="mt-14 pt-10 border-t border-[#eddada] flex flex-col items-center text-center select-none">
        <div
          className="text-[88px] leading-none text-[#731515]/15 mb-[-18px]"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          &#8220;
        </div>
        <p
          className="text-[clamp(0.9rem,1.8vw,1.1rem)] italic text-[#7a4a4a]/55 leading-relaxed tracking-wide max-w-2xl px-4"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          Dio aveva fatto soltanto l&apos;acqua, ma l&apos;uomo ha fatto il vino
        </p>
      </div>
    </>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function SidebarContent({
  displayName,
  email,
  activeSection,
  navigate,
  onLogout,
}: {
  displayName:   string;
  email:         string;
  activeSection: MemberSection;
  navigate:      (s: MemberSection) => void;
  onLogout:      () => void;
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Logo */}
      <div className="px-5 pt-6 pb-5 shrink-0">
        <Link href="/" className="inline-flex items-center gap-2 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logobianco.png" alt="Vivo Wine Club" className="h-7 opacity-80 group-hover:opacity-100 transition-opacity duration-200" />
        </Link>
        <div className="mt-1.5 text-[8px] tracking-[0.55em] text-white/20 uppercase">Members Area</div>
      </div>

      <div className="mx-4 h-px bg-white/[0.07] shrink-0" />

      {/* User card */}
      <div className="px-4 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <UserAvatar name={displayName} size={34} />
          <div className="min-w-0">
            <div
              className="text-[13px] text-white/85 font-medium truncate leading-tight"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {displayName}
            </div>
            <div
              className="text-[10px] text-white/30 truncate mt-0.5"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {email}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-4 h-px bg-white/[0.07] mb-2 shrink-0" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <NavBtn
            key={item.id}
            item={item}
            active={activeSection === item.id}
            onClick={() => navigate(item.id)}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className="mx-4 h-px bg-white/[0.07] shrink-0" />
      <div className="px-3 py-3 shrink-0 space-y-0.5">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-white/30 hover:text-white/55 hover:bg-white/[0.06] transition-all duration-150 text-[12px]"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          <ArrowUpRight size={12} />
          vivowineclub.com
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-white/30 hover:text-[#e88a8a] hover:bg-white/[0.06] transition-all duration-150 text-[12px] text-left"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          <LogOut size={12} />
          Log out
        </button>
      </div>

    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function MemberPortal({ user, token, onLogout, initialSection = 'home' }: MemberPortalProps) {
  const [activeSection, setActiveSection] = useState<MemberSection>(initialSection);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);

  const displayName = user.name || user.email?.split('@')[0] || 'Member';

  function navigate(s: MemberSection) {
    setActiveSection(s);
    setSidebarOpen(false);
  }

  const sidebarProps = {
    displayName,
    email:         user.email ?? '',
    activeSection,
    navigate,
    onLogout,
  };

  return (
    <div className="flex overflow-hidden relative" style={{ height: '100dvh', background: '#0a0101' }}>

      {/* ── Background image (fixed — escapes overflow:hidden via position:fixed) ── */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:    'url(/vigna.jpg)',
          backgroundSize:     'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[#0a0101]/65" />
      </div>

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden lg:flex w-[220px] shrink-0 bg-[#0e0202] flex-col border-r border-white/[0.06] relative z-10" style={{ height: '100dvh' }}>
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-black/55 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: -220 }}
              animate={{ x: 0 }}
              exit={{ x: -220 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-0 top-0 h-full w-[220px] bg-[#0e0202] z-50 flex flex-col border-r border-white/[0.04] lg:hidden"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 text-white/35 hover:text-white/65 p-1 transition-colors"
              >
                <X size={17} />
              </button>
              <SidebarContent {...sidebarProps} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-2 py-1 bg-[#0e0202] border-b border-white/[0.06] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/50 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logobianco.png" alt="Vivo" className="h-6 opacity-70" />
          <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
            <UserAvatar name={displayName} size={30} />
          </div>
        </div>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto bg-transparent">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeSection === 'home' && (
                  <HomeSection user={user} token={token} onNavigate={navigate} />
                )}

                {activeSection === 'my-events' && (
                  <MyEventsSection token={token} userEmail={user.email ?? ''} />
                )}

                {activeSection === 'events' && (
                  <UpcomingEventsSection />
                )}

                {activeSection === 'discounts' && (
                  <>
                    <SectionHeader
                      title="Deals & Perks"
                      subtitle="Exclusive offers and perks for Vivo Wine Club members."
                    />
                    <DiscountsView token={token} />
                  </>
                )}

                {activeSection === 'profile' && (
                  <ProfileSection user={user} token={token} />
                )}

                {activeSection === 'settings' && <SettingsSection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
