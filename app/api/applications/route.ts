import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await db
      .from('applications')
      .select('id, name, email, phone, city, date_of_birth, source, experience, motivation, status, created_at')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ applications: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
