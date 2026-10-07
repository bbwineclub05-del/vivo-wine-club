// Registry of application types shown in /members → Application.
// Each type maps a DB table to how it is listed and detailed. Adding a new
// application type = adding one entry to APPLICATION_TYPES; the API
// (/api/admin/applications) and the ApplicationsManager view read from here.

import { AMBASSADOR_AREAS, AMBASSADOR_AREA_OTHER, ambassadorAreaLabel } from '@/lib/ambassador';

export const APPLICATION_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly unknown[]).includes(value);
}

/** A row as returned by the API — always includes these, plus type-specific columns. */
export type ApplicationRow = {
  id: string;
  created_at: string;
  status: ApplicationStatus;
  staff_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  [column: string]: unknown;
};

export type DetailFieldKind = 'text' | 'long' | 'link' | 'date' | 'bool';

export interface DetailField {
  label: string;
  kind: DetailFieldKind;
  value: (row: ApplicationRow) => string | boolean | null;
}

export interface ApplicationType {
  key: string;
  label: string;
  table: string;
  /**
   * Explicit select list. Never use '*': it would expose columns such as
   * consent_ip, which must not leave the server.
   */
  columns: readonly string[];
  name: (row: ApplicationRow) => string;
  email: (row: ApplicationRow) => string;
  area?: {
    options: { value: string; label: string }[];
    value: (row: ApplicationRow) => string;
    label: (row: ApplicationRow) => string;
  };
  /** Extra list column (e.g. event types). */
  listExtra?: { label: string; value: (row: ApplicationRow) => string };
  detail: DetailField[];
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

const AMBASSADOR_EVENT_TYPE_LABELS: Record<string, string> = {
  party:  'Party',
  lounge: 'Lounge',
  visits: 'Visite in cantina',
  other:  'Altro',
};

const ambassadorAreaText = (row: ApplicationRow): string => {
  const area = String(row.area ?? '');
  return area === AMBASSADOR_AREA_OTHER
    ? `Altra area: ${str(row.area_other) ?? '—'}`
    : ambassadorAreaLabel(area, 'it');
};

const ambassadorEventTypes = (row: ApplicationRow): string =>
  (Array.isArray(row.event_types) ? row.event_types : [])
    .map((t) => AMBASSADOR_EVENT_TYPE_LABELS[String(t)] ?? String(t))
    .join(', ');

const AMBASSADOR: ApplicationType = {
  key: 'ambassador',
  label: 'Ambassador',
  table: 'ambassador_applications',
  columns: [
    'id', 'created_at', 'updated_at', 'status',
    'first_name', 'last_name', 'email', 'phone',
    'area', 'area_other', 'event_types',
    'experience', 'local_contacts', 'community',
    'linkedin_url', 'social_links', 'motivation', 'availability', 'languages', 'locale',
    'consent_privacy_accepted_at', 'consent_privacy_version', 'consent_age_confirmed',
    'staff_notes', 'reviewed_by', 'reviewed_at',
  ],
  name:  (row) => `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
  email: (row) => String(row.email ?? ''),
  area: {
    options: [
      ...AMBASSADOR_AREAS.map((a) => ({ value: a.value, label: a.label.it })),
      { value: AMBASSADOR_AREA_OTHER, label: 'Altra area' },
    ],
    value: (row) => String(row.area ?? ''),
    label: ambassadorAreaText,
  },
  listExtra: { label: 'Tipi di evento', value: ambassadorEventTypes },
  detail: [
    { label: 'Email',                       kind: 'text', value: (r) => str(r.email) },
    { label: 'Telefono',                    kind: 'text', value: (r) => str(r.phone) },
    { label: 'Area',                        kind: 'text', value: ambassadorAreaText },
    { label: 'Tipi di evento',              kind: 'text', value: ambassadorEventTypes },
    { label: 'Disponibilità',               kind: 'text', value: (r) => str(r.availability) },
    { label: 'Lingue',                      kind: 'text', value: (r) => str(r.languages) },
    { label: 'LinkedIn',                    kind: 'link', value: (r) => str(r.linkedin_url) },
    { label: 'Altri social',                kind: 'text', value: (r) => str(r.social_links) },
    { label: 'Esperienza',                  kind: 'long', value: (r) => str(r.experience) },
    { label: 'Perché vuole candidarsi',     kind: 'long', value: (r) => str(r.motivation) },
    { label: 'Contatti in zona',            kind: 'long', value: (r) => str(r.local_contacts) },
    { label: 'Community',                   kind: 'long', value: (r) => str(r.community) },
    { label: 'Lingua della pagina',         kind: 'text', value: (r) => str(r.locale) },
    { label: 'Privacy accettata',           kind: 'date', value: (r) => str(r.consent_privacy_accepted_at) },
    { label: 'Versione privacy',            kind: 'text', value: (r) => str(r.consent_privacy_version) },
    { label: 'Dichiara 18+',                kind: 'bool', value: (r) => r.consent_age_confirmed === true },
  ],
};

export const APPLICATION_TYPES: readonly ApplicationType[] = [AMBASSADOR];

export function getApplicationType(key: string | null | undefined): ApplicationType | undefined {
  return APPLICATION_TYPES.find((t) => t.key === key);
}

export const STAFF_NOTES_MAX = 5000;
