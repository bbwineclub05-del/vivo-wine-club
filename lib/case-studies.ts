/**
 * I casi studio dello Studio, nelle tre lingue del club.
 *
 * Un caso studio e' una storia fatta di numeri veri: quelli qui sotto
 * sono gli stessi mandati a Mathilde Savoye nel bilancio della
 * collaborazione, non arrotondati per fare scena. Se un numero cambia
 * la' deve cambiare qui, e viceversa.
 *
 * Le foto sono quelle gia' caricate in `public`: si sostituiscono
 * cambiando un indirizzo, senza toccare il resto.
 */

export type CaseLocale = 'it' | 'en' | 'fr';

export interface CaseNumero {
  valore: string;
  etichetta: string;
  nota?: string;
}

export interface CaseTappa {
  occhiello?: string;
  titolo: string;
  corpo: string;
  numeri?: CaseNumero[];
  /** Un'immagine accanto alla tappa, e il filmato se esiste. Senza, la tappa e' solo testo. */
  media?: { poster: string; src?: string };
  /** Verticale o orizzontale: decide la forma della scheda. */
  verso?: 'alto' | 'largo';
}

export interface CaseStudy {
  slug: string;
  marchio: string;
  occhiello: string;
  titolo: string;
  sottotitolo: string;
  sintesi: string;
  /** I quattro numeri che si leggono per primi. */
  numeri: CaseNumero[];
  tappe: CaseTappa[];
  lezioniTitolo: string;
  lezioni: { titolo: string; corpo: string }[];
  fonte: string;
  ctaTitolo: string;
  ctaCorpo: string;
  cta: string;
}

const MEDIA = {
  // Dove c'e' anche l'mp4 la scheda si muove da sola; dove no, resta
  // una fotografia. Alternate di proposito: sei clip di fila sulla
  // stessa pagina sono rumore, non ritmo.
  serata:   { poster: '/home/orizzontali/utopia-1610.jpg', src: '/home/orizzontali/utopia-1610.mp4' },
  brindisi: { poster: '/events/wp2.jpg' },
  sala:     { poster: '/home/orizzontali/serata-1015.jpg', src: '/home/orizzontali/serata-1015.mp4' },
  gente:    { poster: '/home/verticali/serata-1021.jpg',   src: '/home/verticali/serata-1021.mp4' },
  tavolo:   { poster: '/events/wine-party3.jpg' },
} as const;

const SAVOYE: Record<CaseLocale, CaseStudy> = {
  it: {
    slug: 'mathilde-savoye',
    marchio: 'Champagne Mathilde Savoye',
    occhiello: 'Caso studio',
    titolo: 'Champagne Mathilde Savoye',
    sottotitolo: 'VIVO Wine Party · Utopia, Parigi · 16 ottobre 2026',
    sintesi:
      'Una maison di champagne voleva farsi conoscere da un pubblico giovane che lo champagne ancora non lo beve. Abbiamo riempito un locale a Parigi di centocinquanta persone, e gliel’abbiamo messo in mano.',
    numeri: [
      { valore: '150', etichetta: 'invitati', nota: 'circa, fra i 20 e i 25 anni' },
      { valore: '24', etichetta: 'bottiglie', nota: 'circa 168 calici serviti' },
      { valore: '10 493', etichetta: 'visualizzazioni', nota: 'carosello e reel, senza pubblicità' },
      { valore: '57 %', etichetta: 'non seguiva VIVO', nota: 'pubblico nuovo, non il nostro' },
    ],
    tappe: [
      {
        occhiello: '16 ottobre, sera',
        titolo: 'Una sala piena, a Parigi',
        corpo:
          'Utopia, Parigi. Il 75 % italiani, il 20 % francesi, il 58 % donne. Tutti fra i venti e i venticinque anni: l’età in cui si decide cosa si berrà per i trent’anni successivi.',
        numeri: [
          { valore: '75 %', etichetta: 'italiani' },
          { valore: '58 %', etichetta: 'donne' },
        ],
        media: MEDIA.serata,
        verso: 'largo',
      },
      {
        occhiello: 'Nel bicchiere',
        titolo: 'In mano, non in vetrina',
        corpo:
          'Nessuno ha guardato lo champagne da lontano. Ogni invitato ha avuto Mathilde Savoye nel proprio bicchiere, l’ha assaggiato e ne ha parlato con chi aveva accanto.',
        numeri: [
          { valore: '24', etichetta: 'bottiglie aperte' },
          { valore: '168', etichetta: 'calici serviti' },
        ],
        media: MEDIA.brindisi,
        verso: 'largo',
      },
      {
        occhiello: 'Carosello, 20 ottobre',
        titolo: 'Il racconto della serata',
        corpo:
          'Pubblicato insieme a @champagnesavoye. Nove interazioni ogni cento account raggiunti: per un contenuto di marca è un numero che non si vede spesso.',
        numeri: [
          { valore: '5 812', etichetta: 'visualizzazioni' },
          { valore: '9,1 %', etichetta: 'tasso di interazione' },
          { valore: '74 %', etichetta: 'ha fra 18 e 34 anni' },
        ],
        media: MEDIA.sala,
        verso: 'largo',
      },
      {
        occhiello: 'Reel, 23 ottobre',
        titolo: 'Il reel è andato più lontano',
        corpo:
          'Il 45 % di account in più del carosello, e diciassette persone lo hanno rimesso sul proprio profilo.',
        numeri: [
          { valore: '4 681', etichetta: 'visualizzazioni' },
          { valore: '2 789', etichetta: 'account raggiunti' },
          { valore: '92 %', etichetta: 'ha fra 18 e 34 anni' },
        ],
        media: MEDIA.gente,
        verso: 'alto',
      },
      {
        occhiello: 'Due mercati',
        titolo: 'Italia e Francia, nella stessa serata',
        corpo:
          'Circa 2 950 account raggiunti in Italia e 1 080 in Francia. Per una maison francese, il pubblico italiano under 30 era un mercato che non aveva ancora toccato.',
        numeri: [
          { valore: '2 950', etichetta: 'account in Italia' },
          { valore: '1 080', etichetta: 'account in Francia' },
        ],
        media: MEDIA.tavolo,
        verso: 'largo',
      },
    ],
    lezioniTitolo: 'Cosa ci ha insegnato',
    lezioni: [
      {
        titolo: 'Le persone fanno fermare il pollice, la bottiglia no',
        corpo:
          'Nel carosello la foto di un’invitata con la bottiglia in mano ha preso 68 interazioni. La foto della bottiglia da sola, 6.',
      },
      {
        titolo: 'Firmare insieme moltiplica',
        corpo:
          'Il contenuto pubblicato in collaborazione con il profilo della maison ha raggiunto la Francia quattro volte di più.',
      },
      {
        titolo: 'Un calice vale più di uno scroll',
        corpo:
          'Una serata così, organizzata da zero, costa fra i 2 500 e i 5 000 euro. Il mercato valuta un contatto dal vivo circa duecento volte un’impressione online. Qui ne sono arrivate 10 493 in più, senza un euro di pubblicità.',
      },
    ],
    fonte:
      'Invitati: lista VIVO Wine Club. Dati social: Instagram Insights al 26 ottobre 2026. Valore di mercato: Street Teams Co, EventTrack.',
    ctaTitolo: 'La prossima serata la facciamo con voi?',
    ctaCorpo: 'Raccontateci il marchio e a chi volete farlo assaggiare. Rispondiamo noi, non un modulo.',
    cta: 'Parliamone',
  },

  en: {
    slug: 'mathilde-savoye',
    marchio: 'Champagne Mathilde Savoye',
    occhiello: 'Case study',
    titolo: 'Champagne Mathilde Savoye',
    sottotitolo: 'VIVO Wine Party · Utopia, Paris · 16 October 2026',
    sintesi:
      'A champagne house wanted to be known by a young crowd that does not drink champagne yet. We filled a room in Paris with a hundred and fifty of them, and put it in their hands.',
    numeri: [
      { valore: '150', etichetta: 'guests', nota: 'roughly, aged 20 to 25' },
      { valore: '24', etichetta: 'bottles', nota: 'about 168 glasses poured' },
      { valore: '10,493', etichetta: 'views', nota: 'carousel and reel, no ad spend' },
      { valore: '57%', etichetta: 'did not follow VIVO', nota: 'a new crowd, not ours' },
    ],
    tappe: [
      {
        occhiello: '16 October, evening',
        titolo: 'A full room, in Paris',
        corpo:
          'Utopia, Paris. 75% Italian, 20% French, 58% women. All between twenty and twenty-five: the age when you decide what you will drink for the next thirty years.',
        numeri: [
          { valore: '75%', etichetta: 'Italian' },
          { valore: '58%', etichetta: 'women' },
        ],
        media: MEDIA.serata,
        verso: 'largo',
      },
      {
        occhiello: 'In the glass',
        titolo: 'In hand, not on display',
        corpo:
          'Nobody looked at the champagne from a distance. Every guest had Mathilde Savoye in their own glass, tasted it and talked about it with whoever was next to them.',
        numeri: [
          { valore: '24', etichetta: 'bottles opened' },
          { valore: '168', etichetta: 'glasses poured' },
        ],
        media: MEDIA.brindisi,
        verso: 'largo',
      },
      {
        occhiello: 'Carousel, 20 October',
        titolo: 'The night, told',
        corpo:
          'Posted together with @champagnesavoye. Nine interactions for every hundred accounts reached: for branded content, that is not a number you see often.',
        numeri: [
          { valore: '5,812', etichetta: 'views' },
          { valore: '9.1%', etichetta: 'interaction rate' },
          { valore: '74%', etichetta: 'aged 18 to 34' },
        ],
        media: MEDIA.sala,
        verso: 'largo',
      },
      {
        occhiello: 'Reel, 23 October',
        titolo: 'The reel went furthest',
        corpo:
          '45% more accounts than the carousel, and seventeen people put it back on their own profile.',
        numeri: [
          { valore: '4,681', etichetta: 'views' },
          { valore: '2,789', etichetta: 'accounts reached' },
          { valore: '92%', etichetta: 'aged 18 to 34' },
        ],
        media: MEDIA.gente,
        verso: 'alto',
      },
      {
        occhiello: 'Two markets',
        titolo: 'Italy and France, in one night',
        corpo:
          'Around 2,950 accounts reached in Italy and 1,080 in France. For a French house, the Italian under-30 crowd was a market it had not touched yet.',
        numeri: [
          { valore: '2,950', etichetta: 'accounts in Italy' },
          { valore: '1,080', etichetta: 'accounts in France' },
        ],
        media: MEDIA.tavolo,
        verso: 'largo',
      },
    ],
    lezioniTitolo: 'What it taught us',
    lezioni: [
      {
        titolo: 'People stop the thumb, bottles do not',
        corpo:
          'In the carousel, the photo of a guest holding the bottle took 68 interactions. The photo of the bottle alone took 6.',
      },
      {
        titolo: 'Co-signing multiplies',
        corpo:
          'The post published together with the house’s own profile reached France four times as much.',
      },
      {
        titolo: 'A glass beats a scroll',
        corpo:
          'A night like this, built from scratch, costs between €2,500 and €5,000. The market values one contact in person at roughly two hundred times one impression online. Here 10,493 of those came on top, with no ad spend at all.',
      },
    ],
    fonte:
      'Guests: VIVO Wine Club list. Social data: Instagram Insights, 26 October 2026. Market value: Street Teams Co, EventTrack.',
    ctaTitolo: 'Shall we do the next one with you?',
    ctaCorpo: 'Tell us about the brand and who you want to pour it for. A person answers, not a form.',
    cta: 'Let’s talk',
  },

  fr: {
    slug: 'mathilde-savoye',
    marchio: 'Champagne Mathilde Savoye',
    occhiello: 'Étude de cas',
    titolo: 'Champagne Mathilde Savoye',
    sottotitolo: 'VIVO Wine Party · Utopia, Paris · 16 octobre 2026',
    sintesi:
      'Une maison de champagne voulait se faire connaître d’un public jeune qui ne boit pas encore de champagne. Nous avons rempli un lieu à Paris de cent cinquante d’entre eux, et nous le leur avons mis en main.',
    numeri: [
      { valore: '150', etichetta: 'invités', nota: 'environ, de 20 à 25 ans' },
      { valore: '24', etichetta: 'bouteilles', nota: 'environ 168 coupes servies' },
      { valore: '10 493', etichetta: 'vues', nota: 'carrousel et reel, sans publicité' },
      { valore: '57 %', etichetta: 'ne suivaient pas VIVO', nota: 'un public nouveau, pas le nôtre' },
    ],
    tappe: [
      {
        occhiello: '16 octobre, le soir',
        titolo: 'Une salle pleine, à Paris',
        corpo:
          'Utopia, Paris. 75 % d’Italiens, 20 % de Français, 58 % de femmes. Tous entre vingt et vingt-cinq ans : l’âge où l’on décide ce que l’on boira les trente années suivantes.',
        numeri: [
          { valore: '75 %', etichetta: 'd’Italiens' },
          { valore: '58 %', etichetta: 'de femmes' },
        ],
        media: MEDIA.serata,
        verso: 'largo',
      },
      {
        occhiello: 'Dans le verre',
        titolo: 'En main, pas en vitrine',
        corpo:
          'Personne n’a regardé le champagne de loin. Chaque invité a eu Mathilde Savoye dans son verre, l’a goûté et en a parlé avec son voisin.',
        numeri: [
          { valore: '24', etichetta: 'bouteilles ouvertes' },
          { valore: '168', etichetta: 'coupes servies' },
        ],
        media: MEDIA.brindisi,
        verso: 'largo',
      },
      {
        occhiello: 'Carrousel, 20 octobre',
        titolo: 'La soirée, racontée',
        corpo:
          'Publié avec @champagnesavoye. Neuf interactions pour cent comptes touchés : pour un contenu de marque, ce n’est pas un chiffre que l’on voit souvent.',
        numeri: [
          { valore: '5 812', etichetta: 'vues' },
          { valore: '9,1 %', etichetta: 'taux d’interaction' },
          { valore: '74 %', etichetta: 'ont 18 à 34 ans' },
        ],
        media: MEDIA.sala,
        verso: 'largo',
      },
      {
        occhiello: 'Reel, 23 octobre',
        titolo: 'Le reel est allé plus loin',
        corpo:
          '45 % de comptes de plus que le carrousel, et dix-sept personnes l’ont repartagé sur leur propre profil.',
        numeri: [
          { valore: '4 681', etichetta: 'vues' },
          { valore: '2 789', etichetta: 'comptes touchés' },
          { valore: '92 %', etichetta: 'ont 18 à 34 ans' },
        ],
        media: MEDIA.gente,
        verso: 'alto',
      },
      {
        occhiello: 'Deux marchés',
        titolo: 'L’Italie et la France, le même soir',
        corpo:
          'Environ 2 950 comptes touchés en Italie et 1 080 en France. Pour une maison française, le public italien de moins de 30 ans était un marché encore intact.',
        numeri: [
          { valore: '2 950', etichetta: 'comptes en Italie' },
          { valore: '1 080', etichetta: 'comptes en France' },
        ],
        media: MEDIA.tavolo,
        verso: 'largo',
      },
    ],
    lezioniTitolo: 'Ce que cela nous a appris',
    lezioni: [
      {
        titolo: 'Les gens arrêtent le pouce, la bouteille non',
        corpo:
          'Dans le carrousel, la photo d’une invitée bouteille en main a reçu 68 interactions. Celle de la bouteille seule, 6.',
      },
      {
        titolo: 'Co-signer multiplie',
        corpo:
          'Le contenu publié avec le profil de la maison a touché la France quatre fois plus.',
      },
      {
        titolo: 'Une coupe vaut mieux qu’un scroll',
        corpo:
          'Une soirée comme celle-ci, montée de zéro, coûte entre 2 500 et 5 000 euros. Le marché valorise un contact en personne environ deux cents fois une impression en ligne. Ici, 10 493 sont venues en plus, sans un euro de publicité.',
      },
    ],
    fonte:
      'Invités : liste VIVO Wine Club. Données sociales : Instagram Insights au 26 octobre 2026. Valeur de marché : Street Teams Co, EventTrack.',
    ctaTitolo: 'On fait la prochaine avec vous ?',
    ctaCorpo: 'Racontez-nous la marque et à qui vous voulez la faire goûter. C’est une personne qui répond, pas un formulaire.',
    cta: 'Parlons-en',
  },
};

const CASI: Record<string, Record<CaseLocale, CaseStudy>> = {
  'mathilde-savoye': SAVOYE,
};

function lingua(locale: string | null | undefined): CaseLocale {
  return locale === 'en' || locale === 'fr' ? locale : 'it';
}

export function caseStudyFor(slug: string, locale: string | null | undefined): CaseStudy | null {
  const caso = CASI[slug];
  return caso ? caso[lingua(locale)] : null;
}

/** Tutti i casi, nella lingua di chi legge. Per gli elenchi. */
export function caseStudiesFor(locale: string | null | undefined): CaseStudy[] {
  return Object.values(CASI).map((c) => c[lingua(locale)]);
}

export const CASE_SLUGS = Object.keys(CASI);
