export type EventStatus = 'open' | 'soon' | 'completed';

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
    slug: 'wine-party-milano-apr-2026',
    title: 'Wine Party Milano',
    type: 'PARTY',
    month: 'APR',
    day: '26',
    year: '2026',
    location: 'Milan, Italy',
    locationFull: 'Brera district, Milan',
    description:
      'Our iconic wine party format — curated bottles from small producers, music, and a crowd that loves wine as much as you do. No dress code, just good taste.',
    price: 25,
    status: 'open',
  },
  {
    slug: 'barolo-vertical-tasting',
    title: 'Barolo Vertical Tasting',
    type: 'TASTING',
    month: 'MAY',
    day: '15',
    year: '2026',
    location: 'Milan, Italy',
    locationFull: 'Private wine cellar, Brera, Milan',
    description:
      'An exclusive vertical tasting across five exceptional Barolo vintages, guided by our resident sommelier. From the austere 2013 to the luminous 2019 — a journey through one of Italy\'s greatest wines.',
    price: 95,
    status: 'open',
  },
  {
    slug: 'tuscany-winery-tour',
    title: 'Tuscany Winery Tour',
    type: 'TOUR · 3 DAYS',
    month: 'JUN',
    day: '6',
    year: '2026',
    location: 'Montalcino, Tuscany',
    locationFull: 'Montalcino & Montepulciano, Tuscany',
    description:
      'Three days among the vineyards of Brunello di Montalcino — private cellar tours, barrel tastings with the winemakers, and a farewell dinner under the Tuscan sky. Transport and accommodation included.',
    price: 450,
    status: 'open',
  },
  {
    slug: 'harvest-experience-langhe',
    title: 'Harvest Experience',
    type: 'EXPERIENCE · 3 DAYS',
    month: 'SEP',
    day: '15',
    year: '2026',
    location: 'Langhe, Piedmont',
    locationFull: 'Langhe hills, Piedmont',
    description:
      'Join the grape harvest at one of Piedmont\'s most revered estates — pick Nebbiolo at dawn, taste wine straight from the barrel, and live the rhythm of wine country. An experience for life.',
    price: 680,
    status: 'soon',
  },
  {
    slug: 'bordeaux-masterclass',
    title: 'Bordeaux Masterclass',
    type: 'MASTERCLASS',
    month: 'OCT',
    day: '10',
    year: '2026',
    location: 'Paris, France',
    locationFull: 'ESCP Campus, Paris',
    description:
      'An in-depth exploration of the great châteaux of Bordeaux — left bank vs right bank, the 1855 classification system, and a blind tasting of six Grands Crus. Hosted at our home base in Paris.',
    price: 120,
    status: 'soon',
  },
];

export function getEventBySlug(slug: string): EventData | undefined {
  return EVENTS.find((e) => e.slug === slug);
}
