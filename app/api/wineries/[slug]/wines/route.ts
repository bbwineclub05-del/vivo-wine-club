import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

/** GET /api/wineries/[slug]/wines — public */
export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('winery_wines')
    .select('*')
    .eq('winery_slug', slug)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ wines: data ?? [] });
}

/** POST /api/wineries/[slug]/wines — admin/staff only: add a tasted wine */
export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { slug } = await params;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const name = String(body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Il nome del vino è obbligatorio.' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('winery_wines')
    .insert({
      winery_slug:      slug,
      name,
      vintage:           body.vintage           ?? null,
      grape:             body.grape              ?? '',
      rating:            body.rating             ?? null,
      note:              body.note               ?? '',
      bottle_photo_url:  body.bottle_photo_url   ?? null,
      sort_order:        body.sort_order         ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ wine: data }, { status: 201 });
}
