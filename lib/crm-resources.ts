import type { ResourceDef } from '@/components/admin/RecordTable';
import type { Record_ } from '@/lib/crm';

/**
 * Le quattro rubriche, descritte invece che programmate.
 *
 * Erano quattro componenti da ventimila byte l'uno che facevano la
 * stessa cosa — elenco, ricerca, modulo, elimina — ognuno a modo suo,
 * con quattro bug diversi da sistemare quattro volte. Qui restano
 * quattro descrizioni: quali colonne si vedono, quali campi si
 * modificano, dove sta l'indirizzo. Il comportamento è uno solo.
 *
 * Aggiungere una rubrica domani vuol dire aggiungere un oggetto qui.
 */

const s = (v: unknown) => (v == null ? '' : String(v));

/* ── Sponsor ──────────────────────────────────────────────────────── */
export const SPONSORS: ResourceDef<Record_> = {
  label: 'Sponsor',
  singular: 'sponsor',
  subtitle: 'Chi mette soldi o servizi nel club, e a che punto è il rapporto.',
  endpoint: '/api/crm/sponsors',
  listKey: 'sponsors',
  title: (r) => s(r.name) || 'Senza nome',
  secondary: (r) => [s(r.city), s(r.email)].filter(Boolean).join(' · '),
  email: (r) => s(r.email) || null,
  columns: [
    { key: 'name', label: 'Nome', value: (r) => s(r.name), wide: true },
    { key: 'city', label: 'Città', value: (r) => s(r.city) },
    { key: 'email', label: 'Email', value: (r) => s(r.email), secondary: true },
    { key: 'phone', label: 'Telefono', value: (r) => s(r.phone), secondary: true },
  ],
  fields: [
    { key: 'name', label: 'Nome', placeholder: 'Ragione sociale' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Telefono', type: 'tel' },
    { key: 'city', label: 'Città' },
    { key: 'website', label: 'Sito', type: 'url', placeholder: 'https://' },
    { key: 'notes', label: 'Note', type: 'textarea' },
  ],
};

/* ── Cantine ──────────────────────────────────────────────────────── */
export const CANTINE: ResourceDef<Record_> = {
  label: 'Cantine',
  singular: 'contatto',
  subtitle: 'Produttori e persone del vino, con chi li segue e quando risentirli.',
  endpoint: '/api/crm/wine',
  listKey: 'contacts',
  title: (r) => s(r.company) || s(r.people) || 'Senza nome',
  secondary: (r) => [s(r.people), s(r.role)].filter(Boolean).join(' · '),
  email: (r) => s(r.email) || null,
  columns: [
    { key: 'company', label: 'Cantina', value: (r) => s(r.company), wide: true },
    { key: 'people', label: 'Persona', value: (r) => s(r.people) },
    { key: 'place', label: 'Zona', value: (r) => s(r.place), secondary: true },
    { key: 'role', label: 'Ruolo', value: (r) => s(r.role), secondary: true },
  ],
  fields: [
    { key: 'company', label: 'Cantina' },
    { key: 'people', label: 'Persona' },
    { key: 'role', label: 'Ruolo' },
    { key: 'place', label: 'Zona' },
    // Queste due non esistevano: quaranta contatti e nessun recapito.
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Telefono', type: 'tel' },
    { key: 'source', label: 'Come li abbiamo trovati', placeholder: 'LinkedIn, passaparola…' },
    { key: 'applied', label: 'Primo contatto', type: 'date' },
    { key: 'notes', label: 'Note', type: 'textarea' },
  ],
};

/* ── Produttori di Bordeaux ───────────────────────────────────────── */
export const BORDEAUX: ResourceDef<Record_> = {
  label: 'Produttori Bordeaux',
  singular: 'produttore',
  subtitle: 'Gli château e le persone di riferimento.',
  endpoint: '/api/crm/bordeaux',
  listKey: 'contacts',
  title: (r) => s(r.company) || s(r.name) || 'Senza nome',
  secondary: (r) => [s(r.name), s(r.email)].filter(Boolean).join(' · '),
  email: (r) => s(r.email) || null,
  columns: [
    { key: 'company', label: 'Château', value: (r) => s(r.company), wide: true },
    { key: 'name', label: 'Referente', value: (r) => s(r.name) },
    { key: 'email', label: 'Email', value: (r) => s(r.email), secondary: true },
    { key: 'phone', label: 'Telefono', value: (r) => s(r.phone), secondary: true },
  ],
  fields: [
    { key: 'company', label: 'Château' },
    { key: 'name', label: 'Referente' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Telefono', type: 'tel' },
    // Resta testo libero: in archivio ci sono valori come "22/04/2026"
    // e trasformarli in date adesso significherebbe perderne qualcuno.
    { key: 'last_follow_up', label: 'Ultimo contatto', hint: '— testo libero' },
    { key: 'note', label: 'Note', type: 'textarea' },
  ],
};

/* ── Influencer ───────────────────────────────────────────────────── */
export const INFLUENCER: ResourceDef<Record_> = {
  label: 'Influencer',
  singular: 'influencer',
  subtitle: 'Creator e profili con cui collaboriamo o vorremmo collaborare.',
  endpoint: '/api/crm/influencers',
  listKey: 'contacts',
  title: (r) => [s(r.first_name), s(r.last_name)].filter(Boolean).join(' ') || 'Senza nome',
  secondary: (r) => [s(r.instagram), s(r.followers) && `${s(r.followers)} follower`]
    .filter(Boolean)
    .join(' · '),
  email: (r) => s(r.email) || null,
  columns: [
    {
      key: 'name',
      label: 'Nome',
      value: (r) => [s(r.first_name), s(r.last_name)].filter(Boolean).join(' '),
      wide: true,
    },
    { key: 'instagram', label: 'Instagram', value: (r) => s(r.instagram) },
    { key: 'followers', label: 'Follower', value: (r) => s(r.followers), secondary: true },
    { key: 'email', label: 'Email', value: (r) => s(r.email), secondary: true },
  ],
  fields: [
    { key: 'first_name', label: 'Nome' },
    { key: 'last_name', label: 'Cognome' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Telefono', type: 'tel' },
    { key: 'instagram', label: 'Instagram', placeholder: '@' },
    { key: 'tiktok', label: 'TikTok', placeholder: '@' },
    { key: 'followers', label: 'Follower', type: 'number' },
    { key: 'notes', label: 'Note', type: 'textarea' },
  ],
};

/* ── Liste fatte a mano ───────────────────────────────────────────── */

/**
 * Le liste personalizzate del CRM: "General", "DJ", "VIVO x La Macchia".
 *
 * Sono elenchi di persone messi insieme a mano per un'occasione, non
 * trattative: per questo `pipeline: false`. Non hanno uno stato da far
 * avanzare, e la tabella sotto non avrebbe nemmeno le colonne per
 * salvarlo.
 *
 * Il nome della lista arriva da fuori perché ogni lista è una rubrica
 * a sé, con il proprio indirizzo sotto `/api/crm/categories/<id>`.
 */
export function listaPersonalizzata(id: string, name: string): ResourceDef<Record_> {
  return {
    label: name,
    singular: 'contatto',
    subtitle: 'Una lista messa insieme a mano. Chi è nato da un biglietto sta anche in Persone.',
    endpoint: `/api/crm/categories/${id}/contacts`,
    listKey: 'contacts',
    pipeline: false,
    title: (r) =>
      [s(r.first_name), s(r.last_name)].filter(Boolean).join(' ') || s(r.email) || 'Senza nome',
    secondary: (r) => [s(r.email), s(r.phone)].filter(Boolean).join(' · '),
    email: (r) => s(r.email) || null,
    columns: [
      {
        key: 'name',
        label: 'Nome',
        value: (r) => [s(r.first_name), s(r.last_name)].filter(Boolean).join(' '),
        wide: true,
      },
      { key: 'email', label: 'Email', value: (r) => s(r.email) },
      { key: 'phone', label: 'Telefono', value: (r) => s(r.phone), secondary: true },
      { key: 'notes', label: 'Note', value: (r) => s(r.notes), secondary: true },
    ],
    fields: [
      { key: 'first_name', label: 'Nome' },
      { key: 'last_name', label: 'Cognome' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Telefono', type: 'tel' },
      { key: 'notes', label: 'Note', type: 'textarea' },
    ],
  };
}

/* ── Candidature ──────────────────────────────────────────────────── */

/**
 * Chi si è proposto per lavorare con il club.
 *
 * Quattro elenchi sopra una tabella sola: stanno tutti in
 * `collaboration_applications` e si distinguono per il tipo, ma si
 * guardano separatamente — chi cerca un ambassador non vuole
 * scorrere le aziende.
 *
 * I campi visibili cambiano con il tipo, come nel modulo pubblico: un
 * creator ha i follower, un'azienda la ragione sociale.
 */
type Kind = 'ambassador' | 'company' | 'creator' | 'staff';

const KIND_LABEL: Record<Kind, string> = {
  ambassador: 'Ambassador',
  company: 'Aziende',
  creator: 'Creator',
  staff: 'Staff',
};

const KIND_SUBTITLE: Record<Kind, string> = {
  ambassador: 'Chi vuole portare VIVO nella propria città.',
  company: 'Cantine, locali e marchi che vogliono lavorare con noi.',
  creator: 'Creator e influencer che vogliono entrare nel portafoglio.',
  staff: 'Chi vuole far parte del team.',
};

/** Le colonne che hanno senso per ciascun tipo. */
const KIND_COLUMNS: Record<Kind, { key: string; label: string; secondary?: boolean }[]> = {
  ambassador: [
    { key: 'city', label: 'Città' },
    { key: 'instagram', label: 'Instagram', secondary: true },
  ],
  company: [
    { key: 'company', label: 'Azienda' },
    { key: 'role', label: 'Ruolo', secondary: true },
  ],
  creator: [
    { key: 'instagram', label: 'Instagram' },
    { key: 'followers', label: 'Follower', secondary: true },
  ],
  staff: [
    { key: 'city', label: 'Città' },
    { key: 'role', label: 'Ruolo', secondary: true },
  ],
};

const KIND_FIELDS: Record<Kind, FieldDefLite[]> = {
  ambassador: [
    { key: 'city', label: 'Città' },
    { key: 'country', label: 'Paese' },
    { key: 'instagram', label: 'Instagram' },
  ],
  company: [
    { key: 'company', label: 'Azienda' },
    { key: 'role', label: 'Ruolo' },
    { key: 'website', label: 'Sito', type: 'url' },
  ],
  creator: [
    { key: 'city', label: 'Città' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'followers', label: 'Follower', type: 'number' },
  ],
  staff: [
    { key: 'city', label: 'Città' },
    { key: 'role', label: 'Ruolo' },
  ],
};

type FieldDefLite = { key: string; label: string; type?: 'text' | 'url' | 'number' | 'textarea' };

export function candidature(kind: Kind): ResourceDef<Record_> {
  return {
    label: KIND_LABEL[kind],
    singular: 'candidatura',
    subtitle: KIND_SUBTITLE[kind],
    endpoint: '/api/collaboration-applications',
    listKey: 'applications',
    filter: (r) => r.kind === kind,
    canCreate: false,
    title: (r) =>
      [s(r.first_name), s(r.last_name)].filter(Boolean).join(' ') || s(r.company) || s(r.email),
    secondary: (r) => [s(r.email), s(r.city) || s(r.company)].filter(Boolean).join(' · '),
    email: (r) => s(r.email) || null,
    columns: [
      {
        key: 'name',
        label: 'Nome',
        value: (r) =>
          [s(r.first_name), s(r.last_name)].filter(Boolean).join(' ') || s(r.company) || '—',
        wide: true,
      },
      ...KIND_COLUMNS[kind].map((c) => ({
        key: c.key,
        label: c.label,
        value: (r: Record_) => s(r[c.key]),
        secondary: c.secondary,
      })),
      { key: 'email', label: 'Email', value: (r) => s(r.email), secondary: true },
    ],
    fields: [
      { key: 'first_name', label: 'Nome' },
      { key: 'last_name', label: 'Cognome' },
      { key: 'phone', label: 'Telefono', type: 'tel' },
      ...KIND_FIELDS[kind],
      { key: 'message', label: 'Cosa ci ha scritto', type: 'textarea' },
      { key: 'notes', label: 'Note interne', type: 'textarea' },
    ],
  };
}
