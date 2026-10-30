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
  /** Un'immagine accanto alla tappa, il filmato se esiste, e il post da cui viene. */
  media?: { poster: string; src?: string; link?: string };
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
      'Una maison di champagne voleva farsi conoscere da chi domani comprerà il vino e oggi non lo beve ancora. Centocinquanta ragazzi in un locale nel centro di Parigi, la bottiglia in mano a tutti, e il racconto che parte da lì.',
    numeri: [
      { valore: '150', etichetta: 'in sala', nota: 'un locale nel centro di Parigi, tutto esaurito' },
      { valore: '12 000', etichetta: 'visualizzazioni', nota: 'senza un euro di pubblicità' },
      { valore: '5 000', etichetta: 'account raggiunti', nota: 'persone, non impressioni comprate' },
      { valore: '95 %', etichetta: 'fra i 18 e i 32 anni', nota: 'chi comprerà vino per i prossimi trent’anni' },
    ],
    tappe: [
      {
        occhiello: 'La serata',
        titolo: 'Una sala piena nel centro di Parigi',
        corpo:
          'Centocinquanta persone, tutte fra i diciotto e i trentadue anni. Niente palco, niente presentazione: si entra, si beve, si chiede cos’è.',
        numeri: [
          { valore: '150', etichetta: 'invitati' },
          { valore: '18-32', etichetta: 'anni' },
        ],
        media: MEDIA.serata,
        verso: 'largo',
      },
      {
        occhiello: 'Il prodotto',
        titolo: 'In mano a tutti, non dietro un banco',
        corpo:
          'Ventiquattro bottiglie aperte, centosessantotto calici versati. Nessuno ha guardato lo champagne da lontano: ognuno ha avuto Mathilde Savoye nel proprio bicchiere e ne ha parlato con chi aveva accanto. È lì che un nome diventa un gusto che uno riconosce.',
        numeri: [
          { valore: '24', etichetta: 'bottiglie aperte' },
          { valore: '168', etichetta: 'calici serviti' },
        ],
        media: MEDIA.brindisi,
        verso: 'largo',
      },
      {
        occhiello: 'Dopo la serata',
        titolo: 'Il racconto che continua per giorni',
        corpo:
          'Un carosello e un reel, pubblicati insieme alla maison. Dodicimila visualizzazioni e cinquemila account raggiunti senza pubblicità, e il novantacinque per cento di chi li ha visti ha fra i diciotto e i trentadue anni.',
        numeri: [
          { valore: '12 000', etichetta: 'visualizzazioni' },
          { valore: '5 000', etichetta: 'account raggiunti' },
          { valore: '95 %', etichetta: 'fra 18 e 32 anni' },
        ],
        media: MEDIA.sala,
        verso: 'largo',
      },
      {
        occhiello: 'Due mercati',
        titolo: 'Francia e Italia, nella stessa sera',
        corpo:
          'Per una maison francese il pubblico italiano under 30 era un mercato mai toccato. Una serata a Parigi lo ha raggiunto senza uscire dalla città.',
        media: MEDIA.gente,
        verso: 'alto',
      },
    ],
    lezioniTitolo: 'Cosa resta a una cantina',
    lezioni: [
      {
        titolo: 'Il nome diventa un gusto',
        corpo:
          'Chi ha bevuto quella sera non ha visto una pubblicità: ha assaggiato. È la differenza fra essere visti e essere ricordati.',
      },
      {
        titolo: 'Il vino senza barriere all’ingresso',
        corpo:
          'Niente lezioni, niente gerarchie, niente parole che escludono. Il prodotto resta al centro, e il pubblico si avvicina perché può.',
      },
      {
        titolo: 'I consumatori di domani, oggi',
        corpo:
          'A questa età si decide cosa si berrà per i trent’anni successivi. Arrivarci adesso costa una serata; arrivarci dopo costa una campagna.',
      },
    ],
    fonte:
      'Invitati: lista VIVO Wine Club. Dati social: Instagram Insights, carosello e reel pubblicati con la maison, aggiornati al 30 ottobre 2026.',
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
      'A champagne house wanted to be known by the people who will buy wine tomorrow and do not drink it yet. A hundred and fifty of them in a venue in central Paris, the bottle in everyone’s hand, and the story starting there.',
    numeri: [
      { valore: '150', etichetta: 'in the room', nota: 'a venue in central Paris, full' },
      { valore: '12,000', etichetta: 'views', nota: 'with no ad spend at all' },
      { valore: '5,000', etichetta: 'accounts reached', nota: 'people, not bought impressions' },
      { valore: '95%', etichetta: 'aged 18 to 32', nota: 'the people who will buy wine for the next thirty years' },
    ],
    tappe: [
      {
        occhiello: 'The night',
        titolo: 'A full room in central Paris',
        corpo:
          'A hundred and fifty people, all between eighteen and thirty-two. No stage, no presentation: you walk in, you drink, you ask what it is.',
        numeri: [
          { valore: '150', etichetta: 'guests' },
          { valore: '18-32', etichetta: 'years old' },
        ],
        media: MEDIA.serata,
        verso: 'largo',
      },
      {
        occhiello: 'The product',
        titolo: 'In everyone’s hand, not behind a counter',
        corpo:
          'Twenty-four bottles opened, a hundred and sixty-eight glasses poured. Nobody looked at the champagne from a distance: everyone had Mathilde Savoye in their own glass and talked about it with the person next to them. That is where a name turns into a taste you recognise.',
        numeri: [
          { valore: '24', etichetta: 'bottles opened' },
          { valore: '168', etichetta: 'glasses poured' },
        ],
        media: MEDIA.brindisi,
        verso: 'largo',
      },
      {
        occhiello: 'After the night',
        titolo: 'The story that keeps going for days',
        corpo:
          'A carousel and a reel, published together with the house. Twelve thousand views and five thousand accounts reached with no ad spend, and ninety-five per cent of the people who saw them are between eighteen and thirty-two.',
        numeri: [
          { valore: '12,000', etichetta: 'views' },
          { valore: '5,000', etichetta: 'accounts reached' },
          { valore: '95%', etichetta: 'aged 18 to 32' },
        ],
        media: MEDIA.sala,
        verso: 'largo',
      },
      {
        occhiello: 'Two markets',
        titolo: 'France and Italy, in one evening',
        corpo:
          'For a French house, the Italian under-30 crowd was a market it had never touched. One night in Paris reached it without leaving the city.',
        media: MEDIA.gente,
        verso: 'alto',
      },
    ],
    lezioniTitolo: 'What an estate takes home',
    lezioni: [
      {
        titolo: 'The name turns into a taste',
        corpo:
          'The people who drank that night did not see an ad: they tasted. That is the difference between being seen and being remembered.',
      },
      {
        titolo: 'Wine with nothing in the way',
        corpo:
          'No lecture, no hierarchy, no words that shut people out. The product stays at the centre, and people come closer because they can.',
      },
      {
        titolo: 'Tomorrow’s buyers, today',
        corpo:
          'This is the age when people decide what they will drink for the next thirty years. Reaching them now costs one night; reaching them later costs a campaign.',
      },
    ],
    fonte:
      'Guests: VIVO Wine Club list. Social data: Instagram Insights, carousel and reel published with the house, as of 30 October 2026.',
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
      'Une maison de champagne voulait se faire connaître de ceux qui achèteront le vin demain et n’en boivent pas encore. Cent cinquante d’entre eux dans un lieu du centre de Paris, la bouteille dans la main de chacun, et le récit qui part de là.',
    numeri: [
      { valore: '150', etichetta: 'dans la salle', nota: 'un lieu du centre de Paris, complet' },
      { valore: '12 000', etichetta: 'vues', nota: 'sans un euro de publicité' },
      { valore: '5 000', etichetta: 'comptes touchés', nota: 'des personnes, pas des impressions achetées' },
      { valore: '95 %', etichetta: 'de 18 à 32 ans', nota: 'ceux qui achèteront du vin les trente prochaines années' },
    ],
    tappe: [
      {
        occhiello: 'La soirée',
        titolo: 'Une salle pleine au centre de Paris',
        corpo:
          'Cent cinquante personnes, toutes entre dix-huit et trente-deux ans. Pas de scène, pas de présentation : on entre, on boit, on demande ce que c’est.',
        numeri: [
          { valore: '150', etichetta: 'invités' },
          { valore: '18-32', etichetta: 'ans' },
        ],
        media: MEDIA.serata,
        verso: 'largo',
      },
      {
        occhiello: 'Le produit',
        titolo: 'Dans la main de tous, pas derrière un comptoir',
        corpo:
          'Vingt-quatre bouteilles ouvertes, cent soixante-huit coupes servies. Personne n’a regardé le champagne de loin : chacun a eu Mathilde Savoye dans son verre et en a parlé avec son voisin. C’est là qu’un nom devient un goût que l’on reconnaît.',
        numeri: [
          { valore: '24', etichetta: 'bouteilles ouvertes' },
          { valore: '168', etichetta: 'coupes servies' },
        ],
        media: MEDIA.brindisi,
        verso: 'largo',
      },
      {
        occhiello: 'Après la soirée',
        titolo: 'Le récit qui continue pendant des jours',
        corpo:
          'Un carrousel et un reel, publiés avec la maison. Douze mille vues et cinq mille comptes touchés sans publicité, et quatre-vingt-quinze pour cent de ceux qui les ont vus ont entre dix-huit et trente-deux ans.',
        numeri: [
          { valore: '12 000', etichetta: 'vues' },
          { valore: '5 000', etichetta: 'comptes touchés' },
          { valore: '95 %', etichetta: 'de 18 à 32 ans' },
        ],
        media: MEDIA.sala,
        verso: 'largo',
      },
      {
        occhiello: 'Deux marchés',
        titolo: 'La France et l’Italie, le même soir',
        corpo:
          'Pour une maison française, le public italien de moins de 30 ans était un marché jamais touché. Une soirée à Paris l’a atteint sans quitter la ville.',
        media: MEDIA.gente,
        verso: 'alto',
      },
    ],
    lezioniTitolo: 'Ce qu’un domaine en retire',
    lezioni: [
      {
        titolo: 'Le nom devient un goût',
        corpo:
          'Ceux qui ont bu ce soir-là n’ont pas vu une publicité : ils ont goûté. C’est la différence entre être vu et être retenu.',
      },
      {
        titolo: 'Le vin sans barrière à l’entrée',
        corpo:
          'Pas de leçon, pas de hiérarchie, pas de mots qui excluent. Le produit reste au centre, et le public s’approche parce qu’il le peut.',
      },
      {
        titolo: 'Les acheteurs de demain, aujourd’hui',
        corpo:
          'C’est l’âge où l’on décide ce que l’on boira les trente années suivantes. Les atteindre maintenant coûte une soirée ; les atteindre plus tard coûte une campagne.',
      },
    ],
    fonte:
      'Invités : liste VIVO Wine Club. Données sociales : Instagram Insights, carrousel et reel publiés avec la maison, au 30 octobre 2026.',
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
