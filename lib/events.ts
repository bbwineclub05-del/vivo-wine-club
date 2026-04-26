export type EventStatus = 'open' | 'soldout' | 'soon' | 'completed';

export interface EventData {
  slug: string;
  title: string;
  type: string;
  month: string;
  day: string;
  year: string;
  location: string;
  locationFull: string;
  description: string;
  price: number;
  status: EventStatus;
}

export const EVENTS: EventData[] = [
  {
    slug: 'wine-aperitif-torino-apr-2026',
    title: 'Wine Aperitif',
    type: 'APERITIF',
    month: 'APR',
    day: '24',
    year: '2026',
    location: 'Il Canto del Gallo, Torino',
    locationFull: 'Il Canto del Gallo, Via Cosmo 4, Torino',
    description:
      'An intimate wine aperitif in one of Turin\'s finest wine bars. Curated pours, small bites and good company — the Vivo format at its purest.',
    price: 0,
    status: 'open',
  },
  {
    slug: 'winery-visit-ca-del-bosco-apr-2026',
    title: 'Winery Visit · Ca\' del Bosco',
    type: 'WINERY VISIT',
    month: 'APR',
    day: '27',
    year: '2026',
    location: 'Franciacorta, Italy',
    locationFull: 'Ca\' del Bosco, Erbusco, Franciacorta',
    description:
      'A private visit to Ca\' del Bosco, one of Italy\'s most iconic sparkling wine producers. Guided cellar tour, barrel tasting and a masterclass on the Franciacorta method.',
    price: 0,
    status: 'soldout',
  },
  {
    slug: 'winery-visit-berlucchi-may-2026',
    title: 'Winery Visit · Berlucchi',
    type: 'WINERY VISIT',
    month: 'MAY',
    day: '15',
    year: '2026',
    location: 'Franciacorta, Italy',
    locationFull: 'Berlucchi, Borgonato di Cortefranca, Franciacorta',
    description:
      'Visit the historic estate of Guido Berlucchi, the pioneer who created Franciacorta as we know it. A rare behind-the-scenes access to the cellars, vineyards and archives.',
    price: 0,
    status: 'soldout',
  },
  {
    slug: 'wine-party-franciacorta-may-2026',
    title: 'Wine Party',
    type: 'PARTY',
    month: 'MAY',
    day: '15',
    year: '2026',
    location: 'Boccadoro, Franciacorta',
    locationFull: 'Boccadoro, Franciacorta',
    description:
      'Our signature wine party format comes to Franciacorta. Great local bottles, music and a crowd that lives for wine. One night in the heart of Italy\'s sparkling wine country.',
    price: 0,
    status: 'open',
  },
  {
    slug: 'wine-aperitif-alata-jun-2026',
    title: 'Wine Aperitif · Vivo x Alata Investment Club',
    type: 'APERITIF · COLLAB',
    month: 'JUN',
    day: '4',
    year: '2026',
    location: 'Cantina Bottenago, Franciacorta',
    locationFull: 'Cantina Bottenago, Franciacorta',
    description:
      'A special collaboration between Vivo Wine Club and Alata Investment Club. Wine, conversation and ideas — at a private cantina in Franciacorta.',
    price: 0,
    status: 'open',
  },
];

export function getEventBySlug(slug: string): EventData | undefined {
  return EVENTS.find((e) => e.slug === slug);
}
