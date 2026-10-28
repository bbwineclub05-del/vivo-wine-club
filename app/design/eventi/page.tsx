import { ClubEvents } from '@/components/ui/ClubEvents';
import { Section } from '@/components/ui/Section';
import type { EventData } from '@/lib/events';

/**
 * Anteprima del calendario, con date finte.
 *
 * Gli eventi veri non sono ancora pubblici, e pubblicarli per vedere
 * come viene una pagina sarebbe il modo peggiore di provarla. Qui ci
 * sono tre mesi di date inventate: servono a guardare i gruppi per
 * mese e la targhetta «Solo soci», niente di piu'.
 */
const FINTI: EventData[] = [
  {
    slug: 'anteprima-1', title: 'Wine Party di prova', type: 'PARTY',
    date: '2026-11-14', month: 'NOV', day: '14', year: '2026', time: '21:00',
    location: 'Milano', locationFull: 'Un locale di Milano, ore 21:00',
    description: '', price: 15, status: 'open', membersOnly: true,
  },
  {
    slug: 'anteprima-2', title: 'Visita in cantina di prova', type: 'WINERY VISIT',
    date: '2026-11-29', month: 'NOV', day: '29', year: '2026', time: '11:00',
    location: 'Franciacorta', locationFull: 'Una cantina in Franciacorta, ore 11:00',
    description: '', price: 40, status: 'open', membersOnly: false,
  },
  {
    slug: 'anteprima-3', title: 'Cena alla Maison di prova', type: 'COLLAB',
    date: '2026-12-05', month: 'DEC', day: '05', year: '2026', time: '20:00',
    location: 'Parigi', locationFull: 'VIVO Maison, Parigi, ore 20:00',
    description: '', price: 0, status: 'soon', membersOnly: true,
  },
  {
    slug: 'anteprima-4', title: 'Wine Lounge di prova', type: 'LOUNGE',
    date: '2027-01-17', month: 'JAN', day: '17', year: '2027', time: '19:00',
    location: 'Torino', locationFull: 'Un wine bar di Torino, ore 19:00',
    description: '', price: 20, status: 'open', membersOnly: false,
  },
];

export default function AnteprimaEventi() {
  return (
    <main className="ds bg-paper text-on-paper">
      <Section>
        <h1 className="ds-display text-title">Calendario, anteprima</h1>
        <p className="mt-3 max-w-[52ch] text-body text-on-paper-muted">
          Date finte, per guardare i mesi e la targhetta «Solo soci».
        </p>
        <div className="mt-10">
          <ClubEvents events={FINTI} />
        </div>
      </Section>
    </main>
  );
}
