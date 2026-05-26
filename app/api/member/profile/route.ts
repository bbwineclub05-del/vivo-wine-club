import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-guard';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    const { data: profile, error } = await db
      .from('profiles')
      .select('full_name, city, wine_interests, avatar_url')
      .eq('id', auth.userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: profile ?? null });
  } catch (err) {
    console.error('[/api/member/profile GET] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    const body = await request.json();
    const fields: Record<string, unknown> = {};
    if (body.full_name      !== undefined) fields.full_name      = body.full_name;
    if (body.city           !== undefined) fields.city           = body.city;
    if (body.wine_interests !== undefined) fields.wine_interests = body.wine_interests;

    const { data: profile, error } = await db
      .from('profiles')
      .upsert(
        { id: auth.userId, ...fields, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[/api/member/profile PATCH] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
