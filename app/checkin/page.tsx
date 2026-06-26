'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle, XCircle, Loader2, QrCode, KeyRound, RotateCcw } from 'lucide-react';
import { ADMIN_EMAILS } from '@/lib/admins';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ── Types ─────────────────────────────────────────────────────────────────────

type AuthState = 'loading' | 'unauthorized' | 'not_staff' | 'ready';

type ScanResult =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'valid';   buyerName: string; eventId: string; ticketCount: number; scannedAt: string }
  | { status: 'already'; buyerName: string; eventId: string; ticketCount: number; scannedAt: string; scannedBy: string }
  | { status: 'invalid' };

// ── QR scanner ────────────────────────────────────────────────────────────────
//
// Uses Html5Qrcode (low-level API) instead of Html5QrcodeScanner so we can
// call pause(false)/resume() between scans without ever stopping the camera.
// This means the browser only asks for camera permission ONCE per session —
// the stream stays alive behind the result overlay until the user leaves the page.

function QrScanner({ onScan, paused }: { onScan: (token: string) => void; paused: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrRef     = useRef<any>(null);
  const pausedRef = useRef(paused);

  // Pause / resume detection without touching the camera stream
  useEffect(() => {
    pausedRef.current = paused;
    if (!qrRef.current) return;
    try {
      if (paused) qrRef.current.pause(false);   // false = keep video on, pause QR detection
      else        qrRef.current.resume();
    } catch { /* ignore if scanner not in valid state yet */ }
  }, [paused]);

  // Start camera exactly once — never stop between scans
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let qr: any = null;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qr = new (Html5Qrcode as any)('qr-reader', { verbose: false });
      qrRef.current = qr;

      qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText: string) => {
          if (pausedRef.current) return; // result is showing — ignore until reset
          try {
            const url   = new URL(decodedText);
            const token = url.searchParams.get('token');
            if (token) { onScan(token); return; }
          } catch { /* not a URL — use raw value */ }
          onScan(decodedText);
        },
      ).catch(console.error);
    });

    return () => { qr?.stop().catch(() => {}); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once, cleanup on unmount

  return <div id="qr-reader" className="w-full" />;
}

// ── Result screen ─────────────────────────────────────────────────────────────

function ResultScreen({ result, onReset }: { result: ScanResult; onReset: () => void }) {
  if (result.status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <Loader2 size={40} className="animate-spin text-[#731515]" />
        <p className="text-sm text-[#7a4a4a] tracking-widest">VERIFYING…</p>
      </div>
    );
  }

  if (result.status === 'valid') {
    const time = new Date(result.scannedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return (
      <div className="flex flex-col items-center gap-5 py-8 px-6 bg-green-50 rounded-2xl border border-green-200 text-center">
        <CheckCircle size={52} className="text-green-600" strokeWidth={1.5} />
        <div>
          <p className="text-[10px] tracking-[0.4em] text-green-600 mb-2">CHECK-IN SUCCESSFUL</p>
          <p className="text-2xl font-semibold text-green-900" style={{ fontFamily: 'var(--font-syne)' }}>
            {result.buyerName}
          </p>
        </div>
        <div className="text-sm text-green-800 space-y-1" style={{ fontFamily: 'var(--font-nunito)' }}>
          <p>{result.eventId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
          <p><strong>{result.ticketCount}</strong> ticket{result.ticketCount > 1 ? 's' : ''}</p>
          <p className="text-green-600 text-xs">Checked in at {time}</p>
        </div>
        <button onClick={onReset} className="flex items-center gap-2 mt-1 text-[10px] tracking-[0.3em] text-green-700 border border-green-300 px-6 py-3 rounded-full hover:bg-green-100 transition-colors">
          <RotateCcw size={12} /> SCAN NEXT
        </button>
      </div>
    );
  }

  if (result.status === 'already') {
    const time = new Date(result.scannedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return (
      <div className="flex flex-col items-center gap-5 py-8 px-6 bg-red-50 rounded-2xl border border-red-200 text-center">
        <XCircle size={52} className="text-red-500" strokeWidth={1.5} />
        <div>
          <p className="text-[10px] tracking-[0.4em] text-red-500 mb-2">ALREADY CHECKED IN</p>
          <p className="text-2xl font-semibold text-red-900" style={{ fontFamily: 'var(--font-syne)' }}>
            {result.buyerName}
          </p>
        </div>
        <div className="text-sm text-red-800 space-y-1" style={{ fontFamily: 'var(--font-nunito)' }}>
          <p>{result.eventId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
          <p><strong>{result.ticketCount}</strong> ticket{result.ticketCount > 1 ? 's' : ''}</p>
          <p className="text-red-500 text-xs">First scan at {time} by {result.scannedBy}</p>
        </div>
        <button onClick={onReset} className="flex items-center gap-2 mt-1 text-[10px] tracking-[0.3em] text-red-600 border border-red-300 px-6 py-3 rounded-full hover:bg-red-100 transition-colors">
          <RotateCcw size={12} /> SCAN NEXT
        </button>
      </div>
    );
  }

  if (result.status === 'invalid') {
    return (
      <div className="flex flex-col items-center gap-5 py-8 px-6 bg-red-50 rounded-2xl border border-red-200 text-center">
        <XCircle size={52} className="text-red-500" strokeWidth={1.5} />
        <div>
          <p className="text-[10px] tracking-[0.4em] text-red-500 mb-2">INVALID TICKET</p>
          <p className="text-lg text-red-800" style={{ fontFamily: 'var(--font-nunito)' }}>
            This QR code is not recognised.
          </p>
        </div>
        <button onClick={onReset} className="flex items-center gap-2 mt-1 text-[10px] tracking-[0.3em] text-red-600 border border-red-300 px-6 py-3 rounded-full hover:bg-red-100 transition-colors">
          <RotateCcw size={12} /> TRY AGAIN
        </button>
      </div>
    );
  }

  return null;
}

// ── Main check-in content ─────────────────────────────────────────────────────

function CheckinContent() {
  const searchParams    = useSearchParams();
  const [authState,    setAuthState]    = useState<AuthState>('loading');
  const [accessToken,  setAccessToken]  = useState('');
  const [result,       setResult]       = useState<ScanResult>({ status: 'idle' });
  const [mode,         setMode]         = useState<'scanner' | 'manual'>('scanner');
  const [manualToken,  setManualToken]  = useState('');

  // ── Auth check ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setAuthState('unauthorized'); return; }
      const role  = session.user.app_metadata?.role ?? session.user.user_metadata?.role;
      const email = session.user.email ?? '';
      if (role !== 'staff' && !ADMIN_EMAILS.includes(email)) {
        setAuthState('not_staff'); return;
      }
      setAccessToken(session.access_token);
      setAuthState('ready');
    });
  }, []);

  // ── Auto-submit token from URL (when QR scanned with native camera) ──
  useEffect(() => {
    if (authState !== 'ready') return;
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) submitToken(tokenFromUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState]);

  const submitToken = useCallback(async (token: string) => {
    if (!token.trim()) return;
    setResult({ status: 'loading' });

    try {
      const res  = await fetch('/api/checkin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();

      if (!data.valid && data.reason === 'already_scanned') {
        setResult({
          status:      'already',
          buyerName:   data.buyerName,
          eventId:     data.eventId,
          ticketCount: data.ticketCount,
          scannedAt:   data.scannedAt,
          scannedBy:   data.scannedBy ?? '',
        });
      } else if (data.valid) {
        setResult({
          status:      'valid',
          buyerName:   data.buyerName,
          eventId:     data.eventId,
          ticketCount: data.ticketCount,
          scannedAt:   data.scannedAt,
        });
      } else {
        setResult({ status: 'invalid' });
      }
    } catch {
      setResult({ status: 'invalid' });
    }
  }, [accessToken]);

  // ── Reset: clear result state — camera stream keeps running, no page reload ──
  const handleReset = useCallback(() => {
    setResult({ status: 'idle' });
    setManualToken('');
  }, []);

  // ── Auth states ──
  if (authState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={32} className="animate-spin text-[#731515]" />
      </div>
    );
  }

  if (authState === 'unauthorized') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <XCircle size={48} className="text-[#731515]" strokeWidth={1.5} />
        <h1 className="text-xl font-light" style={{ fontFamily: 'var(--font-syne)' }}>Staff login required</h1>
        <p className="text-sm text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
          Please log in with your staff account to access check-in.
        </p>
        <a href="/login" className="mt-2 text-[10px] tracking-[0.3em] text-white bg-[#731515] px-8 py-3 hover:bg-[#aa4848] transition-colors">
          GO TO LOGIN
        </a>
      </div>
    );
  }

  if (authState === 'not_staff') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <XCircle size={48} className="text-[#731515]" strokeWidth={1.5} />
        <h1 className="text-xl font-light" style={{ fontFamily: 'var(--font-syne)' }}>Access denied</h1>
        <p className="text-sm text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
          This page is restricted to staff members only.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf6f6] flex flex-col">

      {/* Header */}
      <div className="bg-[#731515] text-white px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-[9px] tracking-[0.4em] text-white/60 mb-0.5">VIVO WINE CLUB</p>
          <h1 className="text-lg font-light" style={{ fontFamily: 'var(--font-syne)' }}>Event Check-in</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setMode('scanner'); setResult({ status: 'idle' }); }}
            className={`p-2.5 rounded-lg transition-colors ${mode === 'scanner' ? 'bg-white/20' : 'hover:bg-white/10'}`}
            aria-label="QR Scanner"
          >
            <QrCode size={20} />
          </button>
          <button
            onClick={() => { setMode('manual'); setResult({ status: 'idle' }); }}
            className={`p-2.5 rounded-lg transition-colors ${mode === 'manual' ? 'bg-white/20' : 'hover:bg-white/10'}`}
            aria-label="Manual entry"
          >
            <KeyRound size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-4">

        {/* ── Scanner mode ──
            QrScanner stays mounted the entire session so the camera stream never
            stops. When a result is showing, detection is paused via pause(false)
            which keeps the video on but stops QR decoding. The result screen
            appears below the live camera view.                                 */}
        {mode === 'scanner' && (
          <>
            {result.status === 'idle' && (
              <p className="text-center text-xs text-[#7a4a4a] tracking-widest">
                POINT CAMERA AT TICKET QR CODE
              </p>
            )}
            <div className="rounded-xl overflow-hidden border border-[#e8d5d5] bg-white">
              <QrScanner onScan={submitToken} paused={result.status !== 'idle'} />
            </div>
            {result.status === 'loading' && (
              <div className="flex justify-center py-4">
                <Loader2 size={32} className="animate-spin text-[#731515]" />
              </div>
            )}
            {result.status !== 'idle' && result.status !== 'loading' && (
              <ResultScreen result={result} onReset={handleReset} />
            )}
          </>
        )}

        {/* ── Manual mode ── */}
        {mode === 'manual' && (
          <>
            {result.status === 'idle' || result.status === 'loading' ? (
              <div className="space-y-4">
                <p className="text-center text-xs text-[#7a4a4a] tracking-widest">ENTER ORDER ID MANUALLY</p>
                <div className="bg-white border border-[#e8d5d5] rounded-xl p-6 space-y-4">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && submitToken(manualToken)}
                    placeholder="VWC-1234567890-ABCDE"
                    className="w-full border border-[#e8d5d5] px-4 py-3 text-sm text-[#1a0505] placeholder-[#c0a0a0] focus:outline-none focus:border-[#731515] transition-colors font-mono tracking-wider rounded-lg"
                    style={{ fontSize: '16px' }}
                  />
                  <button
                    onClick={() => submitToken(manualToken)}
                    disabled={!manualToken.trim() || result.status === 'loading'}
                    className="w-full py-3.5 bg-[#731515] text-white text-[11px] tracking-[0.35em] hover:bg-[#aa4848] disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg"
                  >
                    {result.status === 'loading' ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={13} className="animate-spin" /> VERIFYING…
                      </span>
                    ) : 'VERIFY TICKET'}
                  </button>
                </div>
              </div>
            ) : (
              <ResultScreen result={result} onReset={handleReset} />
            )}
          </>
        )}

      </div>
    </div>
  );
}

// ── Page export with Suspense (required for useSearchParams) ──────────────────

export default function CheckinPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={32} className="animate-spin text-[#731515]" />
      </div>
    }>
      <CheckinContent />
    </Suspense>
  );
}
