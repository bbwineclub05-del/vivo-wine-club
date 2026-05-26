import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/auth-guard';

const BUCKET = 'media';
const MAX_PX  = 400;

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;

    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {/* already exists */});

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }

    const arrayBuffer  = await file.arrayBuffer();
    const inputBuffer  = Buffer.from(arrayBuffer);

    let processedBuffer: Buffer;
    try {
      processedBuffer = await sharp(inputBuffer)
        .rotate()
        .resize(MAX_PX, MAX_PX, { fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 88 })
        .toBuffer();
    } catch {
      processedBuffer = inputBuffer;
    }

    const storagePath = `avatars/${auth.userId}-${Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, processedBuffer, { contentType: 'image/webp', upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    // Upsert the profile's avatar_url
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        { id: auth.userId, avatar_url: publicUrl, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      );

    if (profileError) {
      console.error('[avatar] profile upsert error:', profileError);
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('[/api/member/profile/avatar]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
