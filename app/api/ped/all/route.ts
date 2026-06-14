import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/** GET /api/ped/all — all PED entries, no auth required (for TaskBoard calendar) */
export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (getSupabaseAdmin() as any)
      .from('ped_entries')
      .select('id, date, title, platform, content_type, status, assigned_to')
      .order('date', { ascending: true });

    if (error) {
      console.error('[ped/all]', error.message);
      return NextResponse.json({ entries: [] });
    }
    return NextResponse.json({ entries: data ?? [] });
  } catch (err) {
    console.error('[ped/all]', err);
    return NextResponse.json({ entries: [] });
  }
}
