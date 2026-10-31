import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

const BUCKET = 'media';
const MAX_PX  = 1600; // max on either dimension, maintain aspect ratio

export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

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

    // Resize to max 1600px on either side, maintain aspect ratio, convert to WebP.
    // .rotate() with no args reads the EXIF Orientation tag and auto-corrects
    // the rotation — fixes upside-down/sideways photos from smartphones.
    let processedBuffer: Buffer;
    let estensione = 'webp';
    let tipo = 'image/webp';

    try {
      processedBuffer = await sharp(inputBuffer)
        .rotate()
        .resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 88 })
        .toBuffer();
    } catch {
      /**
       * La conversione non e' riuscita. Prima qui si caricava il file
       * originale chiamandolo `.webp` e dichiarandolo `image/webp`:
       * il caricamento sembrava andato a buon fine e il file era
       * illeggibile per qualunque browser.
       *
       * E' successo davvero, con cinque foto di una visita in
       * cantina: erano HEIC appena uscite da un iPhone, sharp non le
       * sa aprire, e sul sito restavano cinque riquadri vuoti senza
       * che nessuno se ne accorgesse.
       *
       * Un SVG passa com'e', perche' e' un formato che il browser
       * legge benissimo. Tutto il resto viene respinto dicendo cosa
       * fare, invece di mentire sul risultato.
       */
      const nome = (file.name ?? '').toLowerCase();
      const svg = nome.endsWith('.svg') || file.type === 'image/svg+xml';

      if (!svg) {
        return NextResponse.json(
          {
            error:
              'Non riesco a leggere questa immagine. Se arriva da un iPhone e' +
              ' probabilmente in formato HEIC: esportala in JPG o PNG e riprova.',
          },
          { status: 415 },
        );
      }

      processedBuffer = inputBuffer;
      estensione = 'svg';
      tipo = 'image/svg+xml';
    }

    const storagePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${estensione}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, processedBuffer, { contentType: tipo, upsert: false });

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
