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
    pack:      { title: 'Il pacco di benvenuto',      body: 'Il cappellino del club, spedito a casa.' },
    visite:    { title: 'Visite in cantina',          body: 'Barolo, Bolgheri, Franciacorta, Bordeaux.' },
    eventi:    { title: 'Eventi VIVO',                body: 'Ingresso gratuito o prezzo riservato.' },
    riservati: { title: 'Serate solo per soci',       body: 'Quasi tutte le nostre serate.' },
    mappa:     { title: 'La mappa delle cantine',     body: 'Con i contatti, per prenotare da parte del club.' },
    merch:     { title: 'Sconto su capi e gadget',    body: 'Su tutto quello che produciamo.' },
    rete:      { title: 'Rete di sconti sul vino',    body: 'Enoteche e cantine convenzionate.' },
    selection: { title: 'VIVO Selection',             body: 'Le bottiglie che beviamo noi. La vedono solo i soci.' },
  },
  en: {
    trips:     { title: 'VIVO Wine Trips',            body: 'A few days in a wine country, as a group.' },
    maison:    { title: 'VIVO Maison',                body: 'The club house: dinners and tastings behind closed doors.' },
    pack:      { title: 'The welcome pack',           body: 'The club cap, posted to you.' },
    visite:    { title: 'Winery visits',              body: 'Barolo, Bolgheri, Franciacorta, Bordeaux.' },
    eventi:    { title: 'VIVO events',                body: 'Free entry or a members’ price.' },
    riservati: { title: 'Members-only nights',        body: 'Nearly every night we throw.' },
    mappa:     { title: 'The winery map',             body: 'With the contacts, so you book as the club.' },
    merch:     { title: 'Discount on clothing and gear', body: 'On everything we make.' },
    rete:      { title: 'A network of wine discounts', body: 'Partner wine shops and estates.' },
    selection: { title: 'VIVO Selection',             body: 'The bottles we drink. Members only.' },
  },
  fr: {
    trips:     { title: 'VIVO Wine Trips',            body: 'Quelques jours dans une région du vin, en groupe.' },
    maison:    { title: 'VIVO Maison',                body: 'La maison du club : dîners et dégustations à huis clos.' },
    pack:      { title: 'Le pack de bienvenue',       body: 'La casquette du club, envoyée chez vous.' },
    visite:    { title: 'Visites de domaines',        body: 'Barolo, Bolgheri, Franciacorta, Bordeaux.' },
    eventi:    { title: 'Événements VIVO',            body: 'Entrée gratuite ou tarif membre.' },
    riservati: { title: 'Soirées réservées aux membres', body: 'Presque toutes nos soirées.' },
    mappa:     { title: 'La carte des domaines',      body: 'Avec les contacts, pour réserver de la part du club.' },
    merch:     { title: 'Remise sur les vêtements et les accessoires', body: 'Sur tout ce que nous produisons.' },
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
