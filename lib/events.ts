export type EventStatus = 'open' | 'soldout' | 'soon' | 'completed';

/* ── DB row type (Supabase `events` table) ── */
export interface DbEvent {
  id: string;
  slug: string;
  title: string;
  type: string;
  date: string;              // ISO: "2026-05-12"
  time: string | null;       // "19:00"
  location: string;          // short
  location_full: string;     // full address
  description: string;
  price: number;             // EUR, 0 = free
  capacity: number | null;
  status: EventStatus;
  published: boolean;
  title_strikethrough: boolean;
  image_url: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at?: string;
}

/** Convert a DB row to the EventData shape used by checkout / PDF / emails */
export function dbEventToEventData(e: DbEvent): EventData {
  const d = new Date(e.date + 'T12:00:00Z'); // noon UTC avoids DST edge cases
  return {
    slug:              e.slug,
    title:             e.title,
    type:              e.type,
    month:             d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
    day:               String(d.getUTCDate()).padStart(2, '0'),
    year:              String(d.getUTCFullYear()),
    location:          e.location,
    locationFull:      e.location_full,
    description:       e.description,
    price:             e.price,
    status:            e.status,
    titleStrikethrough: e.title_strikethrough,
  };
}

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
  titleStrikethrough?: boolean;
}

export const EVENTS: EventData[] = [
  {
    slug: 'winery-visit-speri-may-2026',
    title: 'Wine Visit · Speri',
    type: 'WINERY VISIT',
    month: 'MAY',
    day: '12',
    year: '2026',
    location: 'Valpolicella, Italy',
    locationFull: 'Speri, Pedemonte, Valpolicella — ore 11:00',
    description:
      'A private morning visit to Speri, one of the historic estates of Valpolicella. Guided cellar tour and tasting of their iconic Amarone and Ripasso, surrounded by the family heritage that has defined this appellation for generations.',
    price: 0,
    status: 'open',
  },
  {
    slug: 'winery-visit-bertani-may-2026',
    title: 'Wine Visit · Bertani',
    type: 'WINERY VISIT',
    month: 'MAY',
    day: '12',
    year: '2026',
    location: 'Valpolicella, Italy',
    locationFull: 'Bertani, Grezzana, Valpolicella — ore 15:00',
    description:
      'An afternoon at Bertani, one of the oldest and most storied producers in Valpolicella. A behind-the-scenes look at their legendary Amarone, with a tasting guided by the estate team.',
    price: 0,
    status: 'open',
  },
  {
    slug: 'wine-party-mare-may-2026',
    title: 'Beach Wine Party',
    type: 'PARTY',
    month: 'MAY',
    day: '31',
    year: '2026',
    location: 'Forte dei Marmi, Tuscany',
    locationFull: 'Spiaggia, Forte dei Marmi',
    description:
      'Our first beach edition. Sun, sea breeze, curated bottles and a crowd that lives for wine. The perfect Saturday evening on the Versilian coast.',
    price: 10,
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
    titleStrikethrough: true,
  },
  {
    slug: 'winery-visit-quintarelli-may-2026',
    title: 'Winery Visit · Quintarelli',
    type: 'WINERY VISIT',
    month: 'MAY',
    day: '9',
    year: '2026',
    location: 'Negrar, Valpolicella',
    locationFull: 'Giuseppe Quintarelli, Negrar, Valpolicella',
    description:
      'An exclusive visit to one of Italy\'s most legendary estates. Private cellar access, vertical tasting and a rare glimpse into the Quintarelli method.',
    price: 30,
    status: 'open',
    titleStrikethrough: true,
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
    titleStrikethrough: true,
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
    titleStrikethrough: true,
  },
  {
    slug: 'wine-weekend-forte-dei-marmi-may-2026',
    title: 'Wine Weekend · Forte dei Marmi',
    type: 'APERITIF',
    month: 'MAY',
    day: '30',
    year: '2026',
    location: 'Forte dei Marmi, Tuscany',
    locationFull: 'Forte dei Marmi, Tuscany',
    description:
      'A summer Sunday on the Versilian coast — curated wines, sea breeze and good company.',
    price: 0,
    status: 'open',
    titleStrikethrough: true,
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
