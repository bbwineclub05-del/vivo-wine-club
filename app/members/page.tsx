'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, CheckSquare, BarChart3, Users, FileText,
  Mail, LogOut, KeyRound, ScanLine, Menu, X,
  Wine, Shield, ArrowUpRight, CreditCard, User, CalendarDays, GlassWater, MapPin,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import TaskBoard, { isAdmin } from '@/components/TaskBoard';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import MembershipPipeline from '@/components/MembershipPipeline';
import NewsManager from '@/components/NewsManager';
import MemberCRM from '@/components/MemberCRM';
import EventManager from '@/components/EventManager';
import CrmWine from '@/components/CrmWine';
import CrmBordeaux from '@/components/CrmBordeaux';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type Section = 'overview' | 'settings' | 'tasks' | 'analytics' | 'pipeline' | 'events' | 'news' | 'crm' | 'crm-wine' | 'crm-bordeaux';

interface NavItem {
  id: Section;
  label: string;
  icon: React.ElementType;
}

const NAV_MAIN: NavItem[] = [
  { id: 'overview', label: 'Overview',      icon: Home       },
  { id: 'settings', label: 'Impostazioni',  icon: KeyRound   },
];

const NAV_ADMIN: NavItem[] = [
  { id: 'tasks',     label: 'Task Board',         icon: CheckSquare },
  { id: 'analytics', label: 'Analytics',           icon: BarChart3   },
  { id: 'pipeline',  label: 'Pipeline Membership', icon: Users       },
  { id: 'events',       label: 'Gestione Eventi',      icon: CalendarDays },
  { id: 'news',         label: 'Gestione News',        icon: FileText    },
  { id: 'crm',          label: 'CRM Membri',           icon: Mail        },
  { id: 'crm-wine',     label: 'CRM Contatti Vino',    icon: GlassWater  },
  { id: 'crm-bordeaux', label: 'CRM Produttori BDX',   icon: MapPin      },
];

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

/** Monogram avatar */
function UserAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <div
      style={{ width: size, height: size, minWidth: size, fontSize: Math.round(size * 0.37) }}
      className="rounded-full bg-gradient-to-br from-[#731515] to-[#3d0808] flex items-center justify-center text-white font-semibold select-none"
    >
      {initials}
    </div>
  );
}

/** Single sidebar nav button */
function NavBtn({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-[7px] rounded-md text-left transition-all duration-150 text-[12.5px] relative ${
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

/** Sidebar shell — rendered both in desktop aside and mobile drawer */
function SidebarContent({
  displayName,
  email,
  activeSection,
  navigate,
  onLogout,
  admin,
  isStaff,
}: {
  displayName: string;
  email: string;
  activeSection: Section;
  navigate: (s: Section) => void;
  onLogout: () => void;
  admin: boolean;
  isStaff: boolean;
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

      {/* Divider */}
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

      {/* Divider */}
      <div className="mx-4 h-px bg-white/[0.07] mb-2 shrink-0" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
        {NAV_MAIN.map(item => (
          <NavBtn key={item.id} item={item} active={activeSection === item.id} onClick={() => navigate(item.id)} />
        ))}

        {admin && (
          <>
            <div className="pt-5 pb-1.5 px-3 flex items-center gap-1.5">
              <Shield size={8} className="text-white/20" />
              <span className="text-[8px] tracking-[0.55em] text-white/20 uppercase">Admin</span>
            </div>
            {NAV_ADMIN.map(item => (
              <NavBtn key={item.id} item={item} active={activeSection === item.id} onClick={() => navigate(item.id)} />
            ))}
          </>
        )}

        {isStaff && (
          <>
            <div className="pt-5 pb-1.5 px-3 flex items-center gap-1.5">
              <ScanLine size={8} className="text-white/20" />
              <span className="text-[8px] tracking-[0.55em] text-white/20 uppercase">Staff</span>
            </div>
            <Link
              href="/checkin"
              className="flex items-center gap-2.5 px-3 py-[7px] rounded-md text-white/45 hover:text-white/75 hover:bg-white/[0.06] transition-all duration-150 text-[12.5px]"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              <ScanLine size={14} className="text-white/35" />
              Event Scanner
            </Link>
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="mx-4 h-px bg-white/[0.07] shrink-0" />
      <div className="px-3 py-3 shrink-0 space-y-0.5">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-[7px] rounded-md text-white/30 hover:text-white/55 hover:bg-white/[0.06] transition-all duration-150 text-[12px]"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          <ArrowUpRight size={12} />
          vivowineclub.com
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-md text-white/30 hover:text-[#e88a8a] hover:bg-white/[0.06] transition-all duration-150 text-[12px] text-left"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          <LogOut size={12} />
          Esci
        </button>
      </div>

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
      <div className="mt-5 h-px w-16 bg-[#731515]/30" />
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
   Section: Overview
───────────────────────────────────────────── */
function OverviewSection({
  user,
  isStaff,
}: {
  user: { name?: string | null; email?: string | null };
  isStaff: boolean;
}) {
  return (
    <>
      <SectionHeader title="Overview" subtitle="Il tuo profilo e la tua membership." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Membership */}
        <Card>
          <CardLabel icon={CreditCard} label="My Membership" />
          <div className="bg-gradient-to-br from-[#6b1a1a] to-[#350707] rounded-lg p-5 text-white mb-5 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }}
            />
            <div className="text-[9px] tracking-[0.35em] text-white/50 mb-1">TIER</div>
            <div className="text-[22px] font-light leading-tight" style={{ fontFamily: 'var(--font-syne)' }}>
              Founder
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-white/45">
              <Wine size={10} />
              <span className="text-[9px] tracking-[0.3em]">CO-FOUNDER</span>
            </div>
          </div>
          <ul className="space-y-2">
            {[
              'Accesso completo a tutti gli eventi',
              'Visite esclusive in cantina',
              'Esperienze riservate ai membri',
              'Accesso al merch Vivo',
              'Priority su tutto',
            ].map(b => (
              <li key={b} className="flex items-start gap-2 text-[12.5px] text-[#6a3a3a]/70" style={{ fontFamily: 'var(--font-nunito)' }}>
                <span className="mt-[6px] w-1 h-1 rounded-full bg-[#731515]/50 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[10px] text-[#7a4a4a]/35 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
            * Gestione membership completa in arrivo.
          </p>
        </Card>

        {/* Profile */}
        <Card className="lg:col-span-2">
          <CardLabel icon={User} label="My Profile" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
            {[
              { label: 'NOME COMPLETO', value: user.name,  muted: !user.name },
              { label: 'EMAIL',         value: user.email, muted: false       },
              { label: 'MEMBRO DAL',    value: '2026',     muted: true        },
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
          <p className="text-[10px] text-[#7a4a4a]/35 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
            * La modifica del profilo sarà disponibile al lancio completo della piattaforma.
          </p>
        </Card>

        {/* Staff scanner */}
        {isStaff && (
          <div className="lg:col-span-3 rounded-xl bg-[#0d0202] border border-white/5 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
                <ScanLine size={18} className="text-white/70" />
              </div>
              <div>
                <div className="text-[8px] tracking-[0.5em] text-white/30 mb-0.5 uppercase">Staff Tools</div>
                <div className="text-[15px] font-light text-white/90" style={{ fontFamily: 'var(--font-syne)' }}>
                  Event Check-in Scanner
                </div>
                <p className="text-[11px] text-white/35 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                  Scansiona QR code o inserisci ID ordine per validare i biglietti.
                </p>
              </div>
            </div>
            <Link
              href="/checkin"
              className="shrink-0 inline-flex items-center gap-2 text-[9px] tracking-[0.3em] text-white bg-[#731515] px-6 py-3 rounded-lg hover:bg-[#9b2323] transition-colors duration-200 uppercase"
            >
              Apri Scanner
              <ArrowUpRight size={11} />
            </Link>
          </div>
        )}
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

/* ─────────────────────────────────────────────
   Page root
───────────────────────────────────────────── */
export default function MembersPage() {
  const { user, logout } = useAuth();
  const router           = useRouter();

  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [isStaff, setIsStaff]             = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const role = session?.user?.app_metadata?.role ?? session?.user?.user_metadata?.role;
      setIsStaff(role === 'staff');
    });
  }, []);

  useEffect(() => {
    if (user === null) {
      const t = setTimeout(() => router.replace('/login'), 500);
      return () => clearTimeout(t);
    }
  }, [user, router]);

  if (!user) return null;

  const admin       = isAdmin(user.email ?? '');
  const displayName = user.name || user.email?.split('@')[0] || 'Member';

  function navigate(s: Section) {
    setActiveSection(s);
    setSidebarOpen(false);
  }

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  const sidebarProps = {
    displayName,
    email: user.email ?? '',
    activeSection,
    navigate,
    onLogout: handleLogout,
    admin,
    isStaff,
  };

  return (
    <div className="flex h-screen bg-[#f6f0f0] overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-[230px] shrink-0 bg-[#0e0202] flex-col h-screen border-r border-white/[0.04]">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* ── Mobile overlay ── */}
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
              initial={{ x: -230 }}
              animate={{ x: 0 }}
              exit={{ x: -230 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-0 top-0 h-full w-[230px] bg-[#0e0202] z-50 flex flex-col border-r border-white/[0.04] lg:hidden"
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

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0e0202] border-b border-white/[0.06] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/50 hover:text-white p-1 transition-colors"
          >
            <Menu size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logobianco.png" alt="Vivo" className="h-6 opacity-70" />
          <UserAvatar name={displayName} size={28} />
        </div>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >

                {activeSection === 'overview' && (
                  <OverviewSection user={{ name: user.name, email: user.email }} isStaff={isStaff} />
                )}

                {activeSection === 'settings' && <SettingsSection />}

                {admin && activeSection === 'tasks' && (
                  <>
                    <SectionHeader title="Task Board" subtitle="Assegna e gestisci task tra i founder." />
                    <TaskBoard currentEmail={user.email ?? ''} />
                  </>
                )}

                {admin && activeSection === 'analytics' && (
                  <>
                    <SectionHeader title="Analytics" subtitle="KPI e metriche del club in tempo reale." />
                    <AnalyticsDashboard />
                  </>
                )}

                {admin && activeSection === 'pipeline' && (
                  <>
                    <SectionHeader title="Pipeline Membership" subtitle="Gestisci le richieste di adesione." />
                    <MembershipPipeline />
                  </>
                )}

                {admin && activeSection === 'events' && (
                  <EventManager />
                )}

                {admin && activeSection === 'news' && (
                  <>
                    <SectionHeader title="Gestione News" subtitle="Crea e modifica le card della homepage." />
                    <NewsManager />
                  </>
                )}

                {admin && activeSection === 'crm' && (
                  <>
                    <SectionHeader title="CRM Membri" subtitle="Lista membri e invio comunicazioni." />
                    <MemberCRM />
                  </>
                )}

                {admin && activeSection === 'crm-wine' && (
                  <>
                    <SectionHeader title="CRM Contatti Vino" subtitle="Contatti del settore vitivinicolo — produttori, hospitality, industry." />
                    <CrmWine />
                  </>
                )}

                {admin && activeSection === 'crm-bordeaux' && (
                  <>
                    <SectionHeader title="CRM Produttori Bordeaux" subtitle="Châteaux e produttori di Bordeaux — richieste visita e follow-up." />
                    <CrmBordeaux />
                  </>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
