/**
 * La membership: stato, prezzo e scadenze, in un posto solo.
 *
 * Due regole, le stesse del registro di Finance.
 *
 * La prima: **lo stato non si salva**. Non esiste una colonna "è
 * attivo": esiste una data di scadenza, e lo stato è una domanda che
 * si fa a quella data. Un flag salvato va aggiornato da qualcuno, e
 * quel qualcuno prima o poi non lo fa — e allora il sistema dice che
 * Tizio è attivo mentre è scaduto da tre mesi.
 *
 * La seconda: **i prezzi si leggono, non si calcolano dall'orologio**.
 * Stanno scritti sulla riga della persona, decisi quando la membership
 * nasce. Una regola che guarda la data di oggi dà risposte diverse a
 * distanza di mesi, e fra un anno nessuno saprebbe più perché a Tizio
 * sono stati chiesti venti euro e a Caio trenta.
 */

export type MembershipTier = 'founding' | 'standard';

export interface Membership {
  id: string;
  email: string;
  user_id: string | null;
  full_name: string | null;
  member_id: string | null;
  tier: MembershipTier;
  started_at: string;
  expires_at: string;
  /** Il prezzo pieno del rinnovo, in centesimi. */
  standard_price_cents: number;
  /** Lo sconto per chi rinnova in anticipo, se previsto. */
  offer_price_cents: number | null;
  /** Fino a quando vale lo sconto. */
  offer_expires_at: string | null;
  cancelled_at: string | null;
  reminded_30_at: string | null;
  reminded_7_at: string | null;
  reminded_0_at: string | null;
}

/* ── Date ─────────────────────────────────────────────────────────── */

/** Oggi in formato YYYY-MM-DD, ora locale. */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Giorni da `from` a `to`. Negativo se `to` è già passato. */
export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from.slice(0, 10)}T00:00:00`).getTime();
  const b = new Date(`${to.slice(0, 10)}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/* ── Eta' ─────────────────────────────────────────────────────────── */

/**
 * Il club e' per chi ha meno di trent'anni.
 *
 * Non e' un dettaglio di stile: e' l'unica cosa che tiene insieme le
 * serate, ed e' anche quello che le cantine comprano quando lavorano
 * con noi. Sta scritto sulla pagina di iscrizione, e il modulo non
 * lascia passare chi non rientra.
 *
 * La regola vive qui perche' la controllano in due: il modulo, che
 * avvisa prima di far perdere tempo, e la rotta che salva, che e' la
 * sola a decidere davvero. Un controllo che gira solo nel browser non
 * e' un controllo.
 */
export const ETA_MINIMA = 18;
export const ETA_MASSIMA = 30;

/** Gli anni compiuti a una certa data. */
export function ageOn(dob: string, on = today()): number {
  const n = new Date(`${dob.slice(0, 10)}T00:00:00`);
  const d = new Date(`${on.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(n.getTime()) || Number.isNaN(d.getTime())) return NaN;
  let anni = d.getFullYear() - n.getFullYear();
  const compleannoPassato =
    d.getMonth() > n.getMonth() || (d.getMonth() === n.getMonth() && d.getDate() >= n.getDate());
  if (!compleannoPassato) anni -= 1;
  return anni;
}

/** La nascita piu' recente ammessa: chi e' nato dopo non ha 18 anni. */
export function maxDob(on = today()): string {
  const d = new Date(`${on.slice(0, 10)}T00:00:00`);
  d.setFullYear(d.getFullYear() - ETA_MINIMA);
  return isoDate(d);
}

/** La nascita piu' lontana ammessa: chi e' nato prima ha gia' trent'anni. */
export function minDob(on = today()): string {
  const d = new Date(`${on.slice(0, 10)}T00:00:00`);
  d.setFullYear(d.getFullYear() - ETA_MASSIMA);
  d.setDate(d.getDate() + 1); // il giorno del trentesimo compleanno e' gia' fuori
  return isoDate(d);
}

/** Vero se con quella data di nascita si puo' diventare soci. */
export function etaAmmessa(dob: string, on = today()): boolean {
  const anni = ageOn(dob, on);
  return Number.isFinite(anni) && anni >= ETA_MINIMA && anni < ETA_MASSIMA;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ── Stato ────────────────────────────────────────────────────────── */

export type MembershipStatus = 'active' | 'expiring' | 'expired' | 'cancelled';

export const STATUS_LABEL: Record<MembershipStatus, string> = {
  active: 'Attiva',
  expiring: 'In scadenza',
  expired: 'Scaduta',
  cancelled: 'Annullata',
};

/** Da quanti giorni dalla scadenza si comincia a dire "in scadenza". */
export const EXPIRING_WINDOW_DAYS = 30;

export function statusOf(m: Membership, now = today()): MembershipStatus {
  if (m.cancelled_at) return 'cancelled';
  const left = daysBetween(now, m.expires_at);
  if (left < 0) return 'expired';
  if (left <= EXPIRING_WINDOW_DAYS) return 'expiring';
  return 'active';
}

/** Quanti giorni mancano al rinnovo. Negativo se è già scaduta. */
export function daysLeft(m: Membership, now = today()): number {
  return daysBetween(now, m.expires_at);
}

/* ── Prezzo ───────────────────────────────────────────────────────── */

export interface Price {
  cents: number;
  /** Vero se si sta applicando lo sconto per il rinnovo anticipato. */
  discounted: boolean;
  /** Il prezzo pieno, per poter scrivere "invece di 30". */
  fullCents: number;
  /** Ultimo giorno utile per lo sconto, se c'è. */
  offerUntil: string | null;
  /** Giorni rimasti per approfittarne. Negativo o null se non si applica. */
  offerDaysLeft: number | null;
}

/**
 * Quanto costa rinnovare, oggi.
 *
 * Una domanda sola: siamo entro la data dell'offerta? Se sì si paga
 * l'offerta, altrimenti il prezzo pieno.
 */
export function priceFor(m: Membership, now = today()): Price {
  const full = m.standard_price_cents;
  const hasOffer =
    m.offer_price_cents != null &&
    m.offer_expires_at != null &&
    daysBetween(now, m.offer_expires_at) >= 0;

  return {
    cents: hasOffer ? (m.offer_price_cents as number) : full,
    discounted: hasOffer,
    fullCents: full,
    offerUntil: m.offer_expires_at,
    offerDaysLeft: m.offer_expires_at ? daysBetween(now, m.offer_expires_at) : null,
  };
}

/* ── Nuove membership ─────────────────────────────────────────────── */

/**
 * Le regole del club, scritte una volta.
 *
 *  · Fino al 31/12/2026 l'iscrizione è gratuita e la membership copre
 *    il resto del 2026.
 *  · Chi diventa socio in quella finestra rinnova il 2027 a venti
 *    euro invece di trenta, purché lo faccia entro fine anno. Il
 *    periodo gratuito e lo sconto finiscono lo stesso giorno: non
 *    c'è una seconda scadenza da spiegare alla gente.
 *  · Dal 1/01/2027 si entra pagando trenta euro per l'anno solare.
 *
 * Non c'è niente da approvare: una tessera si compra, non si chiede.
 * Chi si iscrive diventa socio nel momento in cui paga — o subito, se
 * siamo ancora nel periodo gratuito.
 */
export const FREE_UNTIL = '2026-12-31';
export const STANDARD_PRICE_CENTS = 3000;
export const FOUNDING_OFFER_CENTS = 2000;

export interface NewMembership {
  tier: MembershipTier;
  started_at: string;
  expires_at: string;
  standard_price_cents: number;
  offer_price_cents: number | null;
  offer_expires_at: string | null;
  /** Quanto va incassato subito: zero durante il periodo gratuito. */
  dueNowCents: number;
}

export function newMembershipFor(now = today()): NewMembership {
  const free = daysBetween(now, FREE_UNTIL) >= 0;

  if (free) {
    return {
      tier: 'founding',
      started_at: now,
      expires_at: FREE_UNTIL,
      standard_price_cents: STANDARD_PRICE_CENTS,
      offer_price_cents: FOUNDING_OFFER_CENTS,
      offer_expires_at: FREE_UNTIL,
      dueNowCents: 0,
    };
  }

  // Dal 2027 in poi: anno solare, prezzo pieno, pagato subito.
  const year = Number(now.slice(0, 4));
  return {
    tier: 'standard',
    started_at: now,
    expires_at: `${year}-12-31`,
    standard_price_cents: STANDARD_PRICE_CENTS,
    offer_price_cents: null,
    offer_expires_at: null,
    dueNowCents: STANDARD_PRICE_CENTS,
  };
}

/** La scadenza dopo un rinnovo: sempre il 31 dicembre dell'anno dopo. */
export function nextExpiry(m: Membership): string {
  const year = Number(m.expires_at.slice(0, 4));
  return `${year + 1}-12-31`;
}

/* ── Promemoria ───────────────────────────────────────────────────── */

/** A quanti giorni dalla scadenza si scrive, e in quale ordine. */
export const REMINDER_DAYS = [30, 7, 0] as const;
export type ReminderStep = (typeof REMINDER_DAYS)[number];

const REMINDER_FIELD: Record<ReminderStep, keyof Membership> = {
  30: 'reminded_30_at',
  7: 'reminded_7_at',
  0: 'reminded_0_at',
};

export function reminderField(step: ReminderStep): keyof Membership {
  return REMINDER_FIELD[step];
}

/**
 * Quale promemoria tocca oggi a questa membership, se ne tocca uno.
 *
 * Si sceglie il passo più vicino alla scadenza fra quelli già maturati
 * e non ancora mandati: se il sistema resta fermo due settimane, al
 * ritorno manda quello giusto e non tre mail in fila.
 */
export function dueReminder(m: Membership, now = today()): ReminderStep | null {
  if (m.cancelled_at) return null;
  const left = daysLeft(m, now);
  // Passata la scadenza il promemoria non è più un promemoria.
  if (left < 0) return null;

  for (const step of REMINDER_DAYS) {
    if (left <= step && !m[REMINDER_FIELD[step]]) return step;
  }
  return null;
}

/* ── Numero di tessera ────────────────────────────────────────────── */

/** VIVO-A1B2. Niente 0/O e 1/I: si leggono ad alta voce al telefono. */
export function generateMemberId(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `VIVO-${out}`;
}
