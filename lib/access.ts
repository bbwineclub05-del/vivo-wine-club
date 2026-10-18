import { isAdminEmail, isSuperAdmin } from '@/lib/admins';

/**
 * The single place that answers "can this person open this section".
 *
 * Before, the same question was answered in three files with three
 * different rules, and the hardcoded board list was checked *before* the
 * table. That is why deactivating someone in Team Management appeared to
 * do nothing: the list still let them in.
 *
 * Here the table is binding. The hardcoded list decides seniority, never
 * admission, with exactly one exception written down below.
 */

/** Every gate the area can apply, one per destination. */
export const PERMISSION_KEYS = [
  'events',
  'merch',
  'tasks',
  'ped',
  'membership',
  'finance',
  'documents',
  'crm',
  'applications',
  'site',
  'offers',
  'analytics',
  'scanner',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type Permissions = Partial<Record<string, boolean>>;

/**
 * Which gate each section sits behind.
 *
 * Every section is mapped on purpose. Previously eight of them were
 * missing from this map and the code let anything unmapped through, so
 * PED, Application and Preventivi ignored Team Management entirely.
 *
 * `team` is absent by design: managing the team is board-only and is not
 * something a toggle can grant.
 */
export const SECTION_PERMISSION: Record<string, PermissionKey> = {
  events: 'events',
  merch: 'merch',
  tasks: 'tasks',
  ped: 'ped',
  membership: 'membership',
  pipeline: 'membership', // old id, kept so existing links keep working
  finance: 'finance',
  bilancio: 'finance',
  quotes: 'finance',
  documents: 'documents',
  crm: 'crm',
  applications: 'applications',
  site: 'site',
  news: 'site',
  media: 'site',
  wineries: 'site',
  offers: 'offers',
  discounts: 'offers',
  upsell: 'offers',
  analytics: 'analytics',
};

/** Sections anyone who got through the door may open. */
const ALWAYS_OPEN = new Set(['overview', 'settings', 'wine-assistant']);

/** Only the board sees these, and no toggle can hand them over. */
const BOARD_ONLY = new Set(['team']);

export interface TeamRow {
  role?: string | null;
  active?: boolean | null;
  permissions?: Permissions | null;
}

export interface Access {
  /** False means the account is switched off: nothing opens. */
  active: boolean;
  board: boolean;
  can: (section: string) => boolean;
}

/**
 * `row` is the person's line in `team_members`, or null when they have
 * none yet.
 */
export function resolveAccess(email: string, row: TeamRow | null): Access {
  // The one hardcoded exception, and the reason the list still exists:
  // the super admin can never be locked out of the back office, however
  // wrong or unreachable the table is.
  if (isSuperAdmin(email)) {
    return { active: true, board: true, can: () => true };
  }

  // The table is binding for everyone else, board included. Someone
  // switched off in Team Management is switched off, full stop.
  if (row && row.active === false) {
    return { active: false, board: false, can: () => false };
  }

  const board = isAdminEmail(email) || row?.role === 'admin';

  // Someone with no row at all is not a member of the team. The board
  // still gets in, so a newly added founder is not locked out while the
  // table catches up.
  if (!row && !board) {
    return { active: false, board: false, can: () => false };
  }

  const permissions = row?.permissions ?? {};

  return {
    active: true,
    board,
    can(section: string) {
      if (ALWAYS_OPEN.has(section)) return true;
      if (BOARD_ONLY.has(section)) return board;
      if (board) return true;

      const key = SECTION_PERMISSION[section];
      // An unmapped section is a bug, not an invitation: deny and let it
      // surface rather than quietly granting access.
      if (!key) return false;

      // Absent means never configured, so it stays open; only an explicit
      // false closes it. That way switching a toggle off is immediately
      // binding without silently locking everyone out of the sections
      // that had no key until today.
      return permissions[key] !== false;
    },
  };
}

/** Every gate open. Used when seeding a new board member's row. */
export function fullPermissions(): Record<PermissionKey, boolean> {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])) as Record<PermissionKey, boolean>;
}
