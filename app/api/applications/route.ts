import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth-guard';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
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
