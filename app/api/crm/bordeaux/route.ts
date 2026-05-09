import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

export async function GET() {
  try {
    const { data, error } = await db()
      .from('contacts_bordeaux')
      .select('*')
      .order('company', { ascending: true });

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
  try {
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { company, name, email, phone, last_follow_up, note } = body;
    if (!company) {
      return NextResponse.json({ error: 'company is required' }, { status: 400 });
    }

    const { data, error } = await db()
      .from('contacts_bordeaux')
      .insert({ company: company || '', name: name || '', email: email || '', phone: phone || '', last_follow_up: last_follow_up || null, note: note || '' })
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
