import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the service role key.
 * Lazy singleton — created on first call so missing env vars don't crash
 * the module at load time (which would break the entire API route).
 * Bypasses RLS — only use in API routes, never in client components.
 */
let _admin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
    _admin = createClient(url, key);
  }
  return _admin;
}
