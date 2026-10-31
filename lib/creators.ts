/**
 * The creator roster shown on /talents.
 *
 * Deliberately a plain list for now: the page reads it through
 * `getCreators()`, so moving it to a Supabase table with an admin screen
 * later is a change to this one function, not to the page.
 *
 * Nothing in here is real. Every entry is a placeholder in the shape the
 * finished roster will take; fill them in, or empty the array and the
 * page falls back to its "roster coming" state on its own.
 */

export type CreatorPlatform = 'instagram' | 'tiktok' | 'youtube';

export interface Creator {
  /** Stable key, also used in the URL if the roster ever gets detail pages. */
  slug: string;
  name: string;
  /** Without the @, e.g. "vivo.wineclub". */
  handle: string;
  /** What they are known for, in the candidate's own register. */
  niche: string;
  platforms: CreatorPlatform[];
  /** Path under /public, or null while there is no photo yet. */
  image: string | null;
  /** Shown only when set, so an unfilled roster never invents numbers. */
  reach?: string;
}

const ROSTER: Creator[] = [
  {
    slug: 'placeholder-1',
    name: '[Nome creator]',
    handle: '[handle]',
    niche: '[Di cosa parla]',
    platforms: ['instagram', 'tiktok'],
    image: null,
  },
  {
    slug: 'placeholder-2',
    name: '[Nome creator]',
    handle: '[handle]',
    niche: '[Di cosa parla]',
    platforms: ['instagram'],
    image: null,
  },
  {
    slug: 'placeholder-3',
    name: '[Nome creator]',
    handle: '[handle]',
    niche: '[Di cosa parla]',
    platforms: ['tiktok', 'youtube'],
    image: null,
  },
  {
    slug: 'placeholder-4',
    name: '[Nome creator]',
    handle: '[handle]',
    niche: '[Di cosa parla]',
    platforms: ['instagram', 'youtube'],
    image: null,
  },
];

export function getCreators(): Creator[] {
  return ROSTER;
}

export const PLATFORM_LABEL: Record<CreatorPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};
