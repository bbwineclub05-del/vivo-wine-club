export type PartnerCategory = 'cantina' | 'location';

export interface Partner {
  slug:         string;
  name:         string;
  category:     PartnerCategory;
  logo?:        string;
  subtitle?:    string;
  shortDesc:    string;
  address?:     string;
  phone?:       string;
  email?:       string;
  externalUrl?: string;
  quote?:       string;
  quoteAuthor?: string;
}

export const PARTNERS: Partner[] = [
  {
    slug:        'ca-del-bosco',
    name:        "Ca' del Bosco",
    category:    'cantina',
    logo:        '/sponsors/ca-del-bosco.png',
    shortDesc:   'Partner storico di Vivo Wine Club.',
    address:     'Via Albano Zanella, 13, 25030 Erbusco BS, Italia',
    phone:       '+39 030 7766111',
    email:       'cadelbosco@cadelbosco.com',
    externalUrl: 'https://www.cadelbosco.com/',
  },
  {
    slug:        'bertani',
    name:        'Bertani',
    category:    'cantina',
    logo:        '/wineries/bertani logo .png',
    shortDesc:   'Partner storico di Vivo Wine Club.',
    address:     'Via Asiago, 1, 37023 Grezzana VR, Italia',
    phone:       '+39 045 8658444',
    email:       'bertani@bertani.net',
    externalUrl: 'https://www.bertani.net/',
  },
  {
    slug:        'sandrone',
    name:        'Sandrone',
    category:    'cantina',
    logo:        '/sponsors/sandrone.avif',
    shortDesc:   'Partner storico di Vivo Wine Club.',
    address:     'Via Pugnane, 4, 12060 Barolo CN, Italia',
    phone:       '+39 0173 560023',
    email:       'info@sandroneluciano.com',
    externalUrl: 'https://sandroneluciano.com/',
  },
  {
    slug:        'tenuta-del-buonamico',
    name:        'Tenuta del Buonamico',
    category:    'cantina',
    logo:        '/sponsors/Tenuta del buonamico.jpg',
    shortDesc:   'Partner storico di Vivo Wine Club.',
    address:     'Via Provinciale di Montecarlo, 43, 55015 Montecarlo LU, Italia',
    phone:       '+39 0583 22038',
    email:       'buonamico@buonamico.com',
    externalUrl: 'https://www.buonamico.it/',
  },
  {
    slug:      'utopia',
    name:      'Utopia',
    category:  'location',
    logo:      '/sponsors/utopia.png',
    subtitle:  'Cocktail Bar',
    shortDesc: 'UTOPIA is an intimate cocktail bar set within a historic vaulted cellar in the 1st arrondissement of Paris. Known for its creative mixology and energetic atmosphere, it serves as a popular nightlife destination near the Louvre and Les Halles.',
    address:   "60 Rue de l'Arbre Sec, 75001 Paris, France",
  },
  {
    slug:        'al-bicer-2',
    name:        'Al Bicèr 2',
    category:    'location',
    logo:        '/sponsors/albicer.png',
    shortDesc:   'Partner storico di Vivo Wine Club.',
    address:     'Borgo S. Vitale, 3, 43121 Parma PR, Italia',
    externalUrl: 'https://www.instagram.com/albicer2/',
  },
];

export function getPartnerBySlug(slug: string): Partner | undefined {
  return PARTNERS.find((p) => p.slug === slug);
}
