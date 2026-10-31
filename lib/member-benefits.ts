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
  eventi: 'ticket',
  visite: 'grapes',
  trips: 'plane',
  maison: 'home',
  rete: 'percent',
  merch: 'shirt',
  selection: 'star',
  mappa: 'map',
  riservati: 'lock',
  pack: 'gift',
};

const TESTI: Record<BenefitLocale, Record<string, { title: string; body: string }>> = {
  it: {
    trips:     { title: 'VIVO Wine Trips',            body: 'Qualche giorno in un territorio del vino, in gruppo.' },
    maison:    { title: 'VIVO Maison',                body: 'La casa del club: cene e degustazioni a porte chiuse.' },
    pack:      { title: 'Il pacco di benvenuto',      body: 'Il cavatappi VIVO, spedito a casa.' },
    visite:    { title: 'Visite in cantina',          body: 'Barolo, Bolgheri, Franciacorta, Bordeaux e molto altro.' },
    eventi:    { title: 'Eventi VIVO',                body: 'Ingresso gratuito o prezzo riservato.' },
    riservati: { title: 'Serate solo per soci',       body: 'Quasi tutte le nostre serate.' },
    mappa:     { title: 'La mappa delle cantine',     body: 'Con i contatti, per prenotare da parte del club.' },
    merch:     { title: 'Sconto sul nostro shop',     body: 'Su tutto quello che produciamo.' },
    rete:      { title: 'Rete di sconti sul vino',    body: 'Enoteche e cantine convenzionate.' },
    selection: { title: 'VIVO Selection',             body: 'Le bottiglie che beviamo noi. La vedono solo i soci.' },
  },
  en: {
    trips:     { title: 'VIVO Wine Trips',            body: 'A few days in a wine country, as a group.' },
    maison:    { title: 'VIVO Maison',                body: 'The club house: dinners and tastings behind closed doors.' },
    pack:      { title: 'The welcome pack',           body: 'The VIVO corkscrew, posted to you.' },
    visite:    { title: 'Winery visits',              body: 'Barolo, Bolgheri, Franciacorta, Bordeaux and plenty more.' },
    eventi:    { title: 'VIVO events',                body: 'Free entry or a members’ price.' },
    riservati: { title: 'Members-only nights',        body: 'Nearly every night we throw.' },
    mappa:     { title: 'The winery map',             body: 'With the contacts, so you book as the club.' },
    merch:     { title: 'Discount on our shop',       body: 'On everything we make.' },
    rete:      { title: 'A network of wine discounts', body: 'Partner wine shops and estates.' },
    selection: { title: 'VIVO Selection',             body: 'The bottles we drink. Members only.' },
  },
  fr: {
    trips:     { title: 'VIVO Wine Trips',            body: 'Quelques jours dans une région du vin, en groupe.' },
    maison:    { title: 'VIVO Maison',                body: 'La maison du club : dîners et dégustations à huis clos.' },
    pack:      { title: 'Le pack de bienvenue',       body: 'Le tire-bouchon VIVO, envoyé chez vous.' },
    visite:    { title: 'Visites de domaines',        body: 'Barolo, Bolgheri, Franciacorta, Bordeaux et bien d’autres.' },
    eventi:    { title: 'Événements VIVO',            body: 'Entrée gratuite ou tarif membre.' },
    riservati: { title: 'Soirées réservées aux membres', body: 'Presque toutes nos soirées.' },
    mappa:     { title: 'La carte des domaines',      body: 'Avec les contacts, pour réserver de la part du club.' },
    merch:     { title: 'Remise sur notre shop',      body: 'Sur tout ce que nous produisons.' },
    rete:      { title: 'Un réseau de remises sur le vin', body: 'Cavistes et domaines partenaires.' },
    selection: { title: 'VIVO Selection',             body: 'Les bouteilles que nous buvons. Réservée aux membres.' },
  },
};

/**
 * L'ordine in cui si leggono.
 *
 * Prima quello per cui uno si iscrive davvero — le serate riservate,
 * le cantine, i viaggi, la Maison — e dopo le cose che contano ma
 * non fanno alzare nessuno dal divano: gli sconti, la mappa, la
 * lista delle bottiglie. Il pacco di benvenuto chiude, perche' e'
 * l'unica cosa che arriva a casa.
 */
const ORDINE = [
  'riservati', 'eventi', 'visite', 'trips', 'maison',
  'rete', 'merch', 'selection', 'mappa', 'pack',
] as const;

export function benefitsFor(locale: string | null | undefined): Benefit[] {
  const l: BenefitLocale = locale === 'en' || locale === 'fr' ? locale : 'it';
  return ORDINE.map((id) => ({ id, icon: ICONE[id], ...TESTI[l][id] }));
}

/** Le voci in italiano: l'area riservata e quella del socio parlano italiano. */
export const BENEFITS = benefitsFor('it');

/* ── A gruppi ─────────────────────────────────────────────────────── */

/**
 * Le stesse voci, in tre mucchi.
 *
 * Nove riquadri uno uguale all'altro non si leggono: si guardano per
 * due secondi e si scorre oltre. Tre mucchi da tre invece si tengono
 * a mente, e ognuno risponde a una domanda diversa: dove si entra,
 * dove si va, quanto si risparmia.
 *
 * Il pacco di benvenuto resta fuori: e' l'unica cosa che arriva a
 * casa, e chiude la sezione da solo.
 */
const GRUPPI = [
  { id: 'porte',  voci: ['riservati', 'eventi', 'maison'] },
  { id: 'strada', voci: ['visite', 'trips', 'mappa'] },
  { id: 'conto',  voci: ['rete', 'merch', 'selection'] },
] as const;

const TITOLI_GRUPPI: Record<BenefitLocale, Record<string, string>> = {
  it: { porte: 'Dove si entra', strada: 'Dove si va', conto: 'Quanto si risparmia' },
  en: { porte: 'Where you get in', strada: 'Where you go', conto: 'What you save' },
  fr: { porte: 'Où l’on entre', strada: 'Où l’on va', conto: 'Ce qu’on économise' },
};

export interface BenefitGroup {
  id: string;
  titolo: string;
  voci: Benefit[];
}

export function benefitGroupsFor(locale: string | null | undefined): BenefitGroup[] {
  const l: BenefitLocale = locale === 'en' || locale === 'fr' ? locale : 'it';
  return GRUPPI.map((g) => ({
    id: g.id,
    titolo: TITOLI_GRUPPI[l][g.id],
    voci: g.voci.map((id) => ({ id, icon: ICONE[id], ...TESTI[l][id] })),
  }));
}
