import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { dbEventToEventData, sectionFromType, type DbEvent, type EventSection } from '@/lib/events';
import { requireAdminOrStaff } from '@/lib/auth-guard';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

function generateSlug(title: string, date: string): string {
  const d = new Date(date + 'T12:00:00Z');
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toLowerCase();
  const year  = d.getUTCFullYear();
  const base  = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .replace(/-$/, '');
  return `${base}-${month}-${year}`;
}

/* ── GET: public — merged DB + static events, optional ?section= filter ── */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section') as EventSection | null;
  const past    = searchParams.get('past') === 'true';
  const today   = new Date().toISOString().slice(0, 10);

  let dbEvents: ReturnType<typeof dbEventToEventData>[] = [];

  try {
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('events')
      .select('*')
      .eq('published', true)
      .order('date', { ascending: !past });

    if (past) {
      query = query.lt('date', today);
    } else {
      query = query.gte('date', today);
    }

    const { data, error } = await query;

    if (!error && data) {
      dbEvents = (data as DbEvent[]).map(dbEventToEventData);
    }
  } catch {/* fall through with empty dbEvents */}

  let merged = [...dbEvents];

  // Optional section filter
  if (section) {
    merged = merged.filter((e) => (e.section ?? sectionFromType(e.type)) === section);
  }

  return NextResponse.json({ events: merged });
}

/* ── POST: admin or staff — create new event ── */
export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    let body: Record<string, unknown>;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const {
      title, type, date, time, location, location_full, description,
      price, capacity, status, published, title_strikethrough, image_url, sort_order,
      is_list_only, guest_list_enabled,
    } = body as {
      title: string; type?: string; date: string; time?: string;
      location: string; location_full?: string; description: string;
      price?: number; capacity?: number; status?: string;
      published?: boolean; title_strikethrough?: boolean;
      image_url?: string; sort_order?: number;
      is_list_only?: boolean; guest_list_enabled?: boolean;
    };

    if (!title || !date || !location || !description) {
      return NextResponse.json({ error: 'title, date, location e description sono obbligatori' }, { status: 400 });
    }

    const slug = generateSlug(title, date);
    const priceNum = price ?? 0;

    // Create Stripe product for paid events
    let stripe_product_id: string | null = null;
    let stripe_price_id:   string | null = null;

    if (priceNum > 0 && process.env.STRIPE_SECRET_KEY) {
      try {
        const product   = await stripe.products.create({
          name:        title,
          description: `${date} · ${location_full || location}`,
        });
        const priceObj  = await stripe.prices.create({
          product:     product.id,
          unit_amount: Math.round(priceNum * 100),
          currency:    'eur',
        });
        stripe_product_id = product.id;
        stripe_price_id   = priceObj.id;
        console.log(`[events POST] Stripe product created: ${product.id}`);
      } catch (stripeErr) {
        console.error('[events POST] Stripe error:', stripeErr);
        // Non-fatal — continue without Stripe IDs
      }
    }

    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('events')
      .insert({
        slug,
        title,
        type:               type || 'PARTY',
        section:            (body.section as string) || sectionFromType(type || 'PARTY'),
        date,
        time:               time || null,
        location,
        location_full:      location_full || location,
        description,
        price:              priceNum,
        capacity:           capacity || null,
        status:             status || 'open',
        published:          published ?? false,
        title_strikethrough: title_strikethrough ?? false,
        image_url:          image_url || null,
        sort_order:         sort_order ?? 0,
        is_list_only:       is_list_only ?? false,
        guest_list_enabled: guest_list_enabled ?? (is_list_only ? true : false),
        stripe_product_id,
        stripe_price_id,
      })
      .select()
      .single();

    if (error) {
      console.error('[events POST] DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ event: data }, { status: 201 });
  } catch (err) {
    console.error('[events POST]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
