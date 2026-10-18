/**
 * The information architecture of the reserved area.
 *
 * The old sidebar listed twenty destinations in one column, with two
 * collapsible groups and a third level of tabs inside the CRM, ordered by
 * what things *are* rather than by what someone came in to do.
 *
 * Here there are twelve destinations, each tagged by rhythm:
 *
 *   `bar`   the four you switch between constantly. Bottom tabs on a
 *           phone, the top of the rail on a desktop.
 *   `main`  opened most weeks. Still in the rail, below a divider.
 *   `rest`  everything else. Reachable from "Tutto" and from search,
 *           never in the way.
 *
 * Sections that used to be separate rows are now tabs inside one
 * destination (Finance holds transactions, balance and quotes; Sito
 * holds news, media and the public map). That is one level of depth,
 * never two.
 */

/** Board is the five founders; staff is everyone else with access. */
export type AdminRole = 'board' | 'staff';

export type Rhythm = 'bar' | 'main' | 'rest';

export interface AdminTab {
  id: string;
  label: string;
}

export interface AdminDestination {
  id: string;
  label: string;
  /** One line, so a label never has to carry the meaning alone. */
  hint: string;
  rhythm: Rhythm;
  /** Omitted means everyone who can reach the area. */
  roles?: AdminRole[];
  /** Where it sits for staff, when that differs from the board. */
  staffRhythm?: Rhythm;
  /** Tabs rendered inside the destination. One level, never nested. */
  tabs?: AdminTab[];
  /** Extra words that should match in search. */
  search?: string[];
}

export const DESTINATIONS: AdminDestination[] = [
  // ── The daily four ──────────────────────────────────────────────────
  {
    id: 'events',
    label: 'Eventi',
    hint: 'Date, biglietti, liste ospiti e partner',
    rhythm: 'bar',
    search: ['biglietti', 'lista', 'ospiti', 'checkin', 'party', 'lounge', 'visite'],
  },
  {
    id: 'merch',
    label: 'Merch',
    hint: 'Prodotti, taglie, giacenze e ordini',
    rhythm: 'bar',
    search: ['shop', 'prodotti', 'ordini', 'magazzino', 'stock', 'taglie'],
  },
  { id: 'tasks', label: 'Task', hint: 'Cosa deve fare il team', rhythm: 'bar', search: ['todo', 'bacheca'] },
  {
    id: 'ped',
    label: 'PED',
    hint: 'Piano editoriale e calendario contenuti',
    rhythm: 'bar',
    search: ['calendario', 'contenuti', 'post', 'reel', 'instagram', 'editoriale'],
  },

  // ── Weekly ──────────────────────────────────────────────────────────
  {
    id: 'membership',
    label: 'Membership',
    hint: 'Richieste di iscrizione da valutare',
    rhythm: 'main',
    search: ['pipeline', 'membri', 'iscrizioni', 'candidature'],
  },
  {
    // Quotes used to be a separate row; it belongs with the money.
    id: 'finance',
    label: 'Finance',
    hint: 'Transazioni, bilancio e preventivi',
    // Everyone can open it. The board finds it in the rail; staff find
    // it further down, under "Tutto", because they consult it rather
    // than work in it.
    rhythm: 'main',
    staffRhythm: 'rest',
    tabs: [
      { id: 'transazioni', label: 'Transazioni' },
      { id: 'bilancio', label: 'Bilancio' },
      { id: 'preventivi', label: 'Preventivi' },
    ],
    search: ['soldi', 'pagamenti', 'stripe', 'incassi', 'spese', 'conti', 'preventivi', 'offerte'],
  },
  {
    id: 'documents',
    label: 'Documenti',
    hint: 'Contratti, fatture e allegati',
    rhythm: 'main',
    search: ['contratti', 'fatture', 'file', 'allegati'],
  },
  {
    id: 'crm',
    label: 'CRM',
    hint: 'Membri, clienti, sponsor, cantine, influencer',
    rhythm: 'main',
    tabs: [
      { id: 'membri', label: 'Membri' },
      { id: 'clienti', label: 'Clienti' },
      { id: 'sponsors', label: 'Sponsor' },
      { id: 'vino', label: 'Contatti vino' },
      { id: 'bordeaux', label: 'Produttori BDX' },
      { id: 'influencer', label: 'Influencer' },
    ],
    search: ['contatti', 'sponsor', 'clienti', 'influencer', 'bordeaux', 'produttori', 'rubrica'],
  },
  {
    id: 'applications',
    label: 'Application',
    hint: 'Candidature ambassador e creator',
    rhythm: 'main',
    search: ['ambassador', 'creator', 'candidature'],
  },

  // ── Everything else ─────────────────────────────────────────────────
  {
    // News, media and the public map were three rows for the same job:
    // what the site shows.
    id: 'site',
    label: 'Sito',
    hint: 'News, media e mappa cantine pubblica',
    rhythm: 'rest',
    tabs: [
      { id: 'news', label: 'News' },
      { id: 'media', label: 'Media' },
      { id: 'wineries', label: 'Mappa cantine' },
    ],
    search: ['news', 'articoli', 'foto', 'video', 'immagini', 'mappa', 'tenute', 'gallery'],
  },
  {
    id: 'offers',
    label: 'Sconti e upsell',
    hint: 'Codici sconto e proposte al checkout',
    rhythm: 'rest',
    tabs: [
      { id: 'discounts', label: 'Sconti' },
      { id: 'upsell', label: 'Upsell' },
    ],
    search: ['codici', 'promo', 'promozioni', 'upsell'],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    hint: 'Visite al sito e provenienza',
    rhythm: 'rest',
    search: ['statistiche', 'traffico', 'visite'],
  },
  {
    id: 'team',
    label: 'Team',
    hint: 'Chi ha accesso e con quali permessi',
    rhythm: 'rest',
    roles: ['board'],
    search: ['permessi', 'staff', 'accessi'],
  },
];

/**
 * Under the profile avatar, not in the navigation: consulted now and
 * then, never worked in. The Wine Assistant keeps its floating button
 * on the page and is not a destination at all.
 */
export const PROFILE_ITEMS = [
  { id: 'overview', label: 'Riepilogo', hint: 'I numeri di oggi in breve' },
  { id: 'settings', label: 'Impostazioni', hint: 'Password e preferenze' },
] as const;

/** The rhythm a destination has for this role. */
export function rhythmFor(d: AdminDestination, role: AdminRole): Rhythm {
  return role === 'staff' && d.staffRhythm ? d.staffRhythm : d.rhythm;
}

export function destinationsFor(role: AdminRole): AdminDestination[] {
  return DESTINATIONS.filter((d) => !d.roles || d.roles.includes(role));
}

/** The four bottom tabs. Identical for board and staff. */
export function barFor(role: AdminRole): AdminDestination[] {
  return destinationsFor(role).filter((d) => rhythmFor(d, role) === 'bar');
}

/** Shown in the rail under the divider: the weekly ones. */
export function mainFor(role: AdminRole): AdminDestination[] {
  return destinationsFor(role).filter((d) => rhythmFor(d, role) === 'main');
}

/** Only in "Tutto" and in search. */
export function restFor(role: AdminRole): AdminDestination[] {
  return destinationsFor(role).filter((d) => rhythmFor(d, role) === 'rest');
}

/** Everything that is not a bottom tab, weekly ones first. */
export function beyondBarFor(role: AdminRole): AdminDestination[] {
  return [...mainFor(role), ...restFor(role)];
}

/** Loose match over label, hint, tab labels and keywords. */
export function searchDestinations(role: AdminRole, query: string): AdminDestination[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return destinationsFor(role).filter((d) =>
    [d.label, d.hint, ...(d.tabs ?? []).map((t) => t.label), ...(d.search ?? [])].some((s) =>
      s.toLowerCase().includes(q),
    ),
  );
}

export function findDestination(id: string): AdminDestination | undefined {
  return DESTINATIONS.find((d) => d.id === id);
}
