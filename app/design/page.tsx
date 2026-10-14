import { Button, ButtonLink } from '@/components/ui/Button';
import { Chapter, Statement } from '@/components/ui/Chapter';
import { DoorCard } from '@/components/ui/DoorCard';
import { Marquee } from '@/components/ui/Marquee';
import { Section } from '@/components/ui/Section';
import { VideoCard } from '@/components/ui/VideoCard';

export const metadata = { title: 'Design system · Vivo', robots: { index: false } };

const SWATCHES = [
  { name: 'ink', hex: '#1A0505', note: 'fondo scuro' },
  { name: 'ink-soft', hex: '#2E1212', note: 'superficie sul fondo scuro' },
  { name: 'paper', hex: '#FDFBFA', note: 'fondo chiaro' },
  { name: 'paper-soft', hex: '#F4EDEB', note: 'superficie sul fondo chiaro' },
  { name: 'accent', hex: '#731515', note: 'unico accento: pillole, link' },
  { name: 'rose', hex: '#E8B4B4', note: 'secondo accento, con parsimonia' },
];

const SCALE = [
  { token: 'chapter', sample: 'Studio', note: 'titolo di capitolo' },
  { token: 'statement', sample: 'Il vino, raccontato da chi lo beve', note: 'momento manifesto' },
  { token: 'title', sample: 'Titolo di sezione', note: 'titolo di sezione' },
  { token: 'subtitle', sample: 'Sottotitolo di sezione', note: 'sottotitolo' },
  { token: 'lead', sample: 'Paragrafo di apertura, leggermente piu grande del corpo.', note: 'apertura' },
  { token: 'body', sample: 'Testo corrente. La misura resta entro 68 caratteri per riga.', note: 'corpo' },
  { token: 'fine', sample: 'Didascalie, etichette dei bottoni, note legali.', note: 'minuto' },
];

const CITIES = ['Parigi', 'Torino', 'Milano', 'Brescia', 'Versilia', 'Lago di Garda', 'Oltrepò Pavese', 'Pescia'];

export default function DesignSystemPage() {
  return (
    <main className="ds bg-paper text-on-paper">
      {/* ── Palette ─────────────────────────────────────────────── */}
      <Section>
        <h1 className="ds-display text-title">Design system</h1>
        <p className="mt-4 max-w-[60ch] text-lead text-on-paper-muted">
          Due fondi, due accenti, due caratteri. Ogni pagina del sito si costruisce
          con questi pezzi e nient&apos;altro.
        </p>

        <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-rule-paper md:grid-cols-3">
          {SWATCHES.map((s) => (
            <div key={s.name} className="bg-paper p-5">
              <div
                className="h-20 w-full rounded-xl border border-rule-paper"
                style={{ background: s.hex }}
              />
              <p className="mt-4 text-body font-medium">{s.name}</p>
              <p className="ds-numeric text-fine text-on-paper-muted">{s.hex}</p>
              <p className="mt-1 text-fine text-on-paper-muted">{s.note}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Scala tipografica ───────────────────────────────────── */}
      <Section ground="paper-soft">
        <h2 className="ds-display text-title">Scala tipografica</h2>
        <p className="mt-4 max-w-[60ch] text-body text-on-paper-muted">
          Syne porta tutte le voci display, in maiuscolo e con il tracking tirato
          dentro. Geist porta testo e interfaccia al posto di Nunito.
        </p>

        <dl className="mt-12 divide-y divide-rule-paper">
          {SCALE.map((row) => (
            <div key={row.token} className="grid gap-3 py-8 md:grid-cols-[9rem_1fr] md:gap-8">
              <dt className="text-fine text-on-paper-muted">
                <span className="ds-numeric font-medium text-on-paper">{row.token}</span>
                <br />
                {row.note}
              </dt>
              <dd
                className={
                  row.token === 'chapter' || row.token === 'statement' || row.token === 'title'
                    ? `ds-display text-${row.token}`
                    : `text-${row.token}`
                }
              >
                {row.sample}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* ── Bottoni ─────────────────────────────────────────────── */}
      <Section>
        <h2 className="ds-display text-title">Bottoni</h2>
        <p className="mt-4 max-w-[60ch] text-body text-on-paper-muted">
          Una sola forma, la pillola piena. Altezza minima 48px a ogni misura.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button size="lg">Diventa member</Button>
          <Button>Parliamo del tuo brand</Button>
          <Button size="sm">Vedi gli eventi</Button>
          <Button variant="outline">Scopri di più</Button>
          <Button disabled>Sold out</Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-ink p-8 ds-on-ink">
          <ButtonLink href="/design" variant="paper">
            Sul fondo scuro
          </ButtonLink>
          <ButtonLink href="/design" variant="outline" className="text-on-ink">
            Secondario
          </ButtonLink>
        </div>
      </Section>

      {/* ── Capitoli ────────────────────────────────────────────── */}
      <Section bleed width="full" tight>
        <Chapter lines={['Vivo', 'Studio']} accent={[1, 3]} />
      </Section>

      <Section ground="ink" bleed width="full" tight>
        <Chapter lines={['Vivo', 'Club']} accent={[1, 1]} />
      </Section>

      <Section>
        <Statement className="max-w-[20ch]">
          Portiamo il vino a chi non lo beveva, e le cantine a chi non le ascoltava.
        </Statement>
      </Section>

      {/* ── Porte ───────────────────────────────────────────────── */}
      <Section ground="paper-soft">
        <h2 className="ds-display text-title">Porte</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <DoorCard
            href="/design"
            title="Eventi"
            body="Party, lounge e visite in cantina. Prendi il biglietto e vieni."
            cta="Guarda il calendario"
            index={0}
          />
          <DoorCard
            href="/design"
            title="Creator"
            body="Fai contenuti sul vino. Entra nel network e lavora con le cantine."
            cta="Candidati"
            ground="ink"
            index={1}
          />
          <DoorCard
            href="/design"
            title="Cantine"
            body="Raccontare il vino a chi ha vent'anni, con chi lo guarda ogni giorno."
            cta="Parliamone"
            ground="accent"
            index={2}
          />
        </div>
      </Section>

      {/* ── Reel ────────────────────────────────────────────────── */}
      <Section>
        <h2 className="ds-display text-title">Card video</h2>
        <p className="mt-4 max-w-[60ch] text-body text-on-paper-muted">
          Formato verticale 9:16. Il video parte solo quando entra nello schermo e
          si ferma quando esce. Con <span className="ds-numeric">prefers-reduced-motion</span>{' '}
          resta un fermo immagine.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <VideoCard
              key={i}
              priority={i === 0}
              source={{
                src: '/videosito-corto.mp4',
                poster: '/vigna.jpg',
                label: ['Wine Party', 'Wine Lounge', 'Visite', 'Dietro le quinte'][i],
              }}
            />
          ))}
        </div>
      </Section>

      {/* ── Marquee ─────────────────────────────────────────────── */}
      <Section ground="ink" bleed width="full" tight>
        <Marquee>
          {CITIES.map((c) => (
            <span key={c} className="ds-display text-statement whitespace-nowrap">
              {c}
            </span>
          ))}
        </Marquee>
      </Section>

      <Section tight>
        <p className="text-fine text-on-paper-muted">
          Pagina di riferimento interna, esclusa dall&apos;indicizzazione.
        </p>
      </Section>
    </main>
  );
}
