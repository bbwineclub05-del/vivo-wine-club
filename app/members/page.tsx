'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, CheckSquare, BarChart3, Users, FileText,
  Mail, LogOut, KeyRound, ScanLine, Menu, X,
  Wine, Shield, ArrowUpRight, CreditCard, User, CalendarDays, GlassWater, MapPin, Images,
  Database, ChevronDown, UsersRound, Lock, ShoppingBag, Tag, FolderOpen, Layers,
  Camera, Loader2, Building2, Wallet, Receipt, BookOpen,
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
import CrmClienti from '@/components/CrmClienti';
import CrmSponsors from '@/components/CrmSponsors';
import MediaManager from '@/components/MediaManager';
import TeamManagement from '@/components/TeamManagement';
import MerchManager from '@/components/MerchManager';
import DiscountManager from '@/components/DiscountManager';
import DocumentManager from '@/components/DocumentManager';
import MemberPortal from '@/components/MemberPortal';
import MembershipCard from '@/components/MembershipCard';
import FinanceManager from '@/components/FinanceManager';
import BilancioManager from '@/components/BilancioManager';
import QuoteGenerator from '@/components/QuoteGenerator';
import PedManager from '@/components/PedManager';
import { isSuperAdmin, isFinanceUser } from '@/lib/admins';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type Section = 'overview' | 'settings' | 'card' | 'tasks' | 'analytics' | 'pipeline' | 'events' | 'news' | 'crm' | 'crm-wine' | 'crm-bordeaux' | 'crm-clienti' | 'crm-sponsors' | 'media' | 'team' | 'merch' | 'discounts' | 'documents' | 'finance' | 'bilancio' | 'quotes' | 'ped';

// Maps section IDs to the permission key in team_members.permissions
const SECTION_PERM: Partial<Record<Section, string>> = {
  tasks:         'tasks',
  events:        'events',
  news:          'news',
  crm:           'crm',
  'crm-wine':    'crm',
  'crm-bordeaux':'crm',
  'crm-clienti':  'crm',
  'crm-sponsors': 'crm',
  media:         'media',
  analytics:     'analytics',
  pipeline:      'pipeline',
  merch:         'merch',
  discounts:     'merch',
  documents:     'documents',
};

interface NavItem {
  id: Section;
  label: string;
  icon: React.ElementType;
}

const NAV_MAIN: NavItem[] = [
  { id: 'overview', label: 'Overview',        icon: Home       },
  { id: 'card',     label: 'Membership Card', icon: CreditCard },
  { id: 'settings', label: 'Impostazioni',    icon: KeyRound   },
];

// Sub-items for the collapsible Gestione group
const GESTIONE_ITEMS: NavItem[] = [
  { id: 'events',    label: 'Eventi',  icon: CalendarDays },
  { id: 'news',      label: 'News',    icon: FileText     },
  { id: 'merch',     label: 'Merch',   icon: ShoppingBag  },
  { id: 'media',     label: 'Media',   icon: Images       },
  { id: 'discounts', label: 'Sconti',  icon: Tag          },
];

// Visible to both admin and staff
const NAV_SHARED: NavItem[] = [
  { id: 'tasks',     label: 'Task', icon: CheckSquare },
  { id: 'ped',       label: 'PED',        icon: BookOpen    },
  { id: 'documents', label: 'Documenti',  icon: FolderOpen  },
  { id: 'quotes',    label: 'Preventivi', icon: Receipt     },
];

// Admin only
const NAV_ADMIN_ONLY: NavItem[] = [
  { id: 'analytics', label: 'Analytics',           icon: BarChart3 },
  { id: 'pipeline',  label: 'Pipeline Membership', icon: Users     },
];

const CRM_ITEMS: NavItem[] = [
  { id: 'crm',           label: 'CRM Membri',        icon: Mail      },
  { id: 'crm-clienti',   label: 'CRM Clienti',       icon: Users     },
  { id: 'crm-sponsors',  label: 'CRM Sponsors',      icon: Building2 },
  { id: 'crm-wine',      label: 'CRM Contatti Vino', icon: GlassWater },
  { id: 'crm-bordeaux',  label: 'CRM Produttori BDX',icon: MapPin    },
];

// Visible to both admin and staff
const NAV_SHARED_BOTTOM: NavItem[] = [];

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

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

/** Collapsible CRM group in the sidebar */
function CrmGroupNav({ activeSection, navigate }: { activeSection: Section; navigate: (s: Section) => void }) {
  const isCrmActive = (CRM_ITEMS as NavItem[]).some((item) => item.id === activeSection);
  const [open, setOpen] = useState(isCrmActive);

  // Auto-open when a CRM sub-section becomes active (e.g. via external navigation)
  useEffect(() => {
    if (isCrmActive) setOpen(true);
  }, [isCrmActive]);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-3 py-[7px] rounded-md text-left transition-all duration-150 text-[12.5px] ${
          isCrmActive
            ? 'text-white/75 bg-white/[0.04]'
            : 'text-white/45 hover:text-white/75 hover:bg-white/[0.06]'
        }`}
        style={{ fontFamily: 'var(--font-nunito)' }}
      >
        <Database size={14} className={isCrmActive ? 'text-[#c84040]' : 'text-white/35'} />
        CRM
        <ChevronDown
          size={11}
          className={`ml-auto text-white/25 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-3 pl-2.5 border-l border-white/[0.07] mt-0.5 mb-0.5 space-y-0.5">
              {CRM_ITEMS.map((item) => (
                <NavBtn
                  key={item.id}
                  item={item}
                  active={activeSection === item.id}
                  onClick={() => navigate(item.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Collapsible Gestione group (Events, News, Merch) in the sidebar */
function GestioneGroupNav({ activeSection, navigate }: { activeSection: Section; navigate: (s: Section) => void }) {
  const isActive = GESTIONE_ITEMS.some((item) => item.id === activeSection);
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-3 py-[7px] rounded-md text-left transition-all duration-150 text-[12.5px] ${
          isActive
            ? 'text-white/75 bg-white/[0.04]'
            : 'text-white/45 hover:text-white/75 hover:bg-white/[0.06]'
        }`}
        style={{ fontFamily: 'var(--font-nunito)' }}
      >
        <Layers size={14} className={isActive ? 'text-[#c84040]' : 'text-white/35'} />
        Gestione
        <ChevronDown
          size={11}
          className={`ml-auto text-white/25 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-3 pl-2.5 border-l border-white/[0.07] mt-0.5 mb-0.5 space-y-0.5">
              {GESTIONE_ITEMS.map((item) => (
                <NavBtn
                  key={item.id}
                  item={item}
                  active={activeSection === item.id}
                  onClick={() => navigate(item.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const FINANCE_ITEMS: NavItem[] = [
  { id: 'finance',  label: 'Transazioni', icon: Receipt  },
  { id: 'bilancio', label: 'Bilancio',    icon: BarChart3 },
];

/** Collapsible Finance group (Transazioni, Bilancio) in the sidebar */
function FinanceGroupNav({ activeSection, navigate }: { activeSection: Section; navigate: (s: Section) => void }) {
  const isActive = FINANCE_ITEMS.some((item) => item.id === activeSection);
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-3 py-[7px] rounded-md text-left transition-all duration-150 text-[12.5px] ${
          isActive
            ? 'text-white/75 bg-white/[0.04]'
            : 'text-white/45 hover:text-white/75 hover:bg-white/[0.06]'
        }`}
        style={{ fontFamily: 'var(--font-nunito)' }}
      >
        <Wallet size={14} className={isActive ? 'text-[#c84040]' : 'text-white/35'} />
        Finance
        <ChevronDown
          size={11}
          className={`ml-auto text-white/25 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-3 pl-2.5 border-l border-white/[0.07] mt-0.5 mb-0.5 space-y-0.5">
              {FINANCE_ITEMS.map((item) => (
                <NavBtn
                  key={item.id}
                  item={item}
                  active={activeSection === item.id}
                  onClick={() => navigate(item.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  canAccess,
  superAdmin,
  financeUser,
}: {
  displayName: string;
  email: string;
  activeSection: Section;
  navigate: (s: Section) => void;
  onLogout: () => void;
  admin: boolean;
  isStaff: boolean;
  canAccess: (section: Section) => boolean;
  superAdmin: boolean;
  financeUser: boolean;
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

        {/* Event Scanner — visible to all authenticated users */}
        <div className="pt-5 pb-1.5 px-3 flex items-center gap-1.5">
          <ScanLine size={8} className="text-white/20" />
          <span className="text-[8px] tracking-[0.55em] text-white/20 uppercase">Scanner</span>
        </div>
        <Link
          href="/checkin"
          className="flex items-center gap-2.5 px-3 py-[7px] rounded-md text-white/45 hover:text-white/75 hover:bg-white/[0.06] transition-all duration-150 text-[12.5px]"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          <ScanLine size={14} className="text-white/35" />
          Event Scanner
        </Link>

        {(admin || isStaff) && (
          <>
            <div className="pt-5 pb-1.5 px-3 flex items-center gap-1.5">
              {admin
                ? <Shield size={8} className="text-white/20" />
                : <ScanLine size={8} className="text-white/20" />
              }
              <span className="text-[8px] tracking-[0.55em] text-white/20 uppercase">
                {admin ? 'Admin' : 'Gestione'}
              </span>
            </div>
            <GestioneGroupNav activeSection={activeSection} navigate={navigate} />
            {NAV_SHARED.map(item => (
              <NavBtn key={item.id} item={item} active={activeSection === item.id} onClick={() => navigate(item.id)} />
            ))}
            {NAV_ADMIN_ONLY.map(item => (
              <NavBtn key={item.id} item={item} active={activeSection === item.id} onClick={() => navigate(item.id)} />
            ))}
            <CrmGroupNav activeSection={activeSection} navigate={navigate} />
            {NAV_SHARED_BOTTOM.map(item => (
              <NavBtn key={item.id} item={item} active={activeSection === item.id} onClick={() => navigate(item.id)} />
            ))}
          </>
        )}

        {superAdmin && (
          <>
            <div className="pt-5 pb-1.5 px-3 flex items-center gap-1.5">
              <UsersRound size={8} className="text-white/20" />
              <span className="text-[8px] tracking-[0.55em] text-white/20 uppercase">Super Admin</span>
            </div>
            <NavBtn
              item={{ id: 'team', label: 'Team Management', icon: UsersRound }}
              active={activeSection === 'team'}
              onClick={() => navigate('team')}
            />
          </>
        )}

        {financeUser && (
          <>
            <div className="pt-5 pb-1.5 px-3 flex items-center gap-1.5">
              <Wallet size={8} className="text-white/20" />
              <span className="text-[8px] tracking-[0.55em] text-white/20 uppercase">Finance</span>
            </div>
            <FinanceGroupNav activeSection={activeSection} navigate={navigate} />
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
   Section: Membership Card
───────────────────────────────────────────── */
function CardSection({ token }: { token: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardData, setCardData] = useState<{
    memberId: string; name: string; tier: string; memberSince: number;
  } | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copied,      setCopied]      = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/member/card', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.memberId) setCardData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDownload() {
    if (!cardRef.current || !cardData) return;
    setDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      await document.fonts.ready;
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `vivo-card-${cardData.memberId}.png`;
      a.click();
    } catch (err) {
      console.error('[CardSection] download error:', err);
    } finally {
      setDownloading(false);
    }
  }

  function handleCopyLink() {
    if (!cardData) return;
    const url = `https://vivowineclub.com/card/${cardData.memberId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <>
      <SectionHeader title="Membership Card" subtitle="La tua tessera digitale Vivo Wine Club." />

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
        </div>
      ) : cardData ? (
        <div className="flex flex-col items-center gap-8 max-w-[520px] mx-auto">

          {/* The card itself */}
          <div className="w-full">
            <MembershipCard {...cardData} cardRef={cardRef} />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors duration-200"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {downloading ? 'DOWNLOADING...' : 'DOWNLOAD PNG'}
            </button>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#731515]/30 text-[#731515] text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#fdf0f0] hover:border-[#731515]/50 transition-all duration-200"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {copied ? 'LINK COPIATO' : 'CONDIVIDI LINK'}
            </button>
          </div>

          {/* Share URL display */}
          <div className="w-full">
            <div className="text-[8px] tracking-[0.4em] text-[#7B1D1D] mb-2" style={{ fontFamily: 'var(--font-nunito)' }}>
              URL PUBBLICA
            </div>
            <div
              className="w-full bg-[#fdf6f6] border border-[#e8d5d5] rounded-lg px-4 py-3 text-[12px] text-[#1a0505] truncate"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              vivowineclub.com/card/{cardData.memberId}
            </div>
            <p className="mt-2 text-[10px] text-[#7a4a4a]/60 leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
              Chiunque con questo link puo vedere la tua card — nessun login richiesto.
            </p>
          </div>

        </div>
      ) : (
        <p className="text-[13px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
          Impossibile caricare la card. Riprova piu tardi.
        </p>
      )}
    </>
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

  useEffect(() => {
    if (!token) return;
    fetch('/api/member/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.profile?.avatar_url) setAvatarUrl(d.profile.avatar_url); })
      .catch(() => {/* silent — avatar is optional */});
  }, [token]);

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
              {isAdmin ? 'Founder' : 'Staff'}
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-white/45">
              <Wine size={10} />
              <span className="text-[9px] tracking-[0.3em]">{isAdmin ? 'CO-FOUNDER' : 'STAFF MEMBER'}</span>
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

          {/* Avatar + info row */}
          <div className="flex items-start gap-5 mb-6">

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 flex-1 min-w-0">
              {avatarError && (
                <p className="col-span-full text-[10px] text-red-400 mb-1">{avatarError}</p>
              )}
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
          </div>

          <p className="text-[10px] text-[#7a4a4a]/35 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
            * La modifica del profilo sarà disponibile al lancio completo della piattaforma.
          </p>
        </Card>

        {/* Event Scanner — visible to all authenticated users */}
        {true && (
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

/* ─────────────────────────────────────────────
   Page root
───────────────────────────────────────────── */
function MembersPageInner() {
  const { user, logout } = useAuth();
  const router           = useRouter();
  const searchParams     = useSearchParams();

  // If the invite link contains ?section=settings, open that tab immediately
  const initialSection = (searchParams.get('section') as Section | null) ?? 'overview';
  const [activeSection,     setActiveSection]     = useState<Section>(initialSection);
  const [sidebarOpen,       setSidebarOpen]        = useState(false);
  const [isStaff,           setIsStaff]            = useState(false);
  const [isMember,          setIsMember]           = useState(false);
  const [token,             setToken]              = useState('');
  const [staffPermissions,  setStaffPermissions]   = useState<Record<string, boolean> | null>(null);

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

  useEffect(() => {
    if (user === null) {
      const t = setTimeout(() => router.replace('/login'), 500);
      return () => clearTimeout(t);
    }
  }, [user, router]);

  if (!user) return null;

  const admin       = isAdmin(user.email ?? '');
  const superAdmin  = isSuperAdmin(user.email ?? '');
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

  /** Returns true if the current user can access this section. */
  function canAccess(section: Section): boolean {
    if (admin) return true; // admins always have full access
    if (!isStaff) return false;
    const permKey = SECTION_PERM[section];
    if (!permKey) return true; // overview, settings, etc. — always accessible
    return staffPermissions?.[permKey] ?? false;
  }

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
    email:     user.email ?? '',
    activeSection,
    navigate,
    onLogout:  handleLogout,
    admin,
    isStaff,
    canAccess,
    superAdmin,
    financeUser,
  };

  return (
    <div className="flex overflow-hidden relative" style={{ height: '100dvh', background: '#0a0101' }}>

      {/* ── Fixed background image (vigna.jpg) ── */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ backgroundImage: 'url(/vigna.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-[#0a0101]/65" />
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-[230px] shrink-0 bg-[#0e0202] flex-col border-r border-white/[0.04] relative z-10" style={{ height: '100dvh' }}>
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">

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
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >

                {activeSection === 'overview' && (
                  <OverviewSection user={{ name: user.name, email: user.email }} isAdmin={admin} isStaff={isStaff} token={token} />
                )}

                {activeSection === 'settings' && <SettingsSection />}

                {activeSection === 'card' && <CardSection token={token} />}

                {(admin || isStaff) && activeSection === 'tasks' && (
                  canAccess('tasks') ? (
                    <>
                      <SectionHeader title="Task" subtitle="Assegna e gestisci task tra i founder." />
                      <TaskBoard currentEmail={user.email ?? ''} />
                    </>
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

                {(admin || isStaff) && activeSection === 'pipeline' && (
                  canAccess('pipeline') ? (
                    <>
                      <SectionHeader title="Pipeline Membership" subtitle="Gestisci le richieste di adesione." />
                      <MembershipPipeline />
                    </>
                  ) : <UnauthorisedSection title="Pipeline Membership" />
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
                  canAccess('crm') ? (
                    <>
                      <SectionHeader title="CRM Membri" subtitle="Lista membri e invio comunicazioni." />
                      <MemberCRM />
                    </>
                  ) : <UnauthorisedSection title="CRM Membri" />
                )}

                {(admin || isStaff) && activeSection === 'crm-wine' && (
                  canAccess('crm-wine') ? (
                    <>
                      <SectionHeader title="CRM Contatti Vino" subtitle="Contatti del settore vitivinicolo — produttori, hospitality, industry." />
                      <CrmWine />
                    </>
                  ) : <UnauthorisedSection title="CRM Contatti Vino" />
                )}

                {(admin || isStaff) && activeSection === 'crm-bordeaux' && (
                  canAccess('crm-bordeaux') ? (
                    <>
                      <SectionHeader title="CRM Produttori Bordeaux" subtitle="Châteaux e produttori di Bordeaux — richieste visita e follow-up." />
                      <CrmBordeaux />
                    </>
                  ) : <UnauthorisedSection title="CRM Produttori Bordeaux" />
                )}

                {(admin || isStaff) && activeSection === 'crm-clienti' && (
                  canAccess('crm-clienti') ? (
                    <>
                      <SectionHeader title="CRM Clienti" subtitle="Banca dati automatica dei clienti che hanno acquistato biglietti — invio email e storico eventi." />
                      <CrmClienti />
                    </>
                  ) : <UnauthorisedSection title="CRM Clienti" />
                )}

                {(admin || isStaff) && activeSection === 'crm-sponsors' && (
                  canAccess('crm-sponsors') ? (
                    <>
                      <SectionHeader title="CRM Sponsors" subtitle="Gestione degli sponsor del club — contatti, siti web e note." />
                      <CrmSponsors />
                    </>
                  ) : <UnauthorisedSection title="CRM Sponsors" />
                )}

                {financeUser && activeSection === 'finance' && (
                  <>
                    <SectionHeader title="Transazioni" subtitle="Gestione contabile — revenues, costi e saldo di cassa." />
                    <FinanceManager />
                  </>
                )}

                {financeUser && activeSection === 'bilancio' && (
                  <>
                    <SectionHeader title="Bilancio" subtitle="Analisi dei flussi finanziari per periodo — mensile, trimestrale, annuale." />
                    <BilancioManager />
                  </>
                )}

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

                {(admin || isStaff) && activeSection === 'discounts' && (
                  canAccess('discounts') ? (
                    <>
                      <SectionHeader title="Gestione Sconti" subtitle="Sconti e convenzioni per i membri del club." />
                      <DiscountManager token={token} />
                    </>
                  ) : <UnauthorisedSection title="Gestione Sconti" />
                )}

                {(admin || isStaff) && activeSection === 'documents' && (
                  canAccess('documents') ? (
                    <DocumentManager token={token} isAdmin={admin} />
                  ) : <UnauthorisedSection title="Gestione Documenti" />
                )}

                {superAdmin && activeSection === 'team' && <TeamManagement />}

                {(admin || isStaff) && activeSection === 'quotes' && (
                  <>
                    <QuoteGenerator />
                  </>
                )}

                {(admin || isStaff) && activeSection === 'ped' && (
                  <>
                    <SectionHeader title="Piano Editoriale" subtitle="Pianificazione e tracciamento dei contenuti social e digitali." />
                    <PedManager />
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

export default function MembersPage() {
  return (
    <Suspense>
      <MembersPageInner />
    </Suspense>
  );
}
