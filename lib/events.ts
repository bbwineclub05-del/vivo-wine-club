export type EventStatus   = 'open' | 'soldout' | 'soon' | 'completed';
export type DisplayStatus = 'open' | 'soldout' | 'soon' | 'past' | 'closed';
export type EventSection  = 'wine_party' | 'wine_lounge' | 'winery_visit' | 'general';

/* ── DB row type (Supabase `events` table) ── */
export interface DbEvent {
  id: string;
  slug: string;
  title: string;
  type: string;
  section: EventSection;
  date: string;              // ISO: "2026-05-12"
  time: string | null;       // "19:00"
  location: string;          // short
  location_full: string;     // full address
  description: string;
  price: number;             // EUR, 0 = free
  capacity: number | null;
  status: EventStatus;
  published: boolean;
  title_strikethrough: boolean;
  image_url: string | null;
  location_map_url: string | null;
  parking_map_url: string | null;
  parking_map_url_2: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  sort_order: number;
  guest_list_enabled?: boolean;
  is_list_only?: boolean;        // true = no checkout, show guest registration form
  referral_enabled?: boolean;    // true = referral widget shown after paid checkout
  registration_closed?: boolean; // true = registrations/checkout manually closed by admin
  created_at: string;
  updated_at?: string;
}

/** Infer section from event type string (fallback for DB rows without section) */
export function sectionFromType(type: string): EventSection {
  const t = type.toUpperCase();
  if (t.includes('PARTY'))                    return 'wine_party';
  if (t.includes('WINERY') || t.includes('VISIT')) return 'winery_visit';
  if (t.includes('APERITIF') || t.includes('LOUNGE') || t.includes('COLLAB')) return 'wine_lounge';
  return 'general';
}

/** Convert a DB row to the EventData shape used by checkout / PDF / emails */
export function dbEventToEventData(e: DbEvent): EventData {
  const d = new Date(e.date + 'T12:00:00Z'); // noon UTC avoids DST edge cases
  return {
    slug:                e.slug,
    title:               e.title,
    type:                e.type,
    section:             e.section ?? sectionFromType(e.type),
    date:                e.date,
    month:               d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
    day:                 String(d.getUTCDate()).padStart(2, '0'),
    year:                String(d.getUTCFullYear()),
    time:                e.time ?? null,
    location:            e.location,
    locationFull:        e.location_full,
    description:         e.description,
    price:               e.price,
    status:              e.status,
    titleStrikethrough:  e.title_strikethrough,
    image_url:           e.image_url,
    isListOnly:          e.is_list_only ?? false,
    referralEnabled:     e.referral_enabled ?? false,
    registrationClosed:  e.registration_closed ?? false,
  };
}

/**
 * Compute the effective display status of an event.
 * Checks in order: date past → manually closed → soldout → soon → open
 */
export function getEventDisplayStatus(
  event: { status: EventStatus; date: string; registrationClosed?: boolean },
  today: string,
): DisplayStatus {
  if (event.date.slice(0, 10) < today) return 'past';
  if (event.status === 'completed') return 'past';
  if (event.registrationClosed) return 'closed';
  if (event.status === 'soldout') return 'soldout';
  if (event.status === 'soon') return 'soon';
  return 'open';
}

export interface EventData {
  slug: string;
  title: string;
  type: string;
  section?: EventSection;
  date: string;              // ISO "YYYY-MM-DD" — raw DB value
  month: string;
  day: string;
  year: string;
  time: string | null;
  location: string;
  locationFull: string;
  description: string;
  price: number;
  status: EventStatus;
  titleStrikethrough?: boolean;
  image_url?: string | null;
  isListOnly?: boolean;
  referralEnabled?: boolean;
  registrationClosed?: boolean;
}

/**
 * Merge DB events + static events.
 * DB events take precedence: any static event whose slug already
 * appears in the DB list is dropped.
 * Result sorted ascending by date then title.
 */
export function mergeEvents(dbEvents: EventData[], staticEvents: EventData[]): EventData[] {
  const dbSlugs = new Set(dbEvents.map((e) => e.slug));
  const merged  = [...dbEvents, ...staticEvents.filter((e) => !dbSlugs.has(e.slug))];
  return merged.sort((a, b) => {
    const da = new Date(`${a.year}-${monthIndex(a.month)}-${a.day}`).getTime();
    const db_ = new Date(`${b.year}-${monthIndex(b.month)}-${b.day}`).getTime();
    return da - db_ || a.title.localeCompare(b.title);
  });
}

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function monthIndex(m: string): string {
  const i = MONTHS.indexOf(m.toUpperCase());
  return String(i === -1 ? 1 : i + 1).padStart(2, '0');
}
