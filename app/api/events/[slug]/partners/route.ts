import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ORG-';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * GET /api/events/[slug]/partners
 * Returns all partners for this event, enriched with registration stats.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { slug } = await params;

  try {
    // Fetch partners
    const { data: partners, error: pErr } = await db()
      .from('event_partners')
      .select('id, name, code, created_at')
      .eq('event_slug', slug)
      .order('created_at', { ascending: true });

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    // Fetch guests with partner_code for this event
    const { data: guests, error: gErr } = await db()
      .from('event_guests')
      .select('partner_code, checked_in')
      .eq('event_slug', slug)
      .not('partner_code', 'is', null);

    if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

    // Total guests for percentage calculation
    const { count: eventTotal } = await db()
      .from('event_guests')
      .select('id', { count: 'exact', head: true })
      .eq('event_slug', slug);

    // Aggregate per partner
    const statsMap = new Map<string, { total_registered: number; total_checkedin: number }>();
    for (const g of (guests ?? [])) {
      if (!g.partner_code) continue;
      const existing = statsMap.get(g.partner_code) ?? { total_registered: 0, total_checkedin: 0 };
      existing.total_registered += 1;
      if (g.checked_in) existing.total_checkedin += 1;
      statsMap.set(g.partner_code, existing);
    }

    const enriched = (partners ?? []).map((p: { id: string; name: string; code: string; created_at: string }) => ({
      ...p,
      ...(statsMap.get(p.code) ?? { total_registered: 0, total_checkedin: 0 }),
    }));

    return NextResponse.json({ partners: enriched, event_total_registered: eventTotal ?? 0 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/events/[slug]/partners
 * Body: { name: string }
 * Creates a new partner with a unique code for this event.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { slug } = await params;

  try {
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 422 });

    // Look up event_id
    const { data: eventRow } = await db()
      .from('events')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!eventRow) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // Generate a unique code (retry on collision)
    let code = '';
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = randomCode();
      const { data: collision } = await db()
        .from('event_partners')
        .select('id')
        .eq('code', candidate)
        .maybeSingle();
      if (!collision) { code = candidate; break; }
    }
    if (!code) return NextResponse.json({ error: 'Could not generate unique code' }, { status: 500 });

    const { data, error } = await db()
      .from('event_partners')
      .insert({ event_id: eventRow.id, event_slug: slug, name, code })
      .select('id, name, code, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ partner: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
