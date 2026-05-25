'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, KeyRound, LogOut, Menu, X, ArrowUpRight,
  Tag, Wine, CreditCard, User, CalendarDays, GlassWater, ShoppingBag,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DiscountsView from '@/components/DiscountsView';

// ── Types ──────────────────────────────────────────────────────────────────────

type MemberSection = 'home' | 'discounts' | 'settings';

export interface MemberPortalProps {
  user:           { name?: string | null; email?: string | null };
  token:          string;
  onLogout:       () => void;
  initialSection?: MemberSection;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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

interface NavItem {
  id:    MemberSection;
  label: string;
  icon:  React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',      label: 'Home',         icon: Home     },
  { id: 'discounts', label: 'Deals & Perks', icon: Tag      },
  { id: 'settings',  label: 'Settings',      icon: KeyRound },
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

// ── Settings section (change password) ────────────────────────────────────────

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

// ── Home section ───────────────────────────────────────────────────────────────

function HomeSection({
  user,
  onGoToDiscounts,
}: {
  user:             { name?: string | null; email?: string | null };
  onGoToDiscounts:  () => void;
}) {
  const firstName = user.name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Member';

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

        {/* Profile */}
        <Card className="lg:col-span-2">
          <CardLabel icon={User} label="My Profile" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
            {[
              { label: 'FULL NAME',    value: user.name,  muted: !user.name },
              { label: 'EMAIL',        value: user.email, muted: false      },
              { label: 'MEMBER SINCE', value: '2026',     muted: true       },
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
            * Profile editing will be available at full platform launch.
          </p>
        </Card>

        {/* Quick action: discounts */}
        <div
          className="lg:col-span-3 rounded-xl bg-[#0d0202] border border-white/5 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 shadow-[0_4px_24px_rgba(0,0,0,0.25)] cursor-pointer"
          onClick={onGoToDiscounts}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
              <Tag size={18} className="text-white/70" />
            </div>
            <div>
              <div className="text-[8px] tracking-[0.5em] text-white/30 mb-0.5 uppercase">Members Only</div>
              <div className="text-[15px] font-light text-white/90" style={{ fontFamily: 'var(--font-syne)' }}>
                Deals & Perks
              </div>
              <p className="text-[11px] text-white/35 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                Access exclusive offers and perks reserved for Vivo Wine Club members.
              </p>
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onGoToDiscounts(); }}
            className="shrink-0 inline-flex items-center gap-2 text-[9px] tracking-[0.3em] text-white bg-[#731515] px-6 py-3 rounded-lg hover:bg-[#9b2323] transition-colors duration-200 uppercase"
          >
            Explore
            <ArrowUpRight size={11} />
          </button>
        </div>
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
    <div className="flex bg-[#f6f0f0] overflow-hidden" style={{ height: '100dvh' }}>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[220px] shrink-0 bg-[#0e0202] flex-col border-r border-white/[0.04]" style={{ height: '100dvh' }}>
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

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
                  <HomeSection user={user} onGoToDiscounts={() => navigate('discounts')} />
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

                {activeSection === 'settings' && <SettingsSection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
