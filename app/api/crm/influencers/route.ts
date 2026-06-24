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
      .from('contacts_influencers')
      .select('*')
      .order('last_name', { ascending: true });

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

    const { first_name, last_name, email, phone, instagram, tiktok, followers, notes, status, last_contact_date } = body;
    if (!first_name && !last_name) {
      return NextResponse.json({ error: 'first_name or last_name is required' }, { status: 400 });
    }

    const { data, error } = await db()
      .from('contacts_influencers')
      .insert({
        first_name:        first_name        ?? '',
        last_name:         last_name         ?? '',
        email:             email             ?? '',
        phone:             phone             ?? '',
        instagram:         instagram         ?? '',
        tiktok:            tiktok            ?? '',
        followers:         followers         ?? 0,
        notes:             notes             ?? '',
        status:            status            ?? 'Contattato',
        last_contact_date: last_contact_date || null,
      })
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
