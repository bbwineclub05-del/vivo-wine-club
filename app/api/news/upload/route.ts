import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

const BUCKET = 'news';

/**
 * Card dimensions on the homepage:
 *   height: 160px fixed, width: ~1/3 of viewport (up to ~600px)
 * We resize to 1200×480 (3× retina) so images always look crisp
 * on any device. `cover` + `centre` matches the CSS object-fit.
 */
const CARD_W = 1200;
const CARD_H = 480;

export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;

    // Ensure bucket exists
    await supabase.storage
      .createBucket(BUCKET, { public: true })
      .catch(() => {/* already exists */});

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Resize to card dimensions with cover + centre crop, output WebP
    let processedBuffer: Buffer;
    try {
      processedBuffer = await sharp(inputBuffer)
        .resize(CARD_W, CARD_H, { fit: 'cover', position: 'centre' })
        .webp({ quality: 88 })
        .toBuffer();
    } catch {
      // If sharp fails (e.g. SVG or unsupported format), fall back to original
      processedBuffer = inputBuffer;
    }

    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, processedBuffer, { contentType: 'image/webp', upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('[news/upload]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
