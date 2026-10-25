'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3, CalendarDays, CheckSquare, ChevronLeft, Database, FileText, FolderOpen,
  Images, Inbox, LayoutGrid, LogOut, Search, Settings, ShoppingBag,
  Tag, Users, UsersRound, Wallet, X,
} from 'lucide-react';

import {
  barFor, beyondBarFor, mainFor, searchDestinations, PROFILE_ITEMS,
  type AdminDestination, type AdminRole,
} from '@/lib/admin-nav';

const ICON: Record<string, React.ElementType> = {
  events: CalendarDays, merch: ShoppingBag, tasks: CheckSquare, ped: FileText,
  membership: Users, finance: Wallet, documents: FolderOpen, applications: Inbox,
  crm: Database, site: Images, offers: Tag, analytics: BarChart3, team: UsersRound,
};

function Icon({ id, size = 22 }: { id: string; size?: number }) {
  const C = ICON[id] ?? LayoutGrid;
  return <C size={size} strokeWidth={1.7} aria-hidden="true" />;
}

export interface AdminShellProps {
  role: AdminRole;
  active: string;
  onNavigate: (id: string) => void;
  /** Name shown in the profile button. */
  userName?: string;
  /** Count on the Application tab, when there is something waiting. */
  pendingApplications?: number | null;
  /**
   * Quali destinazioni questa persona può aprire. Quelle che non può
   * non compaiono: né nella barra, né in "Tutto", né nella ricerca.
   */
  can?: (id: string) => boolean;
  /**
   * Uscire dall'area.
   *
   * Non c'era: chi entrava col portatile di qualcun altro non aveva
   * un modo per uscirne se non cancellando i dati del browser.
   */
  onLogout?: () => void;
  children: React.ReactNode;
}

export function AdminShell({
  role, active, onNavigate, userName, pendingApplications, can, onLogout, children,
}: AdminShellProps) {
  const bar = useMemo(() => barFor(role, can), [role, can]);
  const main = useMemo(() => mainFor(role, can), [role, can]);
  const beyond = useMemo(() => beyondBarFor(role, can), [role, can]);

  const [sheet, setSheet] = useState<null | 'more' | 'profile'>(null);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchDestinations(role, query, can), [role, query, can]);
  const inBar = bar.some((d) => d.id === active);

  /**
   * La freccia indietro, e dove riporta.
   *
   * Esiste solo sul telefono, dove la colonna di sinistra non c'è: sul
   * computer il menù è sempre lì accanto e una freccia sarebbe un
   * secondo modo di fare la stessa cosa.
   *
   * Riporta al menù da cui si è arrivati — "Tutto" per le sezioni, il
   * profilo per riepilogo e impostazioni — non a un'altra sezione: da
   * una sottopagina si torna all'elenco, si sceglie, si entra.
   */
  const fromProfile = PROFILE_ITEMS.some((p) => p.id === active);
  const showBack = !inBar && active !== 'overview';

  // The open sheet owns the viewport.
  useEffect(() => {
    document.body.style.overflow = sheet ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sheet]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheet(null);
      // One shortcut, the one people already know from every other tool.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSheet('more');
        setTimeout(() => searchRef.current?.focus(), 60);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function go(id: string) {
    onNavigate(id);
    setSheet(null);
    setQuery('');
  }

  const activeLabel =
    [...bar, ...beyond].find((d) => d.id === active)?.label ?? 'Riepilogo';

  return (
    <div className="ds flex min-h-[100dvh] flex-col bg-paper text-on-paper lg:flex-row">
      {/* ── Desktop rail ────────────────────────────────────────────
          Short on purpose: the four you live in, then everything else
          behind one door rather than a twenty-item column. */}
      <aside className="ds-on-ink hidden w-[232px] shrink-0 flex-col bg-ink text-on-ink lg:sticky lg:top-0 lg:flex lg:h-[100dvh]">
        <div className="px-5 py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logobianco.png" alt="Vivo Wine Club" className="h-7" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-1">
            {bar.map((d) => (
              <li key={d.id}>
                <RailItem d={d} active={active === d.id} onClick={() => go(d.id)} />
              </li>
            ))}
          </ul>

          <div className="my-4 h-px bg-rule-ink" />

          <button
            onClick={() => { setSheet('more'); setTimeout(() => searchRef.current?.focus(), 60); }}
            className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-body text-on-ink-muted transition-colors hover:bg-ink-soft hover:text-on-ink"
          >
            <Search size={20} strokeWidth={1.7} />
            <span className="flex-1">Cerca</span>
            <kbd className="ds-numeric rounded border border-rule-ink px-1.5 py-0.5 text-[11px] text-on-ink-muted">⌘K</kbd>
          </button>

          <ul className="mt-1 space-y-1">
            {main.map((d) => (
              <li key={d.id}>
                <RailItem
                  d={d}
                  compact
                  active={active === d.id}
                  badge={d.id === 'applications' ? pendingApplications : null}
                  onClick={() => go(d.id)}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-rule-ink p-3">
          <button
            onClick={() => setSheet('profile')}
            className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-ink-soft"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-fine font-semibold text-paper">
              {(userName ?? 'V').charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-body">{userName ?? 'Profilo'}</span>
            <Settings size={18} strokeWidth={1.7} className="text-on-ink-muted" />
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-on-ink-muted transition-colors hover:bg-ink-soft hover:text-on-ink"
            >
              <LogOut size={18} strokeWidth={1.7} />
              <span className="text-body">Esci</span>
            </button>
          )}
        </div>
      </aside>

      {/* ── Phone top bar ──────────────────────────────────────────
          Carries only where you are and who you are. Everything else
          lives in the thumb's reach at the bottom. */}
      <header className="ds-on-ink sticky top-0 z-30 flex h-[60px] items-center gap-2 bg-ink px-2 text-on-ink lg:hidden">
        {showBack ? (
          <button
            onClick={() => setSheet(fromProfile ? 'profile' : 'more')}
            aria-label="Indietro"
            className="-ml-1 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-ink-soft"
          >
            <ChevronLeft size={24} strokeWidth={1.9} />
          </button>
        ) : (
          <span className="w-2" />
        )}

        <h1 className="ds-display flex-1 truncate text-[19px] tracking-[-0.02em]">{activeLabel}</h1>

        <button
          onClick={() => { setSheet('more'); setTimeout(() => searchRef.current?.focus(), 60); }}
          aria-label="Cerca"
          className="grid h-11 w-11 place-items-center rounded-full hover:bg-ink-soft"
        >
          <Search size={21} strokeWidth={1.7} />
        </button>

        <button
          onClick={() => setSheet('profile')}
          aria-label="Profilo"
          className="grid h-11 w-11 place-items-center"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-fine font-semibold text-paper">
            {(userName ?? 'V').charAt(0).toUpperCase()}
          </span>
        </button>
      </header>

      {/* ── Work surface ───────────────────────────────────────────
          Light, because this is where dense tables and calendars live.
          The bottom padding clears the tab bar and the home indicator. */}
      <main className="min-w-0 flex-1 pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>

      {/* ── Phone tab bar ──────────────────────────────────────── */}
      <nav
        className="ds-on-ink fixed inset-x-0 bottom-0 z-30 border-t border-rule-ink bg-ink text-on-ink lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navigazione principale"
      >
        <ul className="grid grid-cols-5">
          {bar.map((d) => (
            <li key={d.id}>
              <TabItem
                label={d.label}
                id={d.id}
                active={active === d.id}
                onClick={() => go(d.id)}
              />
            </li>
          ))}
          <li>
            <TabItem
              label="Altro"
              id="__more"
              active={!inBar && sheet !== 'profile'}
              badge={pendingApplications}
              onClick={() => setSheet('more')}
            />
          </li>
        </ul>
      </nav>

      {/* ── Sheets ─────────────────────────────────────────────── */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex flex-col lg:items-center lg:justify-center lg:p-10">
          <button
            aria-label="Chiudi"
            onClick={() => setSheet(null)}
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
          />

          <div className="relative z-10 mt-auto flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-paper lg:mt-0 lg:max-w-[560px] lg:rounded-3xl">
            {sheet === 'more' ? (
              <MoreSheet
                query={query}
                setQuery={setQuery}
                searchRef={searchRef}
                results={results}
                beyond={beyond}
                active={active}
                pendingApplications={pendingApplications}
                onGo={go}
                onClose={() => setSheet(null)}
              />
            ) : (
              <ProfileSheet userName={userName} onGo={go} onLogout={onLogout} onClose={() => setSheet(null)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────── */

function RailItem({
  d, active, onClick, compact = false, badge,
}: {
  d: AdminDestination;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
  badge?: number | null;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left transition-colors ${
        active ? 'bg-accent text-paper' : 'text-on-ink-muted hover:bg-ink-soft hover:text-on-ink'
      }`}
    >
      <Icon id={d.id} size={compact ? 19 : 20} />
      <span className={`flex-1 truncate ${compact ? 'text-fine' : 'text-body'}`}>{d.label}</span>
      {badge ? (
        <span className="ds-numeric grid h-5 min-w-[20px] place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-paper">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function TabItem({
  label, id, active, onClick, badge,
}: {
  label: string;
  id: string;
  active: boolean;
  onClick: () => void;
  badge?: number | null;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex min-h-[64px] w-full flex-col items-center justify-center gap-1 px-1 transition-colors ${
        active ? 'text-paper' : 'text-on-ink-muted'
      }`}
    >
      <span className="relative">
        {id === '__more' ? <LayoutGrid size={22} strokeWidth={1.7} /> : <Icon id={id} />}
        {badge ? (
          <span className="ds-numeric absolute -right-2 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-paper">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="text-[11px] font-medium leading-none">{label}</span>
      {active && <span aria-hidden="true" className="absolute inset-x-5 top-0 h-[2px] rounded-full bg-accent" />}
    </button>
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-rule-paper px-5 py-4">
      <h2 className="ds-display text-[19px] tracking-[-0.02em]">{title}</h2>
      <button onClick={onClose} aria-label="Chiudi" className="grid h-11 w-11 place-items-center rounded-full hover:bg-paper-soft">
        <X size={20} strokeWidth={1.7} />
      </button>
    </div>
  );
}

function MoreSheet({
  query, setQuery, searchRef, results, beyond, active, pendingApplications, onGo, onClose,
}: {
  query: string;
  setQuery: (v: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  results: AdminDestination[];
  beyond: AdminDestination[];
  active: string;
  pendingApplications?: number | null;
  onGo: (id: string) => void;
  onClose: () => void;
}) {
  const weekly = beyond.filter((d) => d.rhythm === 'main');
  const others = beyond.filter((d) => d.rhythm === 'rest');
  const searching = query.trim().length > 0;

  return (
    <>
      <SheetHeader title="Tutto" onClose={onClose} />

      <div className="border-b border-rule-paper p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-rule-paper bg-paper-soft px-4">
          <Search size={19} strokeWidth={1.7} className="shrink-0 text-on-paper-muted" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca una sezione"
            className="min-h-[52px] w-full bg-transparent text-body placeholder:text-on-paper-muted/60 focus:outline-none [font-size:16px]"
          />
          {searching && (
            <button onClick={() => setQuery('')} aria-label="Pulisci" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-paper">
              <X size={16} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto overscroll-contain p-4">
        {searching ? (
          results.length > 0 ? (
            <SheetList items={results} active={active} onGo={onGo} pendingApplications={pendingApplications} />
          ) : (
            <p className="px-2 py-10 text-center text-body text-on-paper-muted">
              Nessuna sezione per “{query}”.
            </p>
          )
        ) : (
          <>
            {weekly.length > 0 && (
              <SheetList items={weekly} active={active} onGo={onGo} pendingApplications={pendingApplications} />
            )}
            {others.length > 0 && (
              <>
                <div className="my-4 h-px bg-rule-paper" />
                <SheetList items={others} active={active} onGo={onGo} pendingApplications={pendingApplications} />
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

function SheetList({
  items, active, onGo, pendingApplications,
}: {
  items: AdminDestination[];
  active: string;
  onGo: (id: string) => void;
  pendingApplications?: number | null;
}) {
  return (
    <ul className="space-y-1">
      {items.map((d) => (
        <li key={d.id}>
          <button
            onClick={() => onGo(d.id)}
            aria-current={active === d.id ? 'page' : undefined}
            className={`flex min-h-[64px] w-full items-center gap-4 rounded-2xl px-4 text-left transition-colors ${
              active === d.id ? 'bg-paper-soft' : 'hover:bg-paper-soft'
            }`}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper-soft text-accent">
              <Icon id={d.id} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium">{d.label}</span>
              <span className="block truncate text-fine text-on-paper-muted">{d.hint}</span>
            </span>
            {d.id === 'applications' && pendingApplications ? (
              <span className="ds-numeric grid h-6 min-w-[24px] shrink-0 place-items-center rounded-full bg-accent px-2 text-fine font-semibold text-paper">
                {pendingApplications}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ProfileSheet({
  userName, onGo, onLogout, onClose,
}: {
  userName?: string;
  onGo: (id: string) => void;
  onLogout?: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <SheetHeader title={userName ?? 'Profilo'} onClose={onClose} />
      <div className="p-4">
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => onGo('overview')}
              className="flex min-h-[64px] w-full items-center gap-4 rounded-2xl px-4 text-left hover:bg-paper-soft"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper-soft text-accent">
                <BarChart3 size={20} strokeWidth={1.7} />
              </span>
              <span>
                <span className="block text-body font-medium">Riepilogo</span>
                <span className="block text-fine text-on-paper-muted">I numeri di oggi in breve</span>
              </span>
            </button>
          </li>
          <li>
            <button
              onClick={() => onGo('settings')}
              className="flex min-h-[64px] w-full items-center gap-4 rounded-2xl px-4 text-left hover:bg-paper-soft"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper-soft text-accent">
                <Settings size={20} strokeWidth={1.7} />
              </span>
              <span>
                <span className="block text-body font-medium">Impostazioni</span>
                <span className="block text-fine text-on-paper-muted">Password e preferenze</span>
              </span>
            </button>
          </li>

          {onLogout && (
            <li>
              <button
                onClick={onLogout}
                className="flex min-h-[64px] w-full items-center gap-4 rounded-2xl px-4 text-left hover:bg-paper-soft"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper-soft text-accent">
                  <LogOut size={20} strokeWidth={1.7} />
                </span>
                <span>
                  <span className="block text-body font-medium">Esci</span>
                  <span className="block text-fine text-on-paper-muted">Chiudi la sessione su questo dispositivo</span>
                </span>
              </button>
            </li>
          )}
        </ul>
      </div>
    </>
  );
}
