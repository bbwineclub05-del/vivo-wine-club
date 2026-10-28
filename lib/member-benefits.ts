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
    trips: {
      title: 'VIVO Wine Trips',
      body:
        'Qualche giorno in un territorio del vino, con le visite e le cene organizzate da noi. Si parte in gruppo e si torna conoscendo venti persone in piu’.',
    },
    maison: {
      title: 'VIVO Maison',
      body:
        'La casa del club: cene private, degustazioni e appuntamenti a porte chiuse. Ci si entra da soci.',
    },
    pack: {
      title: 'Il pacco di benvenuto',
      body:
        'Il cappellino del club, spedito a casa quando diventi socio. Si riconosce da lontano.',
    },
    visite: {
      title: 'Visite in cantina',
      body:
        'Italia, Francia e Spagna: Barolo, Bolgheri, Franciacorta, Bordeaux. Un numero garantito ' +
        'di cantine visitate ogni anno, fra le più note dei loro territori.',
    },
    eventi: {
      title: 'Eventi VIVO',
      body: 'Agli eventi itineranti entri gratis o con uno sconto riservato, su invito.',
    },
    riservati: {
      title: 'Serate solo per soci',
      body: 'La maggior parte degli eventi in cantina, nei locali e alla VIVO Maison è riservata ai soci.',
    },
    mappa: {
      title: 'La mappa delle cantine',
      body:
        'Tutte le cantine che conosciamo, con i contatti. Prenotare una visita presentandosi da ' +
        'parte del club funziona molto meglio che scrivere da soli.',
    },
    merch: {
      title: 'Sconto su capi e gadget',
      body: 'Prezzo riservato ai soci su tutto quello che produciamo.',
    },
    rete: {
      title: 'Rete di sconti sul vino',
      body: 'Enoteche e cantine convenzionate: sconto sull’acquisto di bottiglie.',
    },
    selection: {
      title: 'VIVO Selection',
      body:
        'La lista delle bottiglie che abbiamo bevuto noi, da cantine in cui siamo stati: ' +
        'rapporto qualità prezzo prima di tutto. La vedono solo i soci.',
    },
  },
  en: {
    trips: {
      title: 'VIVO Wine Trips',
      body:
        'A few days in a wine country, with the visits and the dinners arranged by us. You leave in a group and come back knowing twenty more people.',
    },
    maison: {
      title: 'VIVO Maison',
      body:
        'The club’s house: private dinners, tastings and gatherings behind closed doors. Members walk in.',
    },
    pack: {
      title: 'The welcome pack',
      body:
        'The club cap, posted to you when you join. You can spot it across a room.',
    },
    visite: {
      title: 'Winery visits',
      body:
        'Italy, France and Spain: Barolo, Bolgheri, Franciacorta, Bordeaux. A guaranteed number ' +
        'of estates every year, among the best known in their regions.',
    },
    eventi: {
      title: 'VIVO events',
      body: 'Free entry or a members’ price at our travelling events, by invitation.',
    },
    riservati: {
      title: 'Members-only nights',
      body: 'Most of what we do — in wineries, in bars, at the VIVO Maison — is open to members only.',
    },
    mappa: {
      title: 'The winery map',
      body:
        'Every estate we know, with contacts. Asking for a visit on behalf of the club works far ' +
        'better than writing on your own.',
    },
    merch: {
      title: 'Discount on clothing and gear',
      body: 'A members’ price on everything we make.',
    },
    rete: {
      title: 'A network of wine discounts',
      body: 'Partner wine shops and estates: a discount when you buy bottles.',
    },
    selection: {
      title: 'VIVO Selection',
      body:
        'Our list of bottles we drank ourselves, from estates we visited: value for money above ' +
        'all. Members only.',
    },
  },
  fr: {
    trips: {
      title: 'VIVO Wine Trips',
      body:
        'Quelques jours dans une région viticole, avec les visites et les dîners organisés par nous. On part en groupe et on revient avec vingt personnes de plus.',
    },
    maison: {
      title: 'VIVO Maison',
      body:
        'La maison du club : dîners privés, dégustations et rendez-vous à huis clos. Les membres entrent.',
    },
    pack: {
      title: 'Le pack de bienvenue',
      body:
        'La casquette du club, envoyée chez vous dès l’adhésion. Elle se reconnaît de loin.',
    },
    visite: {
      title: 'Visites de domaines',
      body:
        'Italie, France et Espagne : Barolo, Bolgheri, Franciacorta, Bordeaux. Un nombre garanti ' +
        'de domaines chaque année, parmi les plus réputés de leurs régions.',
    },
    eventi: {
      title: 'Événements VIVO',
      body: 'Entrée gratuite ou tarif membre à nos soirées itinérantes, sur invitation.',
    },
    riservati: {
      title: 'Soirées réservées aux membres',
      body: 'La plupart de nos événements — domaines, bars, VIVO Maison — sont réservés aux membres.',
    },
    mappa: {
      title: 'La carte des domaines',
      body:
        'Tous les domaines que nous connaissons, avec leurs contacts. Demander une visite de la ' +
        'part du club marche bien mieux que d’écrire seul.',
    },
    merch: {
      title: 'Remise sur les vêtements et les accessoires',
      body: 'Un tarif membre sur tout ce que nous produisons.',
    },
    rete: {
      title: 'Un réseau de remises sur le vin',
      body: 'Cavistes et domaines partenaires : remise à l’achat de bouteilles.',
    },
    selection: {
      title: 'VIVO Selection',
      body:
        'La liste des bouteilles que nous avons bues nous-mêmes, dans des domaines où nous sommes ' +
        'allés : le rapport qualité-prix avant tout. Réservée aux membres.',
    },
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
