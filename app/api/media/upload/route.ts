import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const BUCKET = 'media';
const MAX_PX  = 1600; // max on either dimension, maintain aspect ratio

export async function POST(request: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;

    // Ensure bucket exists (public, no auth needed to view)
    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {/* already exists */});

    const formData = await request.formData();
    const file   = formData.get('file')   as File | null;
    const folder = formData.get('folder') as string | null;

    if (!file || !folder) {
      return NextResponse.json({ error: 'file and folder required' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Resize to max 1600px on either side, maintain aspect ratio, convert to WebP
    let processedBuffer: Buffer;
    try {
      processedBuffer = await sharp(inputBuffer)
        .resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 88 })
        .toBuffer();
    } catch {
      // Fallback: upload original (e.g. SVG or corrupt image)
      processedBuffer = inputBuffer;
    }

    const storagePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, processedBuffer, { contentType: 'image/webp', upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    return NextResponse.json({ url: publicUrl, path: storagePath });
  } catch (err) {
    console.error('[media/upload]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
