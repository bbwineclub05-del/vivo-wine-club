import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Supabase PKCE auth callback.
 *
 * Supabase redirects here with ?code=<pkce_code> after password reset
 * (and other auth flows). We cannot exchange the code server-side without
 * @supabase/ssr (the PKCE verifier lives in the browser's localStorage),
 * so we just forward the code to the client-side /reset-password page,
 * which calls supabase.auth.exchangeCodeForSession(code).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    return NextResponse.redirect(
      `${origin}/reset-password?code=${encodeURIComponent(code)}`,
    );
  }

  // Niente codice. Puo' voler dire due cose: che qualcuno e' passato
  // di qui a mano, oppure che la sessione viaggia dopo il cancelletto
  // — e quella parte dell'indirizzo al server non arriva. In quel
  // secondo caso il browser se la porta dietro nel reindirizzamento,
  // quindi si manda alla pagina che la sa usare invece che al login,
  // che la butterebbe via facendo entrare senza cambiare niente.
  return NextResponse.redirect(`${origin}/reset-password`);
}
