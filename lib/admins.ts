/**
 * Who sits on the board, and the emergency floor under the permission
 * system.
 *
 * The list below is NOT the permission system. Day-to-day access is the
 * `team_members` table, edited in Team Management: that is where someone
 * is activated, deactivated, or given a section. This file only answers
 * "who is on the board", which decides menu prominence and who may edit
 * the team itself.
 *
 * It stays hardcoded on purpose, as the floor that makes it impossible
 * to lock the board out of its own back office if the table is ever
 * wrong or unreachable. It must never be used to *grant* access to
 * someone the table has deactivated: see `lib/access.ts`.
 */

/** The board: the five people who run the club. */
export const ADMIN_EMAILS = [
  'giacomogallo1310@gmail.com',
  'filippo.lombardi890@gmail.com',
  'cristianomichelotti@gmail.com',
  'lorenzofioretti2001@gmail.com',
  'francesco.basile@luniversotuo.it',
];

export const SUPER_ADMIN_EMAIL = 'giacomogallo1310@gmail.com';

/**
 * The three founders. Used for authorship and for the public page, and
 * deliberately not for permissions: operationally a founder can do
 * exactly what the rest of the board can do, no more.
 */
export const FOUNDERS: { name: string; email: string }[] = [
  { name: 'Giacomo Gallo', email: 'giacomogallo1310@gmail.com' },
  { name: 'Filippo Lombardi', email: 'filippo.lombardi890@gmail.com' },
  { name: 'Cristiano Michelotti', email: 'cristianomichelotti@gmail.com' },
];

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email);
}

export function isSuperAdmin(email: string): boolean {
  return email === SUPER_ADMIN_EMAIL;
}

/**
 * Finance is no longer a separate whitelist. Everyone who can reach the
 * reserved area can open it; the board simply finds it in the rail while
 * staff find it further down, under "Tutto".
 *
 * Kept as a function so the call sites do not change, and so a future
 * restriction has one place to live.
 */
export function isFinanceUser(_email: string): boolean {
  return true;
}
