/**
 * Il CRM: tutto quello che vale per chiunque legga delle persone.
 *
 * Qui dentro c'è soprattutto una cosa: un modo di leggere una tabella
 * che non si ferma a mille righe.
 *
 * PostgREST, su cui gira Supabase, ha un tetto predefinito di 1000
 * righe per risposta, e non lo segnala: una `select` senza paginazione
 * restituisce le prime mille e tace. La tabella `customers` ne aveva
 * 1413, quindi 413 persone non arrivavano mai al CRM — e siccome
 * l'ordinamento era per data di ultimo acquisto, a sparire erano
 * sempre le più vecchie. Filtrare per "Bottenago" mostrava 270
 * partecipanti su 538: a metà delle persone non sarebbe arrivata
 * nessuna email, senza che niente lo facesse notare.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Queryable = any;

const PAGE = 1000;

/**
 * Legge una tabella intera, una pagina per volta.
 *
 * `build` riceve il client e deve restituire la query *senza* range:
 * ci pensa questa funzione a scorrerla fino in fondo.
 */
export async function fetchAllRows<T>(
  db: Queryable,
  build: (q: Queryable) => Queryable,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(db).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
    // Una tabella che cresce mentre la leggiamo non deve poter mandare
    // il ciclo all'infinito.
    if (out.length > 200_000) break;
  }
  return out;
}

/* ─────────────────────────────────────────────
   Le persone
───────────────────────────────────────────── */

export interface Person {
  id: string;
  email: string;
  name: string | null;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
  total_events: number | null;
  /** Gli slug degli eventi a cui ha partecipato. */
  events: string[] | null;
  /**
   * Ha spuntato la casella del marketing almeno una volta.
   *
   * Attenzione a come si legge il `false`. La casella è comparsa nei
   * moduli verso fine luglio 2026: per chi si è iscritto prima —
   * Terrace Party e Bottenago, settecento persone — non è un rifiuto,
   * è una domanda che nessuno ha fatto. Per chi è arrivato dopo, la
   * casella c'era, non era spuntata di default, e lasciarla vuota è
   * stata una scelta.
   */
  consent_marketing?: boolean;
}

/* ─────────────────────────────────────────────
   I gruppi
   Non categorie da assegnare a mano, ma domande a cui i dati
   rispondono già da soli: chi è venuto una volta sola, chi torna,
   chi non si vede da un po'.
───────────────────────────────────────────── */

export type SegmentId = 'all' | 'returning' | 'loyal' | 'once' | 'recent' | 'dormant';

export interface Segment {
  id: SegmentId;
  label: string;
  /** Una riga che spiega chi c'è dentro, perché il nome non basta. */
  hint: string;
  matches: (p: Person, now: number) => boolean;
}

const DAY = 86_400_000;

function lastSeen(p: Person): number | null {
  const d = p.last_purchase_at ?? p.first_purchase_at;
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
}

export const SEGMENTS: Segment[] = [
  {
    id: 'all',
    label: 'Tutti',
    hint: 'Chiunque sia passato da un evento.',
    matches: () => true,
  },
  {
    id: 'recent',
    label: 'Nuovi',
    hint: 'Primo evento negli ultimi 60 giorni.',
    matches: (p, now) => {
      const first = p.first_purchase_at ? new Date(p.first_purchase_at).getTime() : null;
      return first !== null && now - first <= 60 * DAY;
    },
  },
  {
    id: 'returning',
    label: 'Tornati',
    hint: 'Sono venuti almeno due volte.',
    matches: (p) => (p.total_events ?? p.events?.length ?? 0) >= 2,
  },
  {
    id: 'loyal',
    label: 'Fedeli',
    hint: 'Tre eventi o più.',
    matches: (p) => (p.total_events ?? p.events?.length ?? 0) >= 3,
  },
  {
    id: 'once',
    label: 'Una volta sola',
    hint: 'Un solo evento: sono quelli da riportare indietro.',
    matches: (p) => (p.total_events ?? p.events?.length ?? 0) === 1,
  },
  {
    id: 'dormant',
    label: 'Da riattivare',
    hint: 'Non si vedono da più di tre mesi.',
    // Tre mesi, non sei: il club fa eventi quasi ogni mese, quindi a
    // sei mesi la soglia non selezionava nessuno ed era un gruppo
    // inutile. A novanta giorni sono circa ottocento persone.
    matches: (p, now) => {
      const t = lastSeen(p);
      return t !== null && now - t > 90 * DAY;
    },
  },
];

/** Applica gruppo, evento e ricerca testuale, in quest'ordine. */
export function filterPeople(
  people: Person[],
  { segment, event, query }: { segment: SegmentId; event: string; query: string },
): Person[] {
  const now = Date.now();
  const seg = SEGMENTS.find((s) => s.id === segment) ?? SEGMENTS[0];
  const q = query.trim().toLowerCase();

  return people.filter((p) => {
    if (!seg.matches(p, now)) return false;
    if (event && !(p.events ?? []).includes(event)) return false;
    if (q && !(`${p.name ?? ''} ${p.email}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

/** Quante persone per evento, contate su tutta la rubrica. */
export function countByEvent(people: Person[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const p of people) {
    for (const e of p.events ?? []) map[e] = (map[e] ?? 0) + 1;
  }
  return map;
}

/** Da "vivo-wine-party-paris-oct-2026" a "Vivo Wine Party Paris Oct 2026". */
export function prettifySlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length <= 3 && /^[a-z]+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/** Scarta i duplicati e chi non ha un'email utilizzabile. */
export function mailable(people: Person[]): { email: string; name: string }[] {
  const seen = new Set<string>();
  const out: { email: string; name: string }[] = [];
  for (const p of people) {
    const email = (p.email ?? '').trim().toLowerCase();
    if (!email || !email.includes('@') || seen.has(email)) continue;
    seen.add(email);
    out.push({ email, name: (p.name ?? '').trim() || email.split('@')[0] });
  }
  return out;
}

/* ─────────────────────────────────────────────
   Le rubriche: sponsor, cantine, Bordeaux, influencer

   Quattro elenchi diversi, un solo modo di starci dentro. Uno stato
   che dice a che punto è il rapporto, una persona del team che se ne
   occupa, e una data in cui va ripreso in mano: è il minimo perché
   una rubrica smetta di essere un elenco e diventi un CRM.
───────────────────────────────────────────── */

export type Stage = 'new' | 'contacted' | 'talking' | 'active' | 'lost';

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: 'new', label: 'Da contattare', hint: 'Nessuno gli ha ancora scritto.' },
  { id: 'contacted', label: 'Contattato', hint: 'Primo contatto fatto, in attesa.' },
  { id: 'talking', label: 'In trattativa', hint: 'Se ne sta parlando.' },
  { id: 'active', label: 'Attivo', hint: 'Rapporto in piedi.' },
  { id: 'lost', label: 'Chiuso', hint: 'Non se n’è fatto niente.' },
];

export const STAGE_LABEL: Record<Stage, string> = Object.fromEntries(
  STAGES.map((s) => [s.id, s.label]),
) as Record<Stage, string>;

/** Una riga qualunque di una rubrica. */
export interface Record_ {
  id: string;
  stage?: Stage | null;
  owner_email?: string | null;
  next_action_at?: string | null;
  [key: string]: unknown;
}

/** Oggi in formato YYYY-MM-DD, ora locale. */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Da riprendere in mano: una prossima azione fissata per oggi o prima. */
export function isDue(r: Record_, today = todayISO()) {
  return !!r.next_action_at && r.next_action_at.slice(0, 10) <= today;
}
