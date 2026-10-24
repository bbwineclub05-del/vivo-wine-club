'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, ScanLine, Shield, ArrowUpRight, Lock,
  Camera, Loader2, Pencil,
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
import { closeTopOverlay } from '@/lib/overlay-stack';
import { ActionButton } from '@/components/admin/ui';
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
   Section: Overview
───────────────────────────────────────────── */

/** "18:00 - 24:00" / "19:00" / null → quel giorno all'ora di inizio (mezzanotte se non c'è) */
function parseEventDateTime(date: string, time: string | null): Date {
  let hh = 0, mm = 0;
  const m = time?.split('-')[0]?.trim().match(/(\d{1,2}):(\d{2})/);
  if (m) { hh = parseInt(m[1], 10); mm = parseInt(m[2], 10); }
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(y, (mo ?? 1) - 1, d ?? 1, hh, mm, 0);
}

/**
 * Quanto manca, in una riga.
 *
 * Prima erano quattro riquadri con giorni, ore, minuti e secondi, e
 * un timer che rifaceva il disegno ogni secondo. A tre settimane da un
 * evento i secondi non dicono niente a nessuno: resta la frase che uno
 * leggerebbe comunque ad alta voce.
 */
function timeUntil(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return 'In corso';
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `fra ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `fra ${hours} ${hours === 1 ? 'ora' : 'ore'}`;
  return `fra ${Math.floor(hours / 24)} giorni`;
}

/** Il prossimo evento in calendario. Senza eventi, non occupa spazio. */
function NextEvent() {
  const [event, setEvent] = useState<{ title: string; date: string; time: string | null; location: string } | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => setEvent((d.events ?? [])[0] ?? null))
      .catch(() => {/* senza, la pagina funziona comunque */});
  }, []);

  // Al minuto, non al secondo: è la precisione che serve.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!event) return null;

  const dateLabel = new Date(`${event.date}T12:00:00Z`).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/[0.06] p-5">
      <p className="text-fine text-on-paper-muted">Prossimo evento</p>
      <p className="ds-display mt-2 text-[22px] leading-none tracking-[-0.02em]">{event.title}</p>
      {/* "sabato 7 novembre": in italiano maiuscola solo la prima lettera. */}
      <p className="mt-2 text-fine text-on-paper-muted first-letter:uppercase">
        {dateLabel}{event.time ? ` · ${event.time}` : ''} · {event.location}
      </p>
      <p className="ds-display mt-4 text-[26px] leading-none tracking-[-0.02em] text-accent">
        {timeUntil(parseEventDateTime(event.date, event.time), now)}
      </p>
    </div>
  );
}

/**
 * Overview: chi sei, cosa hai in mano, cosa succede adesso.
 *
 * Era una scheda profilo con nome, email, telefono e data di nascita,
 * quattro campi che uno conosce già a memoria — e in fondo una
 * citazione sul vino. Di proprio non serviva niente: restano la
 * tessera, il prossimo evento e lo scanner, cioè le tre cose che da
 * qui si usano davvero. Al posto dei contatti c'è la qualifica, che è
 * l'unica informazione su di sé che valga la pena leggere.
 */
function OverviewSection({
  user,
  isAdmin,
  isStaff,
  token,
  canScan,
}: {
  user:    { name?: string | null; email?: string | null };
  isAdmin: boolean;
  isStaff: boolean;
  token:   string;
  /** Lo scanner si vede solo se Team Management lo lascia acceso. */
  canScan: boolean;
}) {
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cardData, setCardData] = useState<{ memberId: string; name: string; tier: string; memberSince: number } | null>(null);
  const [cardLoading, setCardLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardDownloading, setCardDownloading] = useState(false);
  const [cardLinkCopied,  setCardLinkCopied]  = useState(false);

  // Il nome si può correggere da qui: è l'unica cosa che compare anche
  // sulla tessera, quindi un refuso si vede.
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [savedName, setSavedName] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/member/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.profile?.avatar_url) setAvatarUrl(d.profile.avatar_url); })
      .catch(() => {/* la foto è un di più */});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setCardLoading(true);
    fetch('/api/member/card', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.memberId) setCardData(d); })
      .catch(() => {/* gestito dallo stato vuoto */})
      .finally(() => setCardLoading(false));
  }, [token]);

  const name = savedName ?? user.name ?? user.email?.split('@')[0] ?? 'Socio';
  const role = isAdmin ? 'Board' : isStaff ? 'Staff' : 'Membro';

  async function saveName() {
    const next = draftName.trim();
    if (!next || next === name) { setEditing(false); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: next } });
      if (error) throw error;
      const res  = await fetch('/api/member/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ full_name: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Salvataggio fallito.');
      setSavedName(next);
      setEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
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
    navigator.clipboard
      .writeText(`https://vivowineclub.com/card/${cardData.memberId}`)
      .then(() => {
        setCardLinkCopied(true);
        setTimeout(() => setCardLinkCopied(false), 2000);
      })
      .catch(() => {});
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
      if (!res.ok) { setAvatarError(data.error ?? 'Caricamento fallito.'); return; }
      if (data.url) setAvatarUrl(data.url);
    } catch {
      setAvatarError('Caricamento fallito — riprova.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <>
      {/* ── Chi sei: foto, nome, qualifica. Niente contatti. ── */}
      <header className="mb-7 flex items-center gap-4">
        <div className="relative shrink-0">
          <UserAvatar name={name} size={64} src={avatarUrl} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Cambia foto"
            className="absolute -bottom-0.5 -right-0.5 grid h-[26px] w-[26px] place-items-center rounded-full bg-accent text-paper transition-colors hover:bg-accent-lift disabled:opacity-50"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                autoFocus
                className="min-h-[44px] w-full rounded-xl border border-rule-paper bg-paper px-3 text-body focus:border-accent/50 focus:outline-none [font-size:16px] sm:w-auto sm:min-w-0 sm:flex-1"
              />
              <ActionButton onClick={saveName} disabled={saving}>
                {saving ? 'Salvo…' : 'Salva'}
              </ActionButton>
              <ActionButton variant="quiet" onClick={() => { setEditing(false); setSaveError(null); }}>
                Annulla
              </ActionButton>
            </div>
          ) : (
            <>
              <h1 className="ds-display truncate text-[26px] leading-none tracking-[-0.03em] lg:text-[32px]">
                {name}
              </h1>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent/8 px-3 py-1 text-fine text-accent">
                  <Shield size={13} strokeWidth={2} />
                  {role}
                </span>
                <button
                  type="button"
                  onClick={() => { setDraftName(name); setEditing(true); }}
                  title="Modifica nome"
                  className="grid h-9 w-9 place-items-center rounded-full text-on-paper-muted transition-colors hover:bg-paper-soft hover:text-on-paper"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </>
          )}
          {saveError   && <p className="mt-2 text-fine text-accent">{saveError}</p>}
          {avatarError && <p className="mt-2 text-fine text-accent">{avatarError}</p>}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── La tessera ── */}
        <div className="rounded-2xl border border-rule-paper p-5">
          <p className="mb-4 text-fine text-on-paper-muted">La tua tessera</p>
          {cardLoading ? (
            <div className="flex h-44 items-center justify-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : cardData ? (
            <>
              <div className="mx-auto w-full max-w-[320px]">
                <MembershipCard {...cardData} cardRef={cardRef} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton onClick={handleDownloadCard} disabled={cardDownloading}>
                  {cardDownloading ? 'Scarico…' : 'Scarica PNG'}
                </ActionButton>
                <ActionButton variant="quiet" onClick={handleCopyCardLink}>
                  {cardLinkCopied ? 'Link copiato' : 'Copia link'}
                </ActionButton>
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-fine text-on-paper-muted">
              Non riesco a caricare la tessera.
            </p>
          )}
        </div>

        {/* ── Cosa succede adesso, e l'unica cosa da aprire in evento ── */}
        <div className="flex flex-col gap-4">
          <NextEvent />
          {canScan && (
            <Link
              href="/checkin"
              className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-rule-paper px-5 transition-colors hover:border-accent/40"
            >
              <ScanLine size={19} strokeWidth={1.8} className="shrink-0 text-accent" />
              <span className="flex-1 text-body font-medium">Scanner eventi</span>
              <ArrowUpRight size={15} className="shrink-0 text-on-paper-muted" />
            </Link>
          )}
        </div>
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

  /**
   * Il tasto indietro del browser e il gesto del telefono.
   *
   * Gli overlay (schede, fogli) spingono una loro tappa e la chiudono
   * da soli: quando il back ne chiude uno, qui arriva un popstate con
   * la sezione già corrente, e non si fa niente.
   */
  const sectionRef = useRef(activeSection);
  useEffect(() => { sectionRef.current = activeSection; }, [activeSection]);

  useEffect(() => {
    // La tappa di partenza, così la cronologia sa da dove si viene.
    if (!window.history.state?.vivoSection) {
      window.history.replaceState({ ...window.history.state, vivoSection: sectionRef.current }, '');
    }

    const onPop = () => {
      // Con un pannello aperto, indietro chiude quello: la tappa
      // appena consumata viene rimessa, così il back successivo torna
      // davvero alla sezione precedente.
      if (closeTopOverlay()) {
        window.history.pushState(
          { vivoSection: sectionRef.current },
          '',
          `?section=${sectionRef.current}`,
        );
        return;
      }

      const s = window.history.state?.vivoSection as Section | undefined;
      if (!s || s === sectionRef.current) return;
      setActiveSection(s);
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

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

  /**
   * Quali destinazioni compaiono nel menù.
   *
   * È la stessa risposta di `canAccess`, data per destinazione invece
   * che per sezione: quello che è spento non si vede, invece di vedersi
   * e sbattere la porta dopo il clic.
   */
  function canOpen(id: string): boolean {
    if (id === 'team') return admin;
    if (staffPermissions === null) return true; // ancora in caricamento
    const key = SECTION_PERMISSION[id];
    if (!key) return true; // destinazione sempre aperta (riepilogo, impostazioni)
    return staffPermissions[key] !== false;
  }

  /**
   * Spostarsi dentro l'area, lasciando una traccia.
   *
   * Prima cambiare sezione cambiava solo uno stato: l'indirizzo
   * restava quello di partenza e il gesto "indietro" del telefono,
   * non trovando niente da annullare, buttava fuori dall'area. Ora
   * ogni passaggio è una tappa nella cronologia del browser, quindi
   * il gesto, il tasto indietro e la freccia qui sopra fanno tutti e
   * tre la stessa cosa.
   */
  function navigate(s: Section) {
    setSidebarOpen(false);
    if (s === activeSection) return;
    setActiveSection(s);
    window.history.pushState({ vivoSection: s }, '', `?section=${s}`);
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
      can={canOpen}
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
                  <OverviewSection
                    user={{ name: user.name, email: user.email }}
                    isAdmin={admin}
                    isStaff={isStaff}
                    token={token}
                    canScan={canOpen('scanner')}
                  />
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
                  // AnalyticsDashboard porta la propria intestazione.
                  canAccess('analytics')
                    ? <AnalyticsDashboard />
                    : <UnauthorisedSection title="Analytics" />
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
                  // NewsManager porta la propria intestazione.
                  canAccess('news')
                    ? <NewsManager />
                    : <UnauthorisedSection title="News" />
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
                  // MediaManager porta la propria intestazione.
                  canAccess('media')
                    ? <MediaManager />
                    : <UnauthorisedSection title="Media" />
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
                  // WineriesMapManager porta la propria intestazione.
                  canAccess('wineries')
                    ? <WineriesMapManager />
                    : <UnauthorisedSection title="Cantine" />
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
