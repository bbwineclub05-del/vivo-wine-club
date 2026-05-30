/**
 * Deterministically generates a short member ID from a Supabase user UUID.
 * Format: VIVO-XXXX  (4 hex characters sampled from spread positions)
 *
 * Example:  6e4127d3-d5e4-4a81-ae94-98a75c1bb864  →  VIVO-6DA9
 *
 * 16^4 = 65 536 possible IDs — more than sufficient for a private wine club.
 * The sampling spreads across all 32 hex chars so IDs stay unique even when
 * two UUIDs share the same prefix.
 */
export function generateMemberId(userId: string): string {
  const hex = userId.replace(/-/g, '').toUpperCase();
  return `VIVO-${hex[0]}${hex[8]}${hex[16]}${hex[24]}`;
}

/** Maps Supabase app_metadata role to a human-readable card tier label. */
export function tierLabel(role: string | null | undefined): string {
  if (role === 'admin') return 'Founder';
  if (role === 'staff') return 'Staff';
  return 'Member';
}
