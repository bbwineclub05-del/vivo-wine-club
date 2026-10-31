import { notFound } from 'next/navigation';
import { Caricamento } from '@/components/ui/Caricamento';
import { Section } from '@/components/ui/Section';

/** Pagina di servizio: il logo che si riempie, nelle misure e sui due fondi. */
export default function ProvaCaricamento() {
  if (process.env.NODE_ENV !== 'development') notFound();

  return (
    <main className="ds bg-paper text-on-paper">
      <Section>
        <h1 className="ds-display text-title">Attesa</h1>

        <div className="mt-12 flex flex-wrap items-end gap-14">
          <Caricamento dimensione={64} />
          <Caricamento dimensione={96} etichetta="Un momento" />
          <Caricamento dimensione={140} />
          <div className="text-accent"><Caricamento dimensione={96} /></div>
        </div>

        <div className="ds-on-ink mt-14 flex flex-wrap items-end gap-14 rounded-2xl bg-ink px-10 py-12 text-on-ink">
          <Caricamento dimensione={64} />
          <Caricamento dimensione={96} etichetta="Un momento" />
          <Caricamento dimensione={140} />
        </div>
      </Section>
    </main>
  );
}
