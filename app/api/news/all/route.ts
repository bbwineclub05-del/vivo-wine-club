import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Returns ALL news (including hidden) — for admin use only
export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const { data, error } = await db
      .from('news')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ news: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
