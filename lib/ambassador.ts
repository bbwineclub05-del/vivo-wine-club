// Ambassador application — editable configuration.
// Shared by the /collaborate/ambassador form and the /api/ambassador endpoint,
// so adding/removing an area here updates both the UI and server validation.

export type AmbassadorLocale = 'it' | 'en' | 'fr';

export const AMBASSADOR_LOCALES: readonly AmbassadorLocale[] = ['it', 'en', 'fr'];

/** Any value outside it/en/fr falls back to English. */
export function normalizeAmbassadorLocale(value: unknown): AmbassadorLocale {
  return (AMBASSADOR_LOCALES as readonly unknown[]).includes(value) ? (value as AmbassadorLocale) : 'en';
}

// Countries offered in the Ambassador form's country selector, in display
// order. `other` (below) always comes after these two.
const AMBASSADOR_COUNTRY_LABELS = {
  france: { it: 'Francia', en: 'France', fr: 'France' },
  italy:  { it: 'Italia',  en: 'Italy',  fr: 'Italie' },
} as const satisfies Record<string, Record<AmbassadorLocale, string>>;

export type AmbassadorCountry = keyof typeof AMBASSADOR_COUNTRY_LABELS;

export const AMBASSADOR_COUNTRIES = (Object.keys(AMBASSADOR_COUNTRY_LABELS) as AmbassadorCountry[]).map(
  (value) => ({ value, label: AMBASSADOR_COUNTRY_LABELS[value] }),
);

/** Always offered after the two countries above; requires a free-text area. */
export const AMBASSADOR_AREA_OTHER = 'other';

// Administrative regions offered once a candidate picks France or Italy.
// Kept in their native spelling for every language — only the country name
// itself (above) is translated.
const AMBASSADOR_REGIONS = {
  france: [
    'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire', 'Corse',
    'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine',
    'Occitanie', 'Pays de la Loire', "Provence-Alpes-Côte d'Azur",
  ],
  italy: [
    'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia',
    'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna',
    'Sicilia', 'Toscana', 'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto',
  ],
} as const satisfies Record<AmbassadorCountry, readonly string[]>;

/** "Île-de-France" → "ile-de-france" — used to build a stable, URL-safe value. */
function slugify(value: string): string {
  return value
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Geographic areas an ambassador can apply for: every France/Italy region
// (plus `other`, above, for anywhere else with a free-text area_other).
// `value` is what gets stored in the DB (and used in the staff email
// subject) — short, lowercase and stable; `label` is the "France — Region"
// text admins see; `region` is the plain region name shown once a country
// has already been picked in the form.
export const AMBASSADOR_AREAS = (Object.keys(AMBASSADOR_REGIONS) as AmbassadorCountry[]).flatMap((country) =>
  AMBASSADOR_REGIONS[country].map((region) => ({
    value: `${country}:${slugify(region)}`,
    country,
    region,
    label: {
      it: `${AMBASSADOR_COUNTRY_LABELS[country].it}, ${region}`,
      en: `${AMBASSADOR_COUNTRY_LABELS[country].en}, ${region}`,
      fr: `${AMBASSADOR_COUNTRY_LABELS[country].fr}, ${region}`,
    } as Record<AmbassadorLocale, string>,
  })),
);

export const AMBASSADOR_EVENT_TYPES = ['party', 'lounge', 'visits', 'other'] as const;
export type AmbassadorEventType = (typeof AMBASSADOR_EVENT_TYPES)[number];

export function isAmbassadorArea(value: string): boolean {
  return value === AMBASSADOR_AREA_OTHER || AMBASSADOR_AREAS.some((a) => a.value === value);
}

export function ambassadorAreaLabel(value: string, locale: AmbassadorLocale): string {
  return AMBASSADOR_AREAS.find((a) => a.value === value)?.label[locale] ?? value;
}

// Max lengths (characters), enforced client-side via maxLength and server-side.
export const AMBASSADOR_LIMITS = {
  name:         80,
  email:        200,
  phone:        40,
  areaOther:    120,
  longText:     3000, // experience, motivation
  mediumText:   2000, // local contacts, community
  linkedin:     300,
  social:       500,
  availability: 500,
  languages:    200,
} as const;

export const AMBASSADOR_RATE_LIMIT = {
  perIpPerHour:   3,
  perEmailPerDay: 2,
} as const;
