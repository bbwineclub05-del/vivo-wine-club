'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, LogOut, KeyRound, ScanLine, X,
  Wine, Shield, ArrowUpRight, CreditCard, User, Lock,
  Camera, Loader2, Clock, Pencil,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import TaskBoard, { isAdmin } from '@/components/TaskBoard';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import MembershipHub from '@/components/MembershipHub';
import NewsManager from '@/components/NewsManager';
import CrmHub from '@/components/CrmHub';
import EventManager from '@/components/EventManager';
import MediaManager from '@/components/MediaManager';
import TeamManagement from '@/components/TeamManagement';
import MerchManager from '@/components/MerchManager';
import DiscountManager from '@/components/DiscountManager';
import DocumentManager from '@/components/DocumentManager';
import MemberPortal from '@/components/MemberPortal';
import MembershipCard from '@/components/MembershipCard';
import CollaboratorView from '@/components/CollaboratorView';
import FinanceManager from '@/components/FinanceManager';
import BilancioManager from '@/components/BilancioManager';
import QuoteGenerator from '@/components/QuoteGenerator';
import PedManager from '@/components/PedManager';
import WineAssistant from '@/components/WineAssistant';
import UpsellManager from '@/components/UpsellManager';
import WineriesMapManager from '@/components/WineriesMapManager';
import { isFinanceUser } from '@/lib/admins';
import { SECTION_PERMISSION } from '@/lib/access';
import { AdminShell } from '@/components/admin/AdminShell';
import { type AdminRole } from '@/lib/admin-nav';
import { useMobileOverlay } from '@/lib/useMobileOverlay';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type Section = 'overview' | 'settings' | 'wine-assistant' | 'tasks' | 'analytics' | 'pipeline' | 'events' | 'news' | 'crm' | 'media' | 'team' | 'merch' | 'discounts' | 'documents' | 'finance' | 'bilancio' | 'quotes' | 'ped' | 'upsell' | 'wineries';


/** Monogram avatar — shows photo if src is provided, falls back to initials */
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

/** Consistent section page header */
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1
        className="text-[clamp(1.6rem,2.5vw,2.2rem)] font-light text-[#1a0505] leading-none tracking-tight"
        style={{ fontFamily: 'var(--font-syne)' }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className="mt-2 text-sm text-[#7a4a4a]/70 font-light"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {subtitle}
        </p>
      )}
      <div className="mt-5 h-px w-16 bg-[#e8d5d5]" />
    </div>
  );
}

/** Elegant card wrapper */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white border border-[#eddada] rounded-xl p-6 shadow-[0_1px_4px_rgba(107,26,26,0.06),0_6px_20px_rgba(107,26,26,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

/** Card section label */
function CardLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon size={13} className="text-[#731515]" />
      <span className="text-[9px] tracking-[0.42em] text-[#731515] uppercase">{label}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section: Unauthorised
───────────────────────────────────────────── */
function UnauthorisedSection({ title }: { title: string }) {
  return (
    <>
      <SectionHeader title={title} />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-[#7a4a4a]/6 flex items-center justify-center mb-5">
          <Lock size={26} className="text-[#7a4a4a]/30" strokeWidth={1.5} />
        </div>
        <p className="text-[9px] tracking-[0.5em] text-[#7a4a4a]/40 uppercase mb-3">
          Accesso non autorizzato
        </p>
        <p className="text-sm text-[#7a4a4a]/50 font-light max-w-xs leading-relaxed"
          style={{ fontFamily: 'var(--font-nunito)' }}>
          Non hai i permessi per accedere a questa sezione.<br />
          Contatta l&apos;amministratore.
        </p>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Next event countdown
───────────────────────────────────────────── */
/** "18:00 - 24:00" / "19:00" / null → Date for that day at the start time (midnight if none given) */
function parseEventDateTime(date: string, time: string | null): Date {
  let hh = 0, mm = 0;
  const m = time?.split('-')[0]?.trim().match(/(\d{1,2}):(\d{2})/);
  if (m) { hh = parseInt(m[1], 10); mm = parseInt(m[2], 10); }
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(y, (mo ?? 1) - 1, d ?? 1, hh, mm, 0);
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[52px]">
      <span
        className="text-[clamp(1.6rem,4vw,2.4rem)] font-light text-white leading-none tabular-nums"
        style={{ fontFamily: 'var(--font-syne)' }}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1.5 text-[8px] tracking-[0.3em] text-white/40 uppercase">{label}</span>
    </div>
  );
}

function EventCountdown() {
  const [nextEvent, setNextEvent] = useState<{ title: string; date: string; time: string | null; location: string } | null>(null);
  const [loading, setLoading]     = useState(true);
  const [now, setNow]             = useState(() => new Date());

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => setNextEvent((d.events ?? [])[0] ?? null))
      .catch(() => {/* silent — countdown is non-critical */})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) return null;

  if (!nextEvent) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-[#6b1a1a] to-[#350707] p-6 text-center">
        <p className="text-[11px] text-white/50" style={{ fontFamily: 'var(--font-nunito)' }}>
          Nessun evento in programma al momento.
        </p>
      </div>
    );
  }

  const target = parseEventDateTime(nextEvent.date, nextEvent.time);
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const isNow   = diffMs === 0;

  const dateLabel = new Date(nextEvent.date + 'T12:00:00Z').toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });

  return (
    <div className="rounded-xl bg-gradient-to-br from-[#6b1a1a] to-[#350707] p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }}
      />
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <div className="flex items-center gap-1.5 text-white/45 mb-2">
            <Clock size={10} />
            <span className="text-[9px] tracking-[0.35em]">PROSSIMO EVENTO</span>
          </div>
          <div className="text-[19px] font-light text-white leading-tight" style={{ fontFamily: 'var(--font-syne)' }}>
            {nextEvent.title}
          </div>
          <p className="mt-1.5 text-[12px] text-white/50 capitalize" style={{ fontFamily: 'var(--font-nunito)' }}>
            {dateLabel}{nextEvent.time ? ` · ${nextEvent.time}` : ''} · {nextEvent.location}
          </p>
        </div>

        {isNow ? (
          <span className="text-[13px] tracking-[0.2em] text-white/80 shrink-0" style={{ fontFamily: 'var(--font-syne)' }}>
            IN CORSO
          </span>
        ) : (
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <CountdownUnit value={days}    label={days === 1 ? 'Giorno' : 'Giorni'} />
            <span className="text-white/20 text-xl font-light -mt-3">:</span>
            <CountdownUnit value={hours}   label="Ore" />
            <span className="text-white/20 text-xl font-light -mt-3">:</span>
            <CountdownUnit value={minutes} label="Min" />
            <span className="text-white/20 text-xl font-light -mt-3">:</span>
            <CountdownUnit value={seconds} label="Sec" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section: Overview
───────────────────────────────────────────── */
function OverviewSection({
  user,
  isAdmin,
  isStaff,
  token,
}: {
  user:    { name?: string | null; email?: string | null };
  isAdmin: boolean;
  isStaff: boolean;
  token:   string;
}) {
  const [avatarUrl,   setAvatarUrl]  = useState<string | null>(null);
  const [uploading,   setUploading]  = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<{ phone: string | null; date_of_birth: string | null } | null>(null);

  const [cardData, setCardData] = useState<{ memberId: string; name: string; tier: string; memberSince: number } | null>(null);
  const [cardLoading, setCardLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardDownloading, setCardDownloading] = useState(false);
  const [cardLinkCopied,  setCardLinkCopied]  = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', dob: '' });
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg]     = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/member/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.profile?.avatar_url) setAvatarUrl(d.profile.avatar_url);
        setProfile({ phone: d.profile?.phone ?? null, date_of_birth: d.profile?.date_of_birth ?? null });
      })
      .catch(() => {/* silent — avatar/profile are optional */});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setCardLoading(true);
    fetch('/api/member/card', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.memberId) setCardData(d); })
      .catch(() => {/* silent */})
      .finally(() => setCardLoading(false));
  }, [token]);

  // Keep the edit form in sync with fresh data — but only while not actively editing,
  // so live updates don't clobber unsaved input.
  useEffect(() => {
    if (editing) return;
    setForm({
      name:  user.name  ?? '',
      email: user.email ?? '',
      phone: profile?.phone ?? '',
      dob:   profile?.date_of_birth ?? '',
    });
  }, [editing, user.name, user.email, profile]);

  async function handleSaveProfile() {
    setSaving(true);
    setSaveError(null);
    setSaveMsg(null);
    try {
      const nameChanged  = form.name.trim()  !== (user.name ?? '');
      const emailChanged = form.email.trim() !== (user.email ?? '');

      if (nameChanged) {
        const { error } = await supabase.auth.updateUser({ data: { full_name: form.name.trim() } });
        if (error) throw error;
      }
      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({ email: form.email.trim() });
        if (error) throw error;
      }

      const res  = await fetch('/api/member/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          full_name:     form.name.trim(),
          phone:         form.phone.trim() || null,
          date_of_birth: form.dob || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Salvataggio fallito.');

      setProfile({ phone: data.profile?.phone ?? null, date_of_birth: data.profile?.date_of_birth ?? null });
      setEditing(false);
      if (emailChanged) setSaveMsg('Controlla la nuova email per confermare il cambio indirizzo.');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditing(false);
    setSaveError(null);
  }

  async function handleDownloadCard() {
    if (!cardRef.current || !cardData) return;
    setCardDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      await document.fonts.ready;
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `vivo-card-${cardData.memberId}.png`;
      a.click();
    } catch (err) {
      console.error('[OverviewSection] card download error:', err);
    } finally {
      setCardDownloading(false);
    }
  }

  function handleCopyCardLink() {
    if (!cardData) return;
    const url = `https://vivowineclub.com/card/${cardData.memberId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCardLinkCopied(true);
      setTimeout(() => setCardLinkCopied(false), 2000);
    }).catch(() => {});
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setAvatarError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/member/profile/avatar', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setAvatarError(data.error ?? 'Upload failed');
        return;
      }
      if (data.url) setAvatarUrl(data.url);
    } catch {
      setAvatarError('Upload failed — please try again');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const displayName = user.name || user.email?.split('@')[0] || 'U';

  return (
    <>
      <SectionHeader title="Overview" subtitle="Il tuo profilo e la tua membership." />

      <div className="mb-5">
        <EventCountdown />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Membership */}
        <Card>
          <CardLabel icon={CreditCard} label="My Membership" />
          {cardLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 rounded-full border-2 border-[#731515]/20 border-t-[#731515]/60 animate-spin" />
            </div>
          ) : cardData ? (
            <div className="flex flex-col items-center gap-4">
              <div className="max-w-[300px] w-full mx-auto">
                <MembershipCard {...cardData} cardRef={cardRef} />
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-center w-full">
                <button
                  onClick={handleDownloadCard}
                  disabled={cardDownloading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#731515] text-white text-[9px] tracking-[0.2em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors duration-200"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {cardDownloading ? 'DOWNLOAD...' : 'DOWNLOAD PNG'}
                </button>

                <button
                  onClick={handleCopyCardLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#731515]/30 text-[#731515] text-[9px] tracking-[0.2em] rounded-lg hover:bg-[#fdf0f0] hover:border-[#731515]/50 transition-all duration-200"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {cardLinkCopied ? 'LINK COPIATO' : 'CONDIVIDI LINK'}
                </button>
              </div>

              <div
                className="w-full bg-[#fdf6f6] border border-[#e8d5d5] rounded-lg px-3 py-2 text-[10.5px] text-[#1a0505] truncate text-center"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                vivowineclub.com/card/{cardData.memberId}
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-[#7a4a4a]/50 italic py-8 text-center" style={{ fontFamily: 'var(--font-nunito)' }}>
              Impossibile caricare la tessera.
            </p>
          )}
        </Card>

        {/* Profile */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <CardLabel icon={User} label="My Profile" />
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                title="Modifica profilo"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#7a4a4a]/50 hover:text-[#731515] hover:bg-[#fdf6f6] transition-colors duration-200 -mt-5"
              >
                <Pencil size={13} />
              </button>
            )}
          </div>

          {/* Avatar + info row */}
          <div className="flex items-start gap-5 mb-4">

            {/* Avatar with camera overlay */}
            <div className="relative shrink-0">
              <UserAvatar name={displayName} size={88} src={avatarUrl} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Cambia foto profilo"
                className="absolute -bottom-1 -right-1 w-[22px] h-[22px] bg-[#731515] rounded-full flex items-center justify-center hover:bg-[#9b2323] disabled:opacity-50 transition-colors duration-200 shadow-sm"
              >
                {uploading
                  ? <Loader2 size={11} className="animate-spin text-white" />
                  : <Camera size={11} className="text-white" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Info fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1 min-w-0">
              {avatarError && (
                <p className="col-span-full text-[10px] text-red-400 mb-1">{avatarError}</p>
              )}
              {editing ? (
                <>
                  {[
                    { key: 'name'  as const, label: 'NOME COMPLETO',  type: 'text'  },
                    { key: 'email' as const, label: 'EMAIL',          type: 'email' },
                    { key: 'phone' as const, label: 'TELEFONO',       type: 'tel'   },
                    { key: 'dob'   as const, label: 'DATA DI NASCITA', type: 'date' },
                  ].map(({ key, label, type }) => (
                    <div key={key}>
                      <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">{label}</div>
                      <input
                        type={type}
                        value={form[key]}
                        onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={key === 'phone' ? '+39 ...' : undefined}
                        className="w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-3 py-2 text-[13px] placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors rounded-lg"
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { label: 'NOME COMPLETO',   value: user.name,                                  muted: !user.name },
                    { label: 'EMAIL',           value: user.email,                                  muted: false },
                    { label: 'TELEFONO',        value: profile?.phone,                              muted: !profile?.phone },
                    { label: 'DATA DI NASCITA', value: profile?.date_of_birth ? new Date(profile.date_of_birth + 'T12:00:00Z').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null, muted: !profile?.date_of_birth },
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
                </>
              )}
            </div>
          </div>

          {saveError && (
            <p className="text-[11px] text-[#731515] mb-3" style={{ fontFamily: 'var(--font-nunito)' }}>{saveError}</p>
          )}
          {saveMsg && !editing && (
            <p className="text-[11px] text-emerald-600 mb-3" style={{ fontFamily: 'var(--font-nunito)' }}>{saveMsg}</p>
          )}

          {editing ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#731515] text-white text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors duration-200"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {saving ? 'SALVATAGGIO…' : 'SALVA'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-5 py-2 border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.3em] rounded-lg hover:border-[#731515]/40 transition-colors duration-200"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                ANNULLA
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-[#7a4a4a]/35 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
              * Cambiare l&apos;email richiede una conferma dal nuovo indirizzo.
            </p>
          )}
        </Card>

        {/* Event Scanner — visible to all authenticated users */}
        <div className="lg:col-span-3 flex justify-center sm:justify-start">
          <Link
            href="/checkin"
            className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.3em] text-white bg-[#731515] px-7 py-3.5 rounded-xl hover:bg-[#9b2323] transition-colors duration-200 uppercase shadow-[0_4px_20px_rgba(115,21,21,0.25)]"
          >
            <ScanLine size={15} />
            Apri Scanner Eventi
            <ArrowUpRight size={12} />
          </Link>
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

/* ─────────────────────────────────────────────
   Section: Settings (change password)
───────────────────────────────────────────── */
function SettingsSection() {
  const [pwd, setPwd]         = useState('');
  const [conf, setConf]       = useState('');
  const [status, setStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError]     = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pwd !== conf)      { setError('Le password non corrispondono.'); return; }
    if (pwd.length < 6)    { setError('Minimo 6 caratteri.'); return; }
    setStatus('loading');
    const { error: err } = await supabase.auth.updateUser({ password: pwd });
    if (err) { setError(err.message); setStatus('error'); }
    else     { setStatus('success'); setPwd(''); setConf(''); }
  }

  const inputClass =
    'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-4 py-2.5 text-sm placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200 rounded-lg';

  return (
    <>
      <SectionHeader title="Impostazioni" subtitle="Gestisci la sicurezza del tuo account." />
      <div className="max-w-md">
        <Card>
          <CardLabel icon={KeyRound} label="Cambia Password" />
          {status === 'success' ? (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-[#2d6e2d] bg-[#2d6e2d]/8 border border-[#2d6e2d]/20 px-4 py-3 rounded-lg"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Password aggiornata con successo.
            </motion.p>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">NUOVA PASSWORD</label>
                <input type="password" required placeholder="••••••••" value={pwd}
                  onChange={e => { setPwd(e.target.value); setStatus('idle'); }}
                  className={inputClass} style={{ fontFamily: 'var(--font-nunito)' }} />
              </div>
              <div>
                <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">CONFERMA PASSWORD</label>
                <input type="password" required placeholder="••••••••" value={conf}
                  onChange={e => { setConf(e.target.value); setStatus('idle'); }}
                  className={inputClass} style={{ fontFamily: 'var(--font-nunito)' }} />
              </div>
              {error && (
                <p className="text-[12px] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] hover:bg-[#9b2323] disabled:opacity-55 disabled:cursor-not-allowed transition-colors duration-200 rounded-lg mt-1"
              >
                {status === 'loading' ? 'AGGIORNAMENTO…' : 'AGGIORNA PASSWORD'}
              </button>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}

/** Total pending applications across all types (sidebar badge). null on failure. */
/** Quante candidature sono arrivate e nessuno ha ancora guardato. */
async function fetchPendingApplications(token: string): Promise<number | null> {
  try {
    const res = await fetch('/api/collaboration-applications', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.applications)) return null;
    return data.applications.filter((a: { stage?: string }) => a.stage === 'new').length;
  } catch {
    return null; // è solo il numerino: se non arriva, pazienza
  }
}

/* ─────────────────────────────────────────────
   Page root
───────────────────────────────────────────── */
function MembersPageInner() {
  const { user, logout } = useAuth();
  const router           = useRouter();
  const searchParams     = useSearchParams();

  // If the invite link contains ?section=settings, open that tab immediately
  // `applications` era una sezione a sé prima che soci e candidature
  // finissero insieme: i link già in giro devono continuare ad aprire
  // qualcosa invece di una pagina vuota.
  const requestedSection = searchParams.get('section');
  const initialSection: Section =
    requestedSection === 'applications'
      ? 'pipeline'
      : ((requestedSection as Section | null) ?? 'overview');
  const [activeSection,     setActiveSection]     = useState<Section>(initialSection);
  const [sidebarOpen,       setSidebarOpen]        = useState(false);
  useMobileOverlay(sidebarOpen, () => setSidebarOpen(false));
  const [isStaff,           setIsStaff]            = useState(false);
  const [isMember,          setIsMember]           = useState(false);
  const [isCollaborator,    setIsCollaborator]     = useState(false);
  const [token,             setToken]              = useState('');
  const [staffPermissions,  setStaffPermissions]   = useState<Record<string, boolean> | null>(null);
  const [pendingApplications, setPendingApplications] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setToken(session.access_token);
      const role = session.user.app_metadata?.role ?? session.user.user_metadata?.role;
      // Include both 'staff' and 'admin' role — team members invited as admin via Team
      // Management have app_metadata.role = 'admin' but are NOT in the ADMIN_EMAILS
      // founders list, so isAdmin() = false. Without this, they see nothing.
      setIsStaff(role === 'staff' || role === 'admin');
      setIsMember(role === 'member' && !isAdmin(session.user.email ?? ''));
      setIsCollaborator(role === 'collaborator');

      // Fetch granular permissions for all authenticated users (admins get full set)
      try {
        const res  = await fetch('/api/team/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStaffPermissions(data.permissions ?? {});
        }
      } catch {/* non-fatal */}
    });
  }, []);

  /**
   * Tiene il token aggiornato per tutta la durata della sessione.
   *
   * `getSession()` lo legge una volta sola, al montaggio. I token di
   * accesso scadono dopo un'ora: il client Supabase ne ottiene uno
   * nuovo da solo, ma questa pagina continuava a passare ai componenti
   * quello vecchio. Dopo un'ora con l'area aperta, ogni chiamata fatta
   * con quel token tornava 401 — ed era il motivo per cui Documenti
   * diceva "non autorizzato" pur essendo loggati.
   *
   * Le sezioni che chiedono la sessione da sé non se ne accorgevano;
   * le sei che ricevono il token da qui sì.
   */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? '');
    });
    return () => subscription.unsubscribe();
  }, []);

  // Re-fetch permissions when the window regains focus so that changes made
  // by a superAdmin in Team Management are picked up without a full page reload.
  useEffect(() => {
    if (!token || !isStaff) return;

    async function refreshPermissions() {
      try {
        const res = await fetch('/api/team/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStaffPermissions(data.permissions ?? {});
        }
      } catch { /* non-fatal */ }
    }

    const onFocus      = () => refreshPermissions();
    const onVisibility = () => { if (!document.hidden) refreshPermissions(); };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [token, isStaff]);

  // Pending applications badge (sidebar → Application). Refreshed on focus and
  // after a status change in MembershipHub.
  const canManage = isStaff || isAdmin(user?.email ?? '');
  const refreshPendingApplications = useCallback(() => {
    if (!token || !canManage) return;
    fetchPendingApplications(token).then((n) => { if (n !== null) setPendingApplications(n); });
  }, [token, canManage]);

  useEffect(() => {
    if (!token || !canManage) return;
    fetchPendingApplications(token).then((n) => { if (n !== null) setPendingApplications(n); });
    const onFocus      = () => refreshPendingApplications();
    const onVisibility = () => { if (!document.hidden) refreshPendingApplications(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [token, canManage, refreshPendingApplications]);

  useEffect(() => {
    if (user === null) {
      const t = setTimeout(() => router.replace('/login'), 500);
      return () => clearTimeout(t);
    }
  }, [user, router]);

  if (!user) return null;

  const admin       = isAdmin(user.email ?? '');
  const financeUser = isFinanceUser(user.email ?? '');
  const displayName = user.name || user.email?.split('@')[0] || 'Member';

  // Members (role === 'member', not admin/staff) get the MemberPortal
  if (isMember && !admin && !isStaff) {
    return (
      <MemberPortal
        user={{ name: user.name, email: user.email }}
        token={token}
        onLogout={handleLogout}
      />
    );
  }

  // Collaborators get a minimal check-in view
  if (isCollaborator && !admin && !isStaff) {
    return (
      <CollaboratorView
        token={token}
        onLogout={handleLogout}
        name={displayName}
      />
    );
  }

  /** Returns true if the current user can access this section. */
  function canAccess(section: Section): boolean {
    // /api/team/me already applied the rules in lib/access.ts, including
    // the board check and the deactivation that the hardcoded list used
    // to override. Here we only read its answer.
    if (section === 'overview' || section === 'settings' || section === 'wine-assistant') return true;
    if (section === 'team') return admin;
    if (staffPermissions === null) return true; // still loading: avoid a flash of "unauthorised"

    const permKey = SECTION_PERMISSION[section];
    if (!permKey) return false; // an unmapped section is a bug, not an invitation
    return staffPermissions[permKey] !== false;
  }

  function navigate(s: Section) {
    setActiveSection(s);
    setSidebarOpen(false);
  }

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  const destination = destinationOf(activeSection);

  return (
    <AdminShell
      role={(admin ? 'board' : 'staff') as AdminRole}
      active={destination}
      onNavigate={(id) => navigate((DESTINATION_FIRST_SECTION[id] ?? id) as Section)}
      userName={displayName}
      pendingApplications={pendingApplications}
    >
      <div id="members-scroll-root" className="mx-auto max-w-[1180px] px-5 py-7 lg:px-10 lg:py-10">
        <SectionTabs destination={destination} active={activeSection} onPick={navigate} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >

                {activeSection === 'overview' && (
                  <OverviewSection user={{ name: user.name, email: user.email }} isAdmin={admin} isStaff={isStaff} token={token} />
                )}

                {activeSection === 'settings' && <SettingsSection />}

                {activeSection === 'wine-assistant' && <WineAssistant />}

                {(admin || isStaff) && activeSection === 'tasks' && (
                  // TaskBoard porta la propria intestazione: un SectionHeader
                  // qui sopra stamperebbe il titolo due volte.
                  canAccess('tasks') ? (
                    <TaskBoard currentEmail={user.email ?? ''} />
                  ) : <UnauthorisedSection title="Task" />
                )}

                {(admin || isStaff) && activeSection === 'analytics' && (
                  canAccess('analytics') ? (
                    <>
                      <SectionHeader title="Analytics" subtitle="KPI e metriche del club in tempo reale." />
                      <AnalyticsDashboard />
                    </>
                  ) : <UnauthorisedSection title="Analytics" />
                )}

                {/* Soci e candidature insieme: MembershipHub ha le sue schede. */}
                {(admin || isStaff) && activeSection === 'pipeline' && (
                  canAccess('pipeline')
                    ? <MembershipHub onChanged={refreshPendingApplications} />
                    : <UnauthorisedSection title="Membership" />
                )}


                {(admin || isStaff) && activeSection === 'events' && (
                  canAccess('events') ? <EventManager /> : <UnauthorisedSection title="Gestione Eventi" />
                )}

                {(admin || isStaff) && activeSection === 'news' && (
                  canAccess('news') ? (
                    <>
                      <SectionHeader title="Gestione News" subtitle="Crea e modifica le card della homepage." />
                      <NewsManager />
                    </>
                  ) : <UnauthorisedSection title="Gestione News" />
                )}

                {(admin || isStaff) && activeSection === 'crm' && (
                  canAccess('crm') ? <CrmHub /> : <UnauthorisedSection title="CRM" />
                )}

                {/* FinanceManager porta la propria intestazione. */}
                {financeUser && activeSection === 'finance' && (
                  <FinanceManager isAdmin={admin} />
                )}

                {/* BilancioManager porta la propria intestazione. */}
                {financeUser && activeSection === 'bilancio' && <BilancioManager />}

                {(admin || isStaff) && activeSection === 'media' && (
                  canAccess('media') ? (
                    <>
                      <SectionHeader title="Gestione Media" subtitle="Carica immagini per le gallerie del sito — Wine Party, Wine Lounge, Winery Visit e singole cantine." />
                      <MediaManager />
                    </>
                  ) : <UnauthorisedSection title="Gestione Media" />
                )}

                {(admin || isStaff) && activeSection === 'merch' && (
                  canAccess('merch') ? <MerchManager /> : <UnauthorisedSection title="Gestione Merch" />
                )}

                {/* DiscountManager porta la propria intestazione. */}
                {(admin || isStaff) && activeSection === 'discounts' && (
                  canAccess('discounts')
                    ? <DiscountManager token={token} />
                    : <UnauthorisedSection title="Convenzioni" />
                )}

                {(admin || isStaff) && activeSection === 'documents' && (
                  canAccess('documents') ? (
                    <DocumentManager token={token} isAdmin={admin} />
                  ) : <UnauthorisedSection title="Gestione Documenti" />
                )}

                {admin && activeSection === 'team' && <TeamManagement />}

                {(admin || isStaff) && activeSection === 'quotes' && (
                  <>
                    <QuoteGenerator />
                  </>
                )}

                {/* Come per Task: PedManager ha già la sua intestazione. */}
                {(admin || isStaff) && activeSection === 'ped' && <PedManager />}

                {(admin || isStaff) && activeSection === 'upsell' && (
                  canAccess('upsell') ? <UpsellManager /> : <UnauthorisedSection title="Upsell" />
                )}

                {(admin || isStaff) && activeSection === 'wineries' && (
                  canAccess('wineries') ? (
                    <>
                      <SectionHeader title="Mappa Cantine" subtitle="Posizione, foto e vini degustati per ogni cantina visitata o in catalogo." />
                      <WineriesMapManager />
                    </>
                  ) : <UnauthorisedSection title="Mappa Cantine" />
                )}

          </motion.div>
        </AnimatePresence>
      </div>
    </AdminShell>
  );
}


/* ─────────────────────────────────────────────
   Destinations and the sections inside them

   The navigation speaks in destinations; the render below still speaks
   in the original section ids. Three destinations hold more than one
   section, so these two maps translate between them and nothing in the
   rendering had to change.
───────────────────────────────────────────── */
const SECTION_TO_DESTINATION: Record<string, string> = {
  news: 'site', media: 'site', wineries: 'site',
  discounts: 'offers', upsell: 'offers',
  finance: 'finance', bilancio: 'finance', quotes: 'finance',
  pipeline: 'membership',
};

const DESTINATION_FIRST_SECTION: Record<string, Section> = {
  site: 'news', offers: 'discounts', finance: 'finance', membership: 'pipeline',
};

/** The tab labels inside a grouped destination, in render order. */
const DESTINATION_SECTIONS: Record<string, { id: Section; label: string }[]> = {
  site: [
    { id: 'news', label: 'News' },
    { id: 'media', label: 'Media' },
    { id: 'wineries', label: 'Mappa cantine' },
  ],
  offers: [
    { id: 'discounts', label: 'Sconti' },
    { id: 'upsell', label: 'Upsell' },
  ],
  finance: [
    { id: 'finance', label: 'Transazioni' },
    { id: 'bilancio', label: 'Bilancio' },
    { id: 'quotes', label: 'Preventivi' },
  ],
};

function destinationOf(section: Section): string {
  return SECTION_TO_DESTINATION[section] ?? section;
}

/** One row of tabs, shown only where a destination holds several sections. */
function SectionTabs({
  destination, active, onPick,
}: {
  destination: string;
  active: Section;
  onPick: (s: Section) => void;
}) {
  const tabs = DESTINATION_SECTIONS[destination];
  if (!tabs) return null;
  return (
    <div className="mb-7 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onPick(t.id)}
          aria-current={active === t.id ? 'page' : undefined}
          className={`min-h-[44px] rounded-full border px-5 text-[13px] font-medium transition-colors ${
            active === t.id
              ? 'border-[#731515] bg-[#731515] text-white'
              : 'border-[#E4D6D3] text-[#1A0505] hover:border-[#731515]/40'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense>
      <MembersPageInner />
    </Suspense>
  );
}
