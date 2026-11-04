/**
 * Cosa dà la tessera, nelle tre lingue del club.
 *
 * Scritto una volta sola e letto dall'area del socio e dalle mail,
 * perché la stessa promessa non finisca raccontata in tre modi
 * diversi in tre posti. Sono promesse: vanno cambiate qui quando
 * cambiano nella realtà.
 */

export type BenefitLocale = 'it' | 'en' | 'fr';

export interface Benefit {
  id: string;
  title: string;
  body: string;
  icon: 'grapes' | 'ticket' | 'lock' | 'map' | 'shirt' | 'percent' | 'star' | 'home' | 'plane' | 'gift';
}

const ICONE: Record<string, Benefit['icon']> = {
  serate: 'ticket',
  cantine: 'grapes',
  viaggi: 'plane',
  sconti: 'percent',
  selection: 'star',
};

/**
 * Erano nove, e tre o quattro dicevano la stessa cosa con parole
 * diverse: "serate solo per soci" ed "eventi VIVO" sono la stessa
 * serata guardata due volte, "visite in cantina" e "la mappa delle
 * cantine" sono lo stesso posto, "sconto sullo shop" e "rete di
 * sconti" sono lo stesso sconto. Nove voci non sono piu' generose di
 * cinque: sono cinque promesse annacquate, e chi legge se ne
 * accorge.
 *
 * Adesso sono cinque, ognuna con dentro quello che prima stava
 * sparso in due o tre righe.
 */
const TESTI: Record<BenefitLocale, Record<string, { title: string; body: string }>> = {
  it: {
    serate:    {
      title: 'Le serate del club',
      body: 'Quasi tutte sono riservate ai soci: wine party, lounge e le cene a porte chiuse alla Maison. Tu entri gratis o a prezzo riservato.',
    },
    cantine:   {
      title: 'Le cantine',
      body: 'Visite a Barolo, Bolgheri, Franciacorta, Bordeaux. E la mappa con i contatti, per prenotare da parte del club anche quando vai per conto tuo.',
    },
    viaggi:    {
      title: 'I viaggi',
      body: 'Qualche giorno in un territorio del vino, in gruppo. Si parte in pochi e si torna amici.',
    },
    sconti:    {
      title: 'Gli sconti',
      body: 'Enoteche e cantine convenzionate, e il tuo codice su tutto quello che produciamo.',
    },
    selection: {
      title: 'VIVO Selection',
      body: 'Le bottiglie che beviamo noi, con scritto dove si trovano e quanto costano. La vedono solo i soci.',
    },
  },
  en: {
    serate:    {
      title: 'The club nights',
      body: 'Nearly all of them are members-only: wine parties, lounges and the closed-door dinners at the Maison. You get in free or at a members’ price.',
    },
    cantine:   {
      title: 'The wineries',
      body: 'Visits to Barolo, Bolgheri, Franciacorta, Bordeaux. Plus the map with the contacts, so you book as the club even when you go on your own.',
    },
    viaggi:    {
      title: 'The trips',
      body: 'A few days in a wine country, as a group. You leave as a handful of people and come back friends.',
    },
    sconti:    {
      title: 'The discounts',
      body: 'Partner wine shops and estates, and your own code on everything we make.',
    },
    selection: {
      title: 'VIVO Selection',
      body: 'The bottles we drink, with where to find them and what they cost. Members only.',
    },
  },
  fr: {
    serate:    {
      title: 'Les soirées du club',
      body: 'Presque toutes sont réservées aux membres : wine parties, lounges et les dîners à huis clos à la Maison. Tu entres gratuitement ou au tarif membre.',
    },
    cantine:   {
      title: 'Les domaines',
      body: 'Visites à Barolo, Bolgheri, Franciacorta, Bordeaux. Et la carte avec les contacts, pour réserver de la part du club même quand tu y vas seul.',
    },
    viaggi:    {
      title: 'Les voyages',
      body: 'Quelques jours dans une région du vin, en groupe. On part à quelques-uns et on rentre amis.',
    },
    sconti:    {
      title: 'Les remises',
      body: 'Cavistes et domaines partenaires, et ton code sur tout ce que nous produisons.',
    },
    selection: {
      title: 'VIVO Selection',
      body: 'Les bouteilles que nous buvons, avec où les trouver et à quel prix. Réservée aux membres.',
    },
  },
};

/**
 * L'ordine in cui si leggono: prima quello per cui uno si iscrive
 * davvero — le serate, le cantine, i viaggi — e dopo le cose che
 * contano ma non fanno alzare nessuno dal divano.
 *
 * Quello che arriva a casa quando ci si iscrive non e' scritto da
 * nessuna parte, ed e' voluto: una sorpresa annunciata non e' piu'
 * una sorpresa.
 */
const ORDINE = ['serate', 'cantine', 'viaggi', 'sconti', 'selection'] as const;

export function benefitsFor(locale: string | null | undefined): Benefit[] {
  const l: BenefitLocale = locale === 'en' || locale === 'fr' ? locale : 'it';
  return ORDINE.map((id) => ({ id, icon: ICONE[id], ...TESTI[l][id] }));
}

/** Le voci in italiano: l'area riservata e quella del socio parlano italiano. */
export const BENEFITS = benefitsFor('it');

/* ── I tre punti della home ───────────────────────────────────────── */

/**
 * Le nove voci qui sopra rispondono a chi sta per pagare. In home no:
 * li' si decide solo se vale la pena cliccare, e nove righe lette di
 * sfuggita non decidono niente. Tre si ricordano.
 *
 * Stanno nello stesso file delle altre perche' sono la stessa
 * promessa detta piu' corta, e se una cambia devono cambiare
 * entrambe: due file diversi diventano due promesse diverse.
 */
const SINTESI: Record<BenefitLocale, { title: string; body: string }[]> = {
  it: [
    { title: 'Eventi esclusivi', body: 'Serate riservate ai soci, in Italia e in Francia.' },
    { title: 'Viaggi in cantina', body: 'Le migliori cantine fra Francia e Italia, scelte da noi.' },
    { title: 'Sconti esclusivi', body: 'Enoteche e cantine convenzionate, e tutto il nostro shop.' },
  ],
  en: [
    { title: 'Members-only events', body: 'Nights for members, in Italy and France.' },
    { title: 'Winery trips', body: 'The best estates in France and Italy, picked by us.' },
    { title: 'Members-only discounts', body: 'Partner wine shops and estates, and everything we make.' },
  ],
  fr: [
    { title: 'Événements exclusifs', body: 'Des soirées réservées aux membres, en Italie et en France.' },
    { title: 'Voyages dans les domaines', body: 'Les meilleurs domaines de France et d’Italie, choisis par nous.' },
    { title: 'Remises exclusives', body: 'Cavistes et domaines partenaires, et tout notre shop.' },
  ],
};

export function sintesiFor(locale: string | null | undefined) {
  const l: BenefitLocale = locale === 'en' || locale === 'fr' ? locale : 'it';
  return SINTESI[l];
}
