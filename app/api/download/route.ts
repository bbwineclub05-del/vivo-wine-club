import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-guard';

/**
 * Rimanda indietro un file perche' il browser lo salvi col suo nome.
 *
 * Serve ai PDF che nascono nel browser — le liste invitati, fatte con
 * jsPDF — e che quindi non hanno un indirizzo da cui scendere. Senza
 * una navigazione il nome lo deve dare la pagina con l'attributo
 * `download`, e dove quell'attributo viene ignorato il file finisce
 * salvato come `4526eaf8-92db-…`, senza estensione.
 *
 * Qui il file risale per un attimo e ritorna con l'intestazione
 * giusta. Il tipo e' sempre `application/pdf` e sempre in allegato:
 * cosi' questa rotta non puo' diventare un modo per far servire al
 * nostro dominio contenuti scelti da qualcun altro. Serve una
 * sessione valida — anche quella di un collaboratore, che la lista
 * della sua serata la scarica — e in cambio si riceve soltanto cio'
 * che si e' appena mandato.
 */
export async function POST(request: Request) {
  const form = await request.formData();

  const auth = await getAuthUser(request, String(form.get('token') ?? ''));
  if (!auth.ok) return auth.response;

  const base64 = String(form.get('contenuto') ?? '');
  const nome = String(form.get('nome') ?? 'documento.pdf').replace(/[^\w.\- ]/g, '_');

  if (!base64) {
    return NextResponse.json({ error: 'Niente da scaricare.' }, { status: 400 });
  }

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.byteLength === 0 || buffer.byteLength > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'File vuoto o troppo grande.' }, { status: 400 });
  }

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nome.endsWith('.pdf') ? nome : `${nome}.pdf`}"`,
      'Content-Length': String(buffer.byteLength),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
