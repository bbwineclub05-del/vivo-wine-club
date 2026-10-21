import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { MAX_FILE_BYTES, isBlocked, storageSafeName, extensionOf } from '@/lib/documents';

const BUCKET = 'documents';

/**
 * Restituisce una URL firmata con cui il browser carica il file
 * direttamente nello storage.
 *
 * Il motivo è pratico: in produzione il corpo di una richiesta a una
 * funzione serverless è limitato a pochi megabyte, quindi far passare
 * un PowerPoint da venti megabyte attraverso l'API fallirebbe una volta
 * pubblicato, pur funzionando perfettamente in locale. Così il file non
 * passa mai dal nostro server — e come effetto secondario si può
 * mostrare una barra di avanzamento vera.
 *
 * La firma vale per un percorso solo e per pochi minuti; è il server a
 * decidere il percorso, così nessuno può scrivere sopra un file altrui.
 */
export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const fileName = typeof body.fileName === 'string' ? body.fileName : '';
    const size = Number(body.size ?? 0);

    if (!fileName.trim()) {
      return NextResponse.json({ error: 'Serve il nome del file.' }, { status: 400 });
    }
    if (isBlocked(fileName)) {
      return NextResponse.json(
        { error: `I file .${extensionOf(fileName)} sono programmi e non si possono caricare.` },
        { status: 400 },
      );
    }
    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: 'Il file è vuoto.' }, { status: 400 });
    }
    if (size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File troppo grande (max 50 MB).' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    await supabase.storage
      .createBucket(BUCKET, { public: false })
      .catch(() => {/* esiste già */});

    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${storageSafeName(fileName)}`;

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ path, token: data.token, bucket: BUCKET });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}
