import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

export async function GET() {
  try {
    const { data, error } = await db()
      .from('news')
      .select('*')
      .eq('published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ news: data ?? [] });
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

    const { tag, title, description, href, region, images, image_fit, published, sort_order } = body as Record<string, unknown>;

    if (!title || !description || !href) {
      return NextResponse.json({ error: 'title, description and href are required' }, { status: 400 });
    }

    const { data, error } = await db()
      .from('news')
      .insert({
        tag:         tag         || 'NEWS',
        title,
        description,
        href,
        region:      region      || null,
        images:      Array.isArray(images) ? images : [],
        image_fit:   image_fit   || 'cover',
        published:   published   ?? true,
        sort_order:  sort_order  ?? 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
