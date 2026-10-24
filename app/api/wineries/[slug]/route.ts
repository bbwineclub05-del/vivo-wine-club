import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

/** GET /api/wineries/[slug] — public */
export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('wineries')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ winery: data });
}

/** PATCH /api/wineries/[slug] — admin/staff only: update name, logo_url, region, country, description, lat, lng, coords_precise, photos */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { slug } = await params;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Da quando la scheda pubblica legge il database e non più l'elenco
  // scritto nel codice, anche questi due campi si modificano da qui.
  const allowed = [
    'name', 'logo_url', 'region', 'country', 'description',
    'classification', 'short_description',
    'lat', 'lng', 'coords_precise', 'photos', 'visit_date',
    // I contatti: servono ai soci per prenotare una visita.
    'website', 'phone', 'email', 'booking_url', 'address',
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) patch[k] = body[k];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('wineries')
    .update(patch)
    .eq('slug', slug)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ winery: data });
}
