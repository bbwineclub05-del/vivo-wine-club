'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle, XCircle, Loader2, QrCode, KeyRound, RotateCcw } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const ADMIN_EMAILS = [
  'giacomogallo1310@gmail.com',
  'cristianomichelotti@gmail.com',
  'filippo.lombardi890@gmail.com',
  'riccardo.consalvo@icloud.com',
];

// ── Types ─────────────────────────────────────────────────────────────────────

type AuthState = 'loading' | 'unauthorized' | 'not_staff' | 'ready';

type ScanResult =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'valid';   buyerName: string; eventId: string; ticketCount: number; scannedAt: string }
  | { status: 'already'; buyerName: string; eventId: string; ticketCount: number; scannedAt: string; scannedBy: string }
  | { status: 'invalid' };

// ── QR scanner (loaded dynamically) ──────────────────────────────────────────

function QrScanner({ onScan, active }: { onScan: (token: string) => void; active: boolean }) {
  const scannerRef = useRef<unknown>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!active || mountedRef.current) return;
    mountedRef.current = true;

    let scanner: { render: (s: (t: string) => void, e: () => void) => void; clear: () => Promise<void> } | null = null;

    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 240, height: 240 }, rememberLastUsedCamera: true },
        false,
      ) as typeof scanner;
      scannerRef.current = scanner;

      scanner!.render(
        (decodedText: string) => {
          // Extract token from URL or use raw value
          try {
            const url   = new URL(decodedText);
            const token = url.searchParams.get('token');
            if (token) { onScan(token); return; }
          } catch {
            // Not a URL — use raw value as token
          }
          onScan(decodedText);
        },
        () => { /* ignore scan errors */ },
      );
    });

    return () => {
      mountedRef.current = false;
      scanner?.clear().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return <div id="qr-reader" className="w-full" />;
}

// ── Result screen ─────────────────────────────────────────────────────────────

function ResultScreen({ result, onReset }: { result: ScanResult; onReset: () => void }) {
  if (result.status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 size={48} className="animate-spin text-[#731515]" />
        <p className="text-sm text-[#7a4a4a] tracking-widest">VERIFYING…</p>
      </div>
    );
  }

  if (result.status === 'valid') {
    const time = new Date(result.scannedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return (
      <div className="flex flex-col items-center gap-6 py-10 px-6 bg-green-50 rounded-2xl border border-green-200 text-center">
        <CheckCircle size={64} className="text-green-600" strokeWidth={1.5} />
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
        <button onClick={onReset} className="flex items-center gap-2 mt-2 text-[10px] tracking-[0.3em] text-green-700 border border-green-300 px-6 py-3 rounded-full hover:bg-green-100 transition-colors">
          <RotateCcw size={12} /> SCAN NEXT
        </button>
      </div>
    );
  }

  if (result.status === 'already') {
    const time = new Date(result.scannedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return (
      <div className="flex flex-col items-center gap-6 py-10 px-6 bg-red-50 rounded-2xl border border-red-200 text-center">
        <XCircle size={64} className="text-red-500" strokeWidth={1.5} />
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
        <button onClick={onReset} className="flex items-center gap-2 mt-2 text-[10px] tracking-[0.3em] text-red-600 border border-red-300 px-6 py-3 rounded-full hover:bg-red-100 transition-colors">
          <RotateCcw size={12} /> SCAN NEXT
        </button>
      </div>
    );
  }

  if (result.status === 'invalid') {
    return (
      <div className="flex flex-col items-center gap-6 py-10 px-6 bg-red-50 rounded-2xl border border-red-200 text-center">
        <XCircle size={64} className="text-red-500" strokeWidth={1.5} />
        <div>
          <p className="text-[10px] tracking-[0.4em] text-red-500 mb-2">INVALID TICKET</p>
          <p className="text-lg text-red-800" style={{ fontFamily: 'var(--font-nunito)' }}>
            This QR code is not recognised.
          </p>
        </div>
        <button onClick={onReset} className="flex items-center gap-2 mt-2 text-[10px] tracking-[0.3em] text-red-600 border border-red-300 px-6 py-3 rounded-full hover:bg-red-100 transition-colors">
          <RotateCcw size={12} /> TRY AGAIN
        </button>
      </div>
    );
  }

  return null;
}

// ── Main check-in content ─────────────────────────────────────────────────────

function CheckinContent() {
  const searchParams   = useSearchParams();
  const [authState, setAuthState]   = useState<AuthState>('loading');
  const [accessToken, setAccessToken] = useState('');
  const [result, setResult]         = useState<ScanResult>({ status: 'idle' });
  const [mode, setMode]             = useState<'scanner' | 'manual'>('scanner');
  const [manualToken, setManualToken] = useState('');
  const [scannerActive, setScannerActive] = useState(false);

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

  // ── Enable scanner when in scanner mode and ready ──
  useEffect(() => {
    if (authState === 'ready' && mode === 'scanner' && result.status === 'idle') {
      setScannerActive(true);
    } else {
      setScannerActive(false);
    }
  }, [authState, mode, result.status]);

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

  const handleReset = useCallback(() => {
    setResult({ status: 'idle' });
    setManualToken('');
    // Reload page to restart scanner cleanly
    if (mode === 'scanner') window.location.reload();
  }, [mode]);

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
            onClick={() => setMode('scanner')}
            className={`p-2.5 rounded-lg transition-colors ${mode === 'scanner' ? 'bg-white/20' : 'hover:bg-white/10'}`}
            aria-label="QR Scanner"
          >
            <QrCode size={20} />
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`p-2.5 rounded-lg transition-colors ${mode === 'manual' ? 'bg-white/20' : 'hover:bg-white/10'}`}
            aria-label="Manual entry"
          >
            <KeyRound size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">

        {result.status !== 'idle' && result.status !== 'loading'
          ? <ResultScreen result={result} onReset={handleReset} />
          : (
            <>
              {mode === 'scanner' ? (
                <div className="space-y-4">
                  <p className="text-center text-xs text-[#7a4a4a] tracking-widest">POINT CAMERA AT TICKET QR CODE</p>
                  <div className="rounded-xl overflow-hidden border border-[#e8d5d5] bg-white">
                    {scannerActive && <QrScanner onScan={submitToken} active={scannerActive} />}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-xs text-[#7a4a4a] tracking-widest">ENTER ORDER ID MANUALLY</p>
                  <div className="bg-white border border-[#e8d5d5] rounded-xl p-6 space-y-4">
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && submitToken(manualToken)}
                      placeholder="VWC-1234567890-ABCDE"
                      className="w-full border border-[#e8d5d5] px-4 py-3 text-sm text-[#1a0505] placeholder-[#c0a0a0] focus:outline-none focus:border-[#731515] transition-colors font-mono tracking-wider"
                    />
                    <button
                      onClick={() => submitToken(manualToken)}
                      disabled={!manualToken.trim()}
                      className="w-full py-3.5 bg-[#731515] text-white text-[11px] tracking-[0.35em] hover:bg-[#aa4848] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      VERIFY TICKET
                    </button>
                  </div>
                </div>
              )}

              {result.status === 'loading' && (
                <div className="flex justify-center mt-8">
                  <Loader2 size={32} className="animate-spin text-[#731515]" />
                </div>
              )}
            </>
          )
        }
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
