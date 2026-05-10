import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  try {
    const { data, error } = await db()
      .from('contacts_wine')
      .select('*')
      .order('applied', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ contacts: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  try {
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { applied, people, company, source, place, role, notes } = body;
    if (!company && !people) {
      return NextResponse.json({ error: 'people or company is required' }, { status: 400 });
    }

    const { data, error } = await db()
      .from('contacts_wine')
      .insert({ applied: applied || null, people: people || '', company: company || '', source: source || '', place: place || '', role: role || '', notes: notes || '' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ contact: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
