'use client';

/**
 * Il sito su un telefono, stando seduti al computer.
 *
 * Esiste perche' chiedere "aprilo con gli strumenti da sviluppatore e
 * scegli iPhone 14" e' una cosa che si fa una volta e poi non si fa
 * piu'. Qui c'e' una cornice da 390 per 844 — le misure su cui il
 * sito e' disegnato — e un elenco di pagine da cui scegliere.
 *
 * E' una pagina di servizio: vive solo in sviluppo, non e' il sito.
 */

import { Suspense, useState } from 'react';
import { notFound } from 'next/navigation';
import { Monitor, RotateCw, Smartphone } from 'lucide-react';

const PAGINE: { href: string; label: string }[] = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Eventi' },
  { href: '/wear-the-club', label: 'Shop' },
  { href: '/membership', label: 'Diventa member' },
  { href: '/manifesto', label: 'Manifesto' },
  { href: '/brands', label: 'Studio' },
  { href: '/wineries', label: 'Cantine' },
  { href: '/partners', label: 'Partner' },
  { href: '/news', label: 'News' },
  { href: '/faq', label: 'FAQ' },
  { href: '/login', label: 'Accesso' },
  { href: '/privacy-policy', label: 'Privacy' },
  // Le due aree dietro l'accesso. La prima e' quella vera e chiede
  // una sessione; la seconda e' l'anteprima del socio, che la
  // sessione se la costruisce da se'.
  { href: '/members', label: 'Area riservata' },
  { href: '/anteprima-socio?schermo=1', label: 'Area socio' },
];

/** Le misure di schermo su cui vale la pena guardare. */
const SCHERMI = [
  { id: 'piccolo', label: 'iPhone SE', w: 375, h: 667 },
  { id: 'medio', label: 'iPhone 14', w: 390, h: 844 },
  { id: 'grande', label: 'iPhone Max', w: 430, h: 932 },
] as const;

function Anteprima() {
  const [pagina, setPagina] = useState('/');
  const [schermo, setSchermo] = useState<(typeof SCHERMI)[number]>(SCHERMI[1]);
  const [computer, setComputer] = useState(false);
  const [giro, setGiro] = useState(0);

  const indirizzo = `${pagina}${pagina.includes('?') ? '&' : '?'}anteprima=1`;

  return (
    <div className="ds min-h-[100dvh] bg-paper-soft text-on-paper">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="ds-display text-[22px] leading-none tracking-[-0.02em]">Il sito su un telefono</p>
            <p className="mt-2 max-w-[52ch] text-fine text-on-paper-muted">
              Pagina di servizio, non fa parte del sito. Cambia lingua dalla bandierina dentro la
              cornice: la scelta vale anche qui.
            </p>
          </div>

          <div className="flex gap-2">
            {SCHERMI.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSchermo(s);
                  setComputer(false);
                }}
                aria-pressed={!computer && schermo.id === s.id}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-fine font-medium transition-colors ${
                  !computer && schermo.id === s.id
                    ? 'border-accent bg-accent text-paper'
                    : 'border-rule-paper text-on-paper'
                }`}
              >
                <Smartphone size={15} strokeWidth={1.9} />
                {s.label}
              </button>
            ))}
            <button
              onClick={() => setComputer(true)}
              aria-pressed={computer}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-fine font-medium transition-colors ${
                computer ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
              }`}
            >
              <Monitor size={15} strokeWidth={1.9} />
              Computer
            </button>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2" aria-label="Pagine">
          {PAGINE.map((p) => (
            <button
              key={p.href}
              onClick={() => setPagina(p.href)}
              aria-pressed={pagina === p.href}
              className={`inline-flex min-h-[40px] items-center rounded-full border px-4 text-fine transition-colors ${
                pagina === p.href
                  ? 'border-accent bg-accent text-paper'
                  : 'border-rule-paper text-on-paper hover:border-accent/40'
              }`}
            >
              {p.label}
            </button>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <span className="ds-numeric rounded-full border border-rule-paper px-3 py-1 text-fine text-on-paper-muted">
            {computer ? 'tutta la larghezza' : `${schermo.w} × ${schermo.h}`}
          </span>
          <span className="truncate text-fine text-on-paper-muted">localhost:3001{pagina}</span>
          <button
            onClick={() => setGiro((g) => g + 1)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-rule-paper px-4 text-fine transition-colors hover:border-accent/40"
          >
            <RotateCw size={15} strokeWidth={1.9} />
            Ricarica
          </button>
        </div>

        <div className="flex justify-center pb-10">
          {computer ? (
            <div className="w-full overflow-hidden rounded-2xl border border-rule-paper bg-paper">
              <iframe
                key={`pc-${pagina}-${giro}`}
                src={indirizzo}
                title={`${pagina} sul computer`}
                className="block h-[820px] w-full bg-paper"
              />
            </div>
          ) : (
            // La cornice e' nera e spessa come un telefono vero: serve
            // a ricordare che quello e' tutto lo spazio che c'e'.
            <div className="rounded-[44px] border-[11px] border-ink bg-ink shadow-2xl">
              <iframe
                key={`tel-${pagina}-${schermo.id}-${giro}`}
                src={indirizzo}
                title={`${pagina} sul telefono`}
                style={{ width: schermo.w, height: schermo.h }}
                className="block rounded-[33px] bg-paper"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnteprimaPage() {
  // Solo in sviluppo: in produzione questo indirizzo non esiste.
  if (process.env.NODE_ENV !== 'development') notFound();

  return (
    <Suspense>
      <Anteprima />
    </Suspense>
  );
}
