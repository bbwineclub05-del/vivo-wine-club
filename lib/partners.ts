import type { Locale } from '@/i18n/request';

export type PartnerCategory = 'cantina' | 'location';

/** User-facing prose that must exist in all three site languages. */
export type LocalizedText = Record<Locale, string>;

export interface Partner {
  slug:         string;
  name:         string;
  category:     PartnerCategory;
  logo?:        string;
  subtitle?:    LocalizedText;
  shortDesc:    LocalizedText;
  address?:     string;
  phone?:       string;
  email?:       string;
  externalUrl?: string;
  quote?:       LocalizedText;
  quoteAuthor?: string;
}

/** Pick the right-language string for the given locale, falling back to English. */
export function localized(text: LocalizedText, locale: string): string {
  return text[locale as Locale] ?? text.en;
}

export const PARTNERS: Partner[] = [
  {
    slug:     'ca-del-bosco',
    name:     "Ca' del Bosco",
    category: 'cantina',
    logo:     '/sponsors/ca-del-bosco.png',
    shortDesc: {
      it: "Fondata nel 1968 a Erbusco, Ca' del Bosco è una delle cantine che ha scritto la storia della Franciacorta, guidata per oltre cinquant'anni dalla visione di Maurizio Zanella. Le sue bollicine, tra cui l'iconica Cuvée Annamaria Clementi, sono considerate tra le espressioni più raffinate del metodo classico italiano.",
      en: "Founded in 1968 in Erbusco, Ca' del Bosco is one of the estates that wrote the history of Franciacorta, shaped for over fifty years by the vision of Maurizio Zanella. Its sparkling wines, including the iconic Cuvée Annamaria Clementi, are regarded as some of the finest expressions of Italy's classic method.",
      fr: "Fondée en 1968 à Erbusco, Ca' del Bosco est l'une des maisons qui ont écrit l'histoire du Franciacorta, façonnée depuis plus de cinquante ans par la vision de Maurizio Zanella. Ses bulles, dont l'emblématique Cuvée Annamaria Clementi, comptent parmi les expressions les plus raffinées de la méthode classique italienne.",
    },
    address:     'Via Albano Zanella, 13, 25030 Erbusco BS, Italia',
    phone:       '+39 030 7766111',
    email:       'cadelbosco@cadelbosco.com',
    externalUrl: 'https://www.cadelbosco.com/',
  },
  {
    slug:     'bertani',
    name:     'Bertani',
    category: 'cantina',
    logo:     '/wineries/bertani logo .png',
    shortDesc: {
      it: "Fondata nel 1857 dai fratelli Giovan Battista e Gaetano Bertani, è una delle cantine più antiche e prestigiose della Valpolicella. Pionieri dell'imbottigliamento in tenuta e tra gli artefici dell'Amarone moderno, i Bertani custodiscono da oltre 160 anni uno stile inconfondibile, fatto di eleganza e straordinaria capacità di invecchiamento.",
      en: 'Founded in 1857 by brothers Giovan Battista and Gaetano Bertani, this is one of the oldest and most prestigious wineries in Valpolicella. Pioneers of estate bottling and among the founding forces of modern Amarone, the Bertani family has upheld a distinctive style for over 160 years, one of elegance and remarkable ageing potential.',
      fr: "Fondée en 1857 par les frères Giovan Battista et Gaetano Bertani, c'est l'une des maisons les plus anciennes et prestigieuses de la Valpolicella. Pionniers de la mise en bouteille à la propriété et parmi les artisans de l'Amarone moderne, les Bertani perpétuent depuis plus de 160 ans un style unique, fait d'élégance et d'un remarquable potentiel de garde.",
    },
    address:     'Via Asiago, 1, 37023 Grezzana VR, Italia',
    phone:       '+39 045 8658444',
    email:       'bertani@bertani.net',
    externalUrl: 'https://www.bertani.net/',
  },
  {
    slug:     'sandrone',
    name:     'Sandrone',
    category: 'cantina',
    logo:     '/sponsors/sandrone.avif',
    shortDesc: {
      it: "Nata nel 1978 dalla determinazione di Luciano Sandrone, che investì i risparmi di una vita per acquistare il suo primo vigneto sulla collina di Cannubi, l'azienda è oggi un punto di riferimento del Barolo contemporaneo. Uno stile capace di coniugare rispetto della tradizione e visione moderna, che ha portato il nome di Barolo nel mondo.",
      en: 'Born in 1978 out of the determination of Luciano Sandrone, who invested a lifetime of savings to buy his first vineyard on the Cannubi hill, the estate is today a benchmark of contemporary Barolo. A style that blends respect for tradition with a modern vision, carrying the name of Barolo around the world.',
      fr: "Née en 1978 de la détermination de Luciano Sandrone, qui investit les économies de toute une vie pour acheter sa première parcelle sur la colline de Cannubi, la maison est aujourd'hui une référence du Barolo contemporain. Un style qui allie respect de la tradition et vision moderne, ayant porté le nom de Barolo dans le monde entier.",
    },
    address:     'Via Pugnane, 4, 12060 Barolo CN, Italia',
    phone:       '+39 0173 560023',
    email:       'info@sandroneluciano.com',
    externalUrl: 'https://sandroneluciano.com/',
  },
  {
    slug:     'tenuta-del-buonamico',
    name:     'Tenuta del Buonamico',
    category: 'cantina',
    logo:     '/sponsors/Tenuta del buonamico.jpg',
    shortDesc: {
      it: "Nata nel 1964 a Montecarlo di Lucca, deve il proprio nome, 'buon amico', al desiderio dei fondatori di offrire vini genuini e conviviali. Oggi, sotto la guida della famiglia Fontana, è la realtà più importante della piccola e preziosa DOC Montecarlo, custode di vitigni storici toscani e internazionali.",
      en: "Born in 1964 in Montecarlo di Lucca, it owes its name, meaning 'good friend,' to its founders' wish to offer genuine, convivial wines. Today, under the Fontana family, it is the leading estate of the small and precious Montecarlo DOC, custodian of historic Tuscan and international grape varieties.",
      fr: "Née en 1964 à Montecarlo di Lucca, elle doit son nom, « bon ami », à la volonté de ses fondateurs d'offrir des vins authentiques et conviviaux. Aujourd'hui, sous la direction de la famille Fontana, elle est le domaine le plus important de la petite et précieuse appellation Montecarlo DOC, gardienne de cépages toscans et internationaux historiques.",
    },
    address:     'Via Provinciale di Montecarlo, 43, 55015 Montecarlo LU, Italia',
    phone:       '+39 0583 22038',
    email:       'buonamico@buonamico.com',
    externalUrl: 'https://www.buonamico.it/',
  },
  {
    slug:     'utopia',
    name:     'Utopia',
    category: 'location',
    logo:     '/sponsors/utopia.png',
    subtitle: {
      it: 'Cocktail Bar',
      en: 'Cocktail Bar',
      fr: 'Bar à Cocktails',
    },
    shortDesc: {
      en: 'UTOPIA is an intimate cocktail bar set within a historic vaulted cellar in the 1st arrondissement of Paris. Known for its creative mixology and energetic atmosphere, it serves as a popular nightlife destination near the Louvre and Les Halles.',
      it: "UTOPIA è un intimo cocktail bar che occupa un'antica cantina a volte nel 1° arrondissement di Parigi. Conosciuto per la sua mixology creativa e l'atmosfera energica, è una delle mete più amate della vita notturna vicino al Louvre e a Les Halles.",
      fr: 'UTOPIA est un bar à cocktails intimiste installé dans une cave voûtée historique du 1er arrondissement de Paris. Réputé pour sa mixologie créative et son atmosphère électrique, il est devenu une adresse incontournable de la vie nocturne près du Louvre et des Halles.',
    },
    address: "60 Rue de l'Arbre Sec, 75001 Paris, France",
  },
  {
    slug:     'al-bicer-2',
    name:     'Al Bicèr 2',
    category: 'location',
    logo:     '/sponsors/albicer.png',
    shortDesc: {
      it: "Nel cuore di Parma, Al Bicèr 2 è il punto di riferimento per chi cerca un calice scelto con cura e un aperitivo fatto bene. Un ambiente conviviale e informale, fedele allo spirito più autentico dell'enogastronomia emiliana.",
      en: 'In the heart of Parma, Al Bicèr 2 is the go-to spot for a carefully chosen glass of wine and a proper aperitivo. A relaxed, convivial setting true to the authentic spirit of Emilian food and wine culture.',
      fr: "Au cœur de Parme, Al Bicèr 2 est l'adresse incontournable pour un verre choisi avec soin et un véritable apéritif. Une ambiance conviviale et décontractée, fidèle à l'esprit authentique de l'art de vivre émilien.",
    },
    address:     'Borgo S. Vitale, 3, 43121 Parma PR, Italia',
    externalUrl: 'https://www.instagram.com/albicer2/',
  },
  {
    slug:     'canto-del-gallo',
    name:     'Il Canto del Gallo',
    category: 'location',
    logo:     '/sponsors/canto-del-gallo.jpg',
    subtitle: {
      it: 'Wine Bar & Gastronomia',
      en: 'Wine Bar & Gastronomia',
      fr: 'Bar à Vin & Épicerie Fine',
    },
    shortDesc: {
      it: "Nato dall'esperienza della storica Gastronomia Gallo di Torino, aperta nel 1956 da Giulio Gallo, Il Canto del Gallo è il wine bar che i figli Fabio (sommelier e per 28 anni presidente AIS Piemonte) e Stefano Gallo hanno aperto nel quartiere Gran Madre. Oltre 500 etichette selezionate e una cucina che porta in tavola la stessa qualità di sempre.",
      en: 'Born from the experience of Turin\'s historic Gastronomia Gallo, opened in 1956 by Giulio Gallo, Il Canto del Gallo is the wine bar that sons Fabio (a sommelier and, for 28 years, president of AIS Piedmont) and Stefano Gallo opened in the Gran Madre neighbourhood. Over 500 selected labels and a kitchen that brings the same quality to the table.',
      fr: "Né de l'expérience de la célèbre Gastronomia Gallo de Turin, ouverte en 1956 par Giulio Gallo, Il Canto del Gallo est le bar à vin que ses fils Fabio (sommelier et, pendant 28 ans, président de l'AIS Piémont) et Stefano Gallo ont ouvert dans le quartier Gran Madre. Plus de 500 étiquettes sélectionnées et une cuisine qui perpétue la même exigence de qualité.",
    },
    address:     'Via Umberto Cosmo, 4, 10131 Torino TO, Italia',
    phone:       '+39 340 7911024',
    email:       'info@ilcantodelgallowinebar.it',
    externalUrl: 'https://ilcantodelgallowinebar.it/',
  },
];

export function getPartnerBySlug(slug: string): Partner | undefined {
  return PARTNERS.find((p) => p.slug === slug);
}
