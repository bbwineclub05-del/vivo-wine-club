/**
 * Le domande che ci fanno sempre, con le risposte vere.
 *
 * Il vecchio elenco era in inglese e raccontava un club che non
 * esiste più: candidature valutate una per una, "tiers" di
 * membership, prezzi "comunicati durante la candidatura". Oggi una
 * tessera si compra, costa quello che costa, e le regole stanno
 * scritte in `lib/membership.ts`. Qui si dicono quelle, nelle tre
 * lingue del sito: se cambiano là, vanno cambiate qui.
 */

import { FOUNDING_OFFER_CENTS, STANDARD_PRICE_CENTS } from '@/lib/membership';

export type FaqLocale = 'it' | 'en' | 'fr';

export interface FaqItem {
  q: string;
  /** Una o due frasi. Accetta i token `[etichetta](url)`. */
  a: string;
}

const PIENO = STANDARD_PRICE_CENTS / 100;
const SCONTO = FOUNDING_OFFER_CENTS / 100;

const FAQ: Record<FaqLocale, FaqItem[]> = {
  it: [
    {
      q: 'Cos’è Vivo Wine Club?',
      a:
        'Una community di giovani che vuole cambiare il modo in cui si parla di vino: niente cerimonie, ' +
        'niente lezioni dall’alto. Lo facciamo con eventi, serate e visite in cantina. Wine but make it VIVO.',
    },
    {
      q: 'Come si diventa soci?',
      a:
        'Si compra la tessera dalla pagina [Diventa member](/membership): non c’è nessuna candidatura da ' +
        'far approvare. Diventi socio nel momento in cui l’iscrizione è completata.',
    },
    {
      q: 'Quanto costa la tessera?',
      a:
        `Fino al 31 dicembre 2026 l’iscrizione è gratuita e la tessera copre il resto del 2026. Chi diventa ` +
        `socio entro quella data rinnova il 2027 a ${SCONTO} € invece di ${PIENO} €, se lo fa entro fine ` +
        `anno. Dal 1° gennaio 2027 si entra a ${PIENO} € per l’anno solare.`,
    },
    {
      q: 'Cosa comprende la tessera?',
      a:
        'Visite in cantina in Italia, Francia e Spagna, ingresso gratuito o ridotto agli eventi VIVO, le ' +
        'serate riservate ai soci, la mappa delle cantine con i contatti, la VIVO Selection, lo sconto sul ' +
        'merch e la rete di enoteche convenzionate.',
    },
    {
      q: 'Serve capirne di vino?',
      a:
        'No. Metà di chi viene alla prima serata non sa cosa ordinare, e va benissimo: ai tavoli ci sono i ' +
        'nostri sommelier e nessuno interroga nessuno.',
    },
    {
      q: 'Il rinnovo è automatico?',
      a:
        'No. La tessera vale per l’anno solare e scade: ti scriviamo 30 e 7 giorni prima, e rinnovi quando ' +
        'vuoi dall’area soci. Se non fai niente, non ti viene addebitato niente.',
    },
    {
      q: 'Si può venire a un evento senza tessera?',
      a:
        'Ad alcuni sì, e si compra il biglietto dalla pagina dell’evento. La maggior parte delle serate in ' +
        'cantina e alla VIVO Maison è riservata ai soci.',
    },
    {
      q: 'Come arriva il biglietto di un evento?',
      a:
        'Via email, subito dopo il pagamento, con il QR da mostrare all’ingresso. Se non lo trovi, ' +
        'controlla nello spam prima di scriverci.',
    },
    {
      q: 'In quali città siete?',
      a: 'Torino, Milano, Brescia, Firenze e Parigi. Le visite in cantina seguono i territori del vino.',
    },
    {
      q: 'Non trovo la risposta.',
      a: 'Scrivici a [info@vivowineclub.com](mailto:info@vivowineclub.com): risponde una persona.',
    },
  ],

  en: [
    {
      q: 'What is Vivo Wine Club?',
      a:
        'A community of young people out to change the way wine is talked about: no ceremony, no lectures. ' +
        'We do it with events, nights out and winery visits. Wine but make it VIVO.',
    },
    {
      q: 'How do I become a member?',
      a:
        'You buy the card on the [Join](/membership) page — there is no application to be approved. ' +
        'You are a member the moment you have signed up.',
    },
    {
      q: 'How much does the card cost?',
      a:
        `Until 31 December 2026 joining is free and the card covers the rest of 2026. Join by that date ` +
        `and you renew 2027 for €${SCONTO} instead of €${PIENO}, as long as you do it before the year ` +
        `is out. From 1 January 2027 it is €${PIENO} for the calendar year.`,
    },
    {
      q: 'What does the card include?',
      a:
        'Winery visits in Italy, France and Spain, free or reduced entry to VIVO events, the members-only ' +
        'nights, the winery map with contacts, the VIVO Selection, the merch discount and our network of ' +
        'wine shops.',
    },
    {
      q: 'Do I need to know about wine?',
      a:
        'No. Half the people at their first night have no idea what to order, and that is fine: our ' +
        'sommeliers sit at the tables and nobody is being tested.',
    },
    {
      q: 'Does it renew automatically?',
      a:
        'No. The card runs for the calendar year and then expires: we write to you 30 and 7 days before, ' +
        'and you renew from the members’ area when you want. Do nothing and nothing is charged.',
    },
    {
      q: 'Can I come to an event without a card?',
      a:
        'To some of them, yes — the ticket is on the event page. Most winery nights and everything at the ' +
        'VIVO Maison are for members only.',
    },
    {
      q: 'How does an event ticket arrive?',
      a:
        'By email, right after payment, with the QR code to show at the door. If you cannot find it, ' +
        'check your spam folder before writing to us.',
    },
    {
      q: 'Which cities are you in?',
      a: 'Turin, Milan, Brescia, Florence and Paris. The winery visits follow the wine regions instead.',
    },
    {
      q: 'My question is not here.',
      a: 'Write to [info@vivowineclub.com](mailto:info@vivowineclub.com) — a person answers.',
    },
  ],

  fr: [
    {
      q: 'Qu’est-ce que Vivo Wine Club ?',
      a:
        'Une communauté de jeunes qui veut changer la façon de parler du vin : sans cérémonie et sans ' +
        'leçons. Avec des événements, des soirées et des visites de domaines. Wine but make it VIVO.',
    },
    {
      q: 'Comment devenir membre ?',
      a:
        'La carte s’achète sur la page [Devenir membre](/membership) : il n’y a aucune candidature à faire ' +
        'approuver. Vous êtes membre dès l’inscription terminée.',
    },
    {
      q: 'Combien coûte la carte ?',
      a:
        `Jusqu’au 31 décembre 2026 l’adhésion est gratuite et la carte couvre la fin de 2026. En devenant ` +
        `membre avant cette date, vous renouvelez 2027 à ${SCONTO} € au lieu de ${PIENO} €, à ` +
        `condition de le faire avant la fin de l’année. À partir du 1er janvier 2027, c’est ${PIENO} € pour ` +
        `l’année civile.`,
    },
    {
      q: 'Que comprend la carte ?',
      a:
        'Des visites de domaines en Italie, en France et en Espagne, l’entrée gratuite ou réduite aux ' +
        'événements VIVO, les soirées réservées aux membres, la carte des domaines avec les contacts, la ' +
        'VIVO Selection, la remise sur le merch et notre réseau de cavistes.',
    },
    {
      q: 'Faut-il s’y connaître en vin ?',
      a:
        'Non. La moitié des gens, à leur première soirée, ne savent pas quoi commander, et c’est très ' +
        'bien : nos sommeliers sont à table et personne n’est interrogé.',
    },
    {
      q: 'Le renouvellement est-il automatique ?',
      a:
        'Non. La carte vaut pour l’année civile puis expire : nous écrivons 30 et 7 jours avant, et vous ' +
        'renouvelez depuis l’espace membre quand vous voulez. Sans rien faire, rien n’est prélevé.',
    },
    {
      q: 'Peut-on venir à un événement sans carte ?',
      a:
        'À certains, oui — le billet est sur la page de l’événement. La plupart des soirées en domaine et ' +
        'tout ce qui se passe à la VIVO Maison sont réservés aux membres.',
    },
    {
      q: 'Comment reçoit-on son billet ?',
      a:
        'Par email, juste après le paiement, avec le QR code à présenter à l’entrée. Si vous ne le trouvez ' +
        'pas, regardez dans les spams avant de nous écrire.',
    },
    {
      q: 'Dans quelles villes êtes-vous ?',
      a: 'Turin, Milan, Brescia, Florence et Paris. Les visites, elles, suivent les régions viticoles.',
    },
    {
      q: 'Je ne trouve pas ma réponse.',
      a: 'Écrivez à [info@vivowineclub.com](mailto:info@vivowineclub.com) : c’est une personne qui répond.',
    },
  ],
};

export function faqFor(locale: string): FaqItem[] {
  return FAQ[(locale as FaqLocale) in FAQ ? (locale as FaqLocale) : 'en'];
}
