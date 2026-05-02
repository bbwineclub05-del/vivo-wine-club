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

  // No code present — send back to login.
  return NextResponse.redirect(`${origin}/login`);
}
