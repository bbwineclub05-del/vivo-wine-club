import { tokenDellaRichiesta } from '@/lib/auth-guard';

/**
 * Il corpo di una richiesta che scarica un file.
 *
 * Arriva in due forme. Come JSON, quando e' una chiamata `fetch`
 * normale. Come modulo, quando e' un pulsante "scarica": un modulo e'
 * una navigazione vera, e in una navigazione il nome del file lo
 * decide il server con `Content-Disposition`. Con `fetch` quel nome
 * si perde, e qualche browser salva l'identificativo del blob —
 * `4526eaf8-92db-…`, senza estensione, un file che non si apre.
 *
 * Nel modulo il token viaggia in un campo invece che
 * nell'intestazione, perche' a una navigazione le intestazioni non
 * si possono attaccare.
 */
export async function leggiRichiestaFile<T>(
  request: Request,
): Promise<{ dati: T; token: string }> {
  const tipo = request.headers.get('content-type') ?? '';

  if (tipo.includes('form')) {
    const form = await request.formData();
    const payload = String(form.get('payload') ?? '{}');
    return {
      dati: JSON.parse(payload) as T,
      token: tokenDellaRichiesta(request, String(form.get('token') ?? '')),
    };
  }

  const dati = (await request.json().catch(() => ({}))) as T;
  return { dati, token: tokenDellaRichiesta(request) };
}
