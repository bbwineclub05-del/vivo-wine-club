/**
 * Il registro: tutta l'aritmetica dei soldi del club, in un posto solo.
 *
 * Due regole da cui non si deroga.
 *
 * La prima: **si conta in centesimi interi**. In virgola mobile
 * 0.1 + 0.2 fa 0.30000000000000004, e su centosettanta righe l'errore
 * si accumula finché un saldo che dovrebbe essere zero diventa
 * "0,01 €" — o peggio, resta plausibile e sbagliato. Gli euro esistono
 * solo al momento di scriverli sullo schermo.
 *
 * La seconda: **i saldi non si memorizzano mai**. Non esiste una
 * colonna "quanto deve avere Cristiano": esiste la somma delle righe
 * che lo riguardano, ricalcolata ogni volta. Un saldo salvato è un
 * saldo che prima o poi diverge dai fatti che dovrebbe riassumere, e
 * allora servono pulsanti "ricalcola" e nessuno sa più quale dei due
 * numeri sia quello vero.
 */

export type EntryType = 'expense' | 'income' | 'reimbursement' | 'contribution';

export interface Entry {
  id: string;
  date: string;
  description: string;
  /** Sempre positivo, in centesimi. Il segno lo decide il tipo. */
  amount_cents: number;
  entry_type: EntryType;
  /** Chi ha materialmente mosso i soldi. `null` = il conto del club. */
  member_email: string | null;
  category: string | null;
}

/* ── Le quattro righe possibili ───────────────────────────────────── */

export const ENTRY_LABEL: Record<EntryType, string> = {
  expense: 'Spesa',
  income: 'Entrata',
  reimbursement: 'Rimborso',
  contribution: 'Versamento',
};

/**
 * Cosa significano, dette come le direbbe una persona:
 *
 *  · spesa pagata dal club        → esce dalla cassa
 *  · spesa anticipata da Marco    → la cassa non si muove, il club deve a Marco
 *  · entrata incassata dal club   → entra in cassa
 *  · entrata incassata da Marco   → la cassa non si muove, Marco deve al club
 *  · rimborso a Marco             → esce dalla cassa, il debito verso Marco cala
 *  · versamento di Marco          → entra in cassa, il credito del club cala
 */

/** Quanto questa riga muove la cassa del club, in centesimi. */
export function clubCashDelta(e: Entry): number {
  switch (e.entry_type) {
    case 'expense':
      return e.member_email ? 0 : -e.amount_cents;
    case 'income':
      return e.member_email ? 0 : e.amount_cents;
    case 'reimbursement':
      return -e.amount_cents;
    case 'contribution':
      return e.amount_cents;
  }
}

/**
 * Quanto questa riga muove il saldo del membro, in centesimi.
 * Positivo = il club gli deve dei soldi. Negativo = li deve lui al club.
 */
export function memberDelta(e: Entry): number {
  if (!e.member_email) return 0;
  switch (e.entry_type) {
    case 'expense':
      return e.amount_cents; // ha anticipato: il club gli deve
    case 'income':
      return -e.amount_cents; // ha incassato: deve girarli al club
    case 'reimbursement':
      return -e.amount_cents; // il club gli ha ridato i soldi
    case 'contribution':
      return e.amount_cents; // ha versato al club
  }
}

/* ── I totali ─────────────────────────────────────────────────────── */

export interface Balances {
  /** Soldi effettivamente sul conto del club, in centesimi. */
  clubCash: number;
  /** Per email: positivo = il club gli deve. */
  members: Record<string, number>;
  /** Totale dovuto ai membri che hanno anticipato. */
  owedToMembers: number;
  /** Totale che i membri devono al club. */
  owedByMembers: number;
  /** Entrate e uscite complessive, chiunque le abbia materialmente mosse. */
  totalIncome: number;
  totalExpense: number;
  /** Quanto vale il club: cassa meno i debiti verso i membri. */
  equity: number;
}

export function computeBalances(entries: Entry[]): Balances {
  let clubCash = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  const members: Record<string, number> = {};

  for (const e of entries) {
    clubCash += clubCashDelta(e);
    if (e.member_email) {
      members[e.member_email] = (members[e.member_email] ?? 0) + memberDelta(e);
    }
    if (e.entry_type === 'income') totalIncome += e.amount_cents;
    if (e.entry_type === 'expense') totalExpense += e.amount_cents;
  }

  let owedToMembers = 0;
  let owedByMembers = 0;
  for (const v of Object.values(members)) {
    if (v > 0) owedToMembers += v;
    else if (v < 0) owedByMembers += -v;
  }

  return {
    clubCash,
    members,
    owedToMembers,
    owedByMembers,
    totalIncome,
    totalExpense,
    equity: clubCash - (owedToMembers - owedByMembers),
  };
}

/**
 * La verifica che deve sempre tornare.
 *
 *   cassa − (quello che il club deve ai membri, al netto) = entrate − uscite
 *
 * Rimborsi e versamenti spostano soldi fra la cassa e le tasche dei
 * membri senza creare né distruggere valore, quindi si annullano da
 * soli e non compaiono qui. Se questa uguaglianza non regge, da
 * qualche parte c'è una riga che racconta una cosa impossibile, e il
 * posto giusto per accorgersene è lo schermo, non un foglio Excel sei
 * mesi dopo.
 */
export function checkBooks(entries: Entry[]): { ok: boolean; drift: number; balances: Balances } {
  const b = computeBalances(entries);
  const drift = b.equity - (b.totalIncome - b.totalExpense);
  return { ok: drift === 0, drift, balances: b };
}

/* ── Euro e centesimi ─────────────────────────────────────────────── */

/**
 * Da quello che si scrive in un campo a centesimi interi.
 * Accetta "12,50" e "12.50", e arrotonda al centesimo una volta sola.
 */
export function toCents(input: string | number): number | null {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * 100);
  }
  const cleaned = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!cleaned || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Formattazione italiana scritta a mano, non delegata a `toLocaleString`.
 *
 * Non è pedanteria: la formattazione per lingua dipende dai dati ICU
 * presenti nell'ambiente, e un Node compilato con ICU ridotto scrive
 * "1234,56 €" invece di "1.234,56 €". Su una cifra di denaro il
 * risultato non può dipendere da come è stato compilato chi la stampa.
 */
export function formatEur(cents: number, withSign = false): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const units = Math.floor(abs / 100);
  const decimals = String(abs % 100).padStart(2, '0');

  const grouped = String(units).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = negative ? '−' : withSign && cents > 0 ? '+' : '';

  return `${sign}${grouped},${decimals} €`;
}
