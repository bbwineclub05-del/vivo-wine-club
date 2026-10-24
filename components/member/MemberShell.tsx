'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarDays, CreditCard, Grape, Star, Tag, User } from 'lucide-react';

/**
 * L'area del socio, con le stesse mani dell'area riservata.
 *
 * Cinque posti, non sette: la barra in basso sul telefono, una colonna
 * sul computer. Prima la navigazione era un elenco verticale di voci
 * in inglese che su un telefono finiva sopra il contenuto.
 */

export type MemberSection = 'tessera' | 'eventi' | 'cantine' | 'selection' | 'vantaggi' | 'profilo';

/**
 * Le voci, con la chiave della loro traduzione.
 *
 * Prima le etichette erano scritte qui in italiano, e un socio
 * francese si ritrovava "CANTINE" in cima alla pagina pur avendo
 * scelto il francese ovunque.
 */
export const SECTIONS: { id: MemberSection; key: string; icon: React.ElementType }[] = [
  { id: 'tessera', key: 'navTessera', icon: CreditCard },
  { id: 'eventi', key: 'navEventi', icon: CalendarDays },
  { id: 'cantine', key: 'navCantine', icon: Grape },
  { id: 'selection', key: 'navSelection', icon: Star },
  { id: 'vantaggi', key: 'navVantaggi', icon: Tag },
  { id: 'profilo', key: 'navProfilo', icon: User },
];

export function MemberShell({
  active, onNavigate, userName, children,
}: {
  active: MemberSection;
  onNavigate: (s: MemberSection) => void;
  userName?: string | null;
  children: React.ReactNode;
}) {
  const t = useTranslations('member');
  const label = t(SECTIONS.find((s) => s.id === active)?.key ?? 'navTessera');

  // Il titolo della pagina segue la sezione: su un telefono è l'unico
  // posto dove si capisce dove si è.
  useEffect(() => {
    document.title = `${label} · VIVO Wine Club`;
  }, [label]);

  return (
    <div className="ds flex min-h-[100dvh] flex-col bg-paper text-on-paper lg:flex-row">
      {/* ── Colonna del computer ── */}
      <aside className="ds-on-ink hidden w-[232px] shrink-0 flex-col bg-ink text-on-ink lg:sticky lg:top-0 lg:flex lg:h-[100dvh]">
        <div className="px-5 py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logobianco.png" alt="Vivo Wine Club" className="h-7" />
        </div>
        <nav className="flex-1 px-3">
          <ul className="space-y-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const on = active === s.id;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => onNavigate(s.id)}
                    className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left transition-colors ${
                      on ? 'bg-accent text-paper' : 'text-on-ink-muted hover:bg-ink-soft hover:text-on-ink'
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.7} />
                    <span className="text-body">{t(s.key)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        {userName && (
          <div className="border-t border-rule-ink px-5 py-4 text-fine text-on-ink-muted">{userName}</div>
        )}
      </aside>

      {/* ── Barra del telefono ── */}
      <header className="ds-on-ink sticky top-0 z-30 flex h-[56px] items-center gap-3 bg-ink px-4 text-on-ink lg:hidden">
        <h1 className="ds-display flex-1 truncate text-[18px] tracking-[-0.02em]">{label}</h1>
      </header>

      <main className="min-w-0 flex-1 pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-0">
        <div className="mx-auto max-w-[1100px] px-5 py-6 lg:px-10 lg:py-10">{children}</div>
      </main>

      <nav
        aria-label="Navigazione"
        className="ds-on-ink fixed inset-x-0 bottom-0 z-40 flex border-t border-rule-ink bg-ink text-on-ink lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const on = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onNavigate(s.id)}
              className={`relative flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors ${
                on ? 'text-on-ink' : 'text-on-ink-muted'
              }`}
            >
              {on && <span className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-accent" />}
              <Icon size={21} strokeWidth={on ? 2 : 1.6} />
              <span className="text-[10px] font-medium leading-none">{t(s.key)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** Il titolo di una schermata. */
export function Head({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h2 className="ds-display text-[26px] leading-none tracking-[-0.03em] lg:text-[32px]">{title}</h2>
      {subtitle && <p className="mt-2.5 max-w-[62ch] text-body text-on-paper-muted">{subtitle}</p>}
    </header>
  );
}

/** Un riquadro. */
export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-rule-paper p-5 ${className}`}>{children}</div>;
}
