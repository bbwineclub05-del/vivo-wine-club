'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X, ScanLine, CheckCircle2, Circle, Users, RefreshCw,
  Camera, CameraOff, AlertTriangle, XCircle, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Ticket {
  order_id:   string;
  qr_code:    string | null;
  name:       string;
  email:      string;
  checked_in: boolean | null;
  scanned_at: string | null;
  scanned_by: string | null;
}

interface ScanResult {
  type:       'success' | 'already' | 'invalid' | 'error';
  name?:      string;
  email?:     string;
  scannedBy?: string;
  scannedAt?: string;
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function fmtTime(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function extractToken(raw: string): string {
  try {
    const url = new URL(raw);
    return url.searchParams.get('token') ?? raw;
  } catch {
    return raw;
  }
}

// How long (ms) to ignore the same QR code after it has been processed once.
// Prevents the camera from instantly re-scanning while the result overlay is visible.
const DEBOUNCE_MS = 5000;

/* ─────────────────────────────────────────────
   Main component

   Architecture notes
   ──────────────────
   • Both the List tab and the Scanner tab are ALWAYS rendered in the DOM.
     We use CSS (display: none / flex) to hide the inactive tab, never React
     conditional rendering. This ensures the html5-qrcode camera div is never
     unmounted while the camera is running.

   • The camera div (`id="qr-reader-{slug}"`) is ALWAYS display:block.
     The "verifying" and "result" states are shown as absolute overlays that
     stack on top of the camera feed without touching the camera div itself.
     This eliminates the flickering that occurred when display:none was toggled
     on the camera container while html5-qrcode was writing video frames.

   • lockRef prevents concurrent API calls from the 10fps scan callback.
   • lastCodeRef + lastCodeAtRef debounce same-code rescans for DEBOUNCE_MS.
   • Both refs are mutable (not state) so the html5-qrcode closure always
     reads the current value without stale-closure issues.
───────────────────────────────────────────── */
export default function EventScanner({
  event,
  accessToken,
  onClose,
}: {
  event: { id: string; slug: string; title: string; date: string };
  accessToken: string;
  onClose: () => void;
}) {
  /* ── Ticket list ── */
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<'list' | 'scanner'>('list');

  /* ── Scanner ── */
  const [cameraOn,  setCameraOn]  = useState(false);
  const [cameraErr, setCameraErr] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Refs — never cause stale closures inside html5-qrcode callbacks
  const scannerRef     = useRef<{ stop: () => Promise<void> } | null>(null);
  const lockRef        = useRef(false);   // true while API in flight OR result shown
  const lastCodeRef    = useRef('');      // last scanned token
  const lastCodeAtRef  = useRef(0);       // timestamp of last scan

  /* ── Load tickets ── */
  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/tickets?event_id=${event.slug}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(j => setTickets(Array.isArray(j.tickets) ? j.tickets : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [event.slug, accessToken]);

  useEffect(() => { load(); }, [load]);

  /* ── Supabase Realtime: live participant list updates across all devices ── */
  useEffect(() => {
    const channel = supabase
      .channel(`tickets:event_id:${event.slug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `event_id=eq.${event.slug}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Ticket;
            setTickets(prev =>
              prev.map(t => t.order_id === updated.order_id ? { ...t, ...updated } : t),
            );
          } else {
            load();
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [event.slug, load]);

  /* ── Start camera ── */
  const startCamera = useCallback(async () => {
    setCameraErr('');
    setScanResult(null);
    // Reset lock + debounce so the first scan of the session goes through
    lockRef.current    = false;
    lastCodeRef.current  = '';
    lastCodeAtRef.current = 0;

    // Make the camera div visible BEFORE html5-qrcode initialises.
    // We set cameraOn=true here so the React re-render (which switches
    // the div from the placeholder area to a real block) happens before
    // the camera starts writing video frames.
    setCameraOn(true);

    // Wait one animation frame so the browser has painted the now-visible div.
    await new Promise<void>(r => requestAnimationFrame(() => r()));

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const containerId = `qr-reader-${event.slug}`;
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },

        // ── Success callback — fires every ~100ms while a QR is in frame ────────
        async (decodedText) => {
          // Synchronous lock check first — before any await.
          // Using a ref (not state) guarantees the closure reads the current value.
          if (lockRef.current) return;

          const token = extractToken(decodedText);
          const now   = Date.now();

          // Debounce: ignore the same code within DEBOUNCE_MS of its last scan.
          if (
            token === lastCodeRef.current &&
            now - lastCodeAtRef.current < DEBOUNCE_MS
          ) return;

          // Lock immediately — all subsequent frames will be rejected until unlock.
          lockRef.current      = true;
          lastCodeRef.current  = token;
          lastCodeAtRef.current = now;

          setVerifying(true);

          try {
            const res  = await fetch('/api/checkin', {
              method:  'POST',
              headers: {
                'Content-Type':  'application/json',
                Authorization:   `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ token }),
            });
            const data = await res.json();

            let result: ScanResult;
            if (data.valid) {
              result = { type: 'success', name: data.buyerName, email: data.buyerEmail };
              load(); // refresh participant list
            } else if (data.reason === 'already_scanned') {
              result = {
                type:      'already',
                name:      data.buyerName,
                scannedBy: data.scannedBy,
                scannedAt: data.scannedAt,
              };
            } else {
              result = { type: 'invalid' };
            }

            setVerifying(false);
            setScanResult(result);
            // lockRef stays true — result overlay is stable until user presses "Scan Next"

          } catch {
            setVerifying(false);
            setScanResult({ type: 'error' });
            // On network error: unlock so user can retry without pressing a button
            lockRef.current = false;
          }
        },

        undefined, // suppress per-frame decode errors (normal when no QR in view)
      );

    } catch (err) {
      console.error('[EventScanner] camera init error:', err);
      setCameraErr('Impossibile accedere alla fotocamera. Controlla i permessi del browser.');
      setCameraOn(false);
    }
  }, [accessToken, event.slug, load]);

  /* ── Stop camera ── */
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* already stopped */ }
      scannerRef.current = null;
    }
    setCameraOn(false);
    setScanResult(null);
    setVerifying(false);
    lockRef.current = false;
  }, []);

  /* ── Cleanup camera on modal close ── */
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  /* ── "Scan Next": clear result overlay, unlock scanner ── */
  // The camera keeps running underneath — the feed is immediately visible
  // again because the camera div was NEVER hidden.
  const handleNext = useCallback(() => {
    setScanResult(null);
    lockRef.current = false;
  }, []);

  /* ── ESC to close ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  /* ── Stats ── */
  const total   = tickets.length;
  const present = tickets.filter(t => t.checked_in).length;

  /* ── Result overlay config ── */
  const resultOverlay = scanResult
    ? ({
        success: {
          bg:       'bg-emerald-500',
          icon:     <CheckCircle2 size={60} className="text-white drop-shadow" />,
          title:    '✓ Accesso confermato',
          nameCls:  'text-white/95',
          subCls:   'text-white/75',
          sub:      scanResult.email,
        },
        already: {
          bg:       'bg-amber-500',
          icon:     <AlertTriangle size={60} className="text-white drop-shadow" />,
          title:    '⚠ Già scannerizzato',
          nameCls:  'text-white/95',
          subCls:   'text-white/75',
          sub:      scanResult.scannedBy
                      ? `Da ${scanResult.scannedBy} alle ${fmtTime(scanResult.scannedAt)}`
                      : undefined,
        },
        invalid: {
          bg:       'bg-red-500',
          icon:     <XCircle size={60} className="text-white drop-shadow" />,
          title:    '✗ Biglietto non valido',
          nameCls:  'text-white/95',
          subCls:   'text-white/75',
          sub:      undefined,
        },
        error: {
          bg:       'bg-slate-600',
          icon:     <XCircle size={60} className="text-white drop-shadow" />,
          title:    'Errore di connessione',
          nameCls:  'text-white/90',
          subCls:   'text-white/65',
          sub:      'Riprova',
        },
      } as const)[scanResult.type]
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#eddada] shrink-0">
          <div>
            <div className="text-[9px] tracking-[0.42em] text-[#731515] mb-0.5">EVENT SCANNER</div>
            <h2
              className="text-lg font-light text-[#1a0505] leading-tight"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {event.title}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div
                className="text-[28px] font-light text-[#731515] leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {present}<span className="text-base text-[#7a4a4a]/40">/{total}</span>
              </div>
              <div className="text-[9px] tracking-[0.3em] text-[#7a4a4a]/50 mt-0.5">PRESENTI</div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#7a4a4a] hover:text-[#1a0505] hover:bg-[#fdf6f6] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex border-b border-[#eddada] shrink-0">
          {(['list', 'scanner'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[9px] tracking-[0.35em] transition-colors ${
                tab === t
                  ? 'text-[#731515] border-b-2 border-[#731515] -mb-px'
                  : 'text-[#7a4a4a]/50 hover:text-[#7a4a4a]'
              }`}
            >
              {t === 'list' ? (
                <span className="inline-flex items-center gap-1.5"><Users size={11} />PARTECIPANTI</span>
              ) : (
                <span className="inline-flex items-center gap-1.5"><ScanLine size={11} />SCANNER QR</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content area — BOTH tabs always in DOM ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── LIST TAB ── */}
          {/* Hidden via CSS, never unmounted */}
          <div style={{ display: tab === 'list' ? 'block' : 'none' }} className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] tracking-[0.3em] text-[#7a4a4a]/50">
                {total} {total === 1 ? 'prenotazione' : 'prenotazioni'} · {present} presenti
              </p>
              <button
                onClick={load}
                className="p-1.5 rounded-lg text-[#7a4a4a]/50 hover:text-[#731515] hover:bg-[#fdf6f6] transition-colors"
                title="Aggiorna"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-5 h-5 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <div
                className="text-center py-10 text-[#7a4a4a]/40 text-sm"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                <Users size={28} className="mx-auto mb-2 text-[#eddada]" />
                Nessun biglietto acquistato per questo evento.
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.order_id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      ticket.checked_in
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-white border-[#eddada]'
                    }`}
                  >
                    {ticket.checked_in ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <Circle size={16} className="text-[#e0c5c5] shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium truncate ${ticket.checked_in ? 'text-emerald-800' : 'text-[#1a0505]'}`}
                        style={{ fontFamily: 'var(--font-syne)' }}
                      >
                        {ticket.name}
                      </div>
                      <div
                        className={`text-[11px] truncate ${ticket.checked_in ? 'text-emerald-700/60' : 'text-[#7a4a4a]/50'}`}
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      >
                        {ticket.email}
                      </div>
                    </div>
                    {ticket.checked_in && ticket.scanned_at && (
                      <div
                        className="text-[10px] text-emerald-600/70 shrink-0"
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      >
                        {fmtTime(ticket.scanned_at)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── SCANNER TAB ── */}
          {/*
            Hidden via CSS, NEVER unmounted — this is the core of the flicker fix.

            The html5-qrcode library injects a <video> element into the camera div
            and continuously writes frames to it. If that div is unmounted (e.g. by
            switching tabs with React conditional rendering), html5-qrcode throws and
            the DOM enters an inconsistent state on remount, causing the visible
            glitching/flickering.

            By keeping this tab in the DOM at all times and controlling visibility
            with CSS only, html5-qrcode always has a stable DOM target.
          */}
          <div
            style={{ display: tab === 'scanner' ? 'flex' : 'none' }}
            className="flex-col items-center gap-5 px-6 py-6"
          >

            {/*
              Camera container — uses position:relative so overlays can stack on top.

              The key insight: the camera div (#qr-reader-*) is ALWAYS display:block.
              We never toggle its display or remove it from the DOM.
              Instead, the "placeholder", "verifying", and "result" states are
              absolutely-positioned overlays that sit in FRONT of the camera feed.
              The camera feed itself is never disturbed — only overlays change.
            */}
            <div className="relative w-full max-w-sm" style={{ minHeight: 280 }}>

              {/*
                html5-qrcode writes its video+canvas here.
                NEVER toggled display, NEVER unmounted.
                When camera is off this div is empty with a tiny min-height;
                the placeholder overlay covers it visually.
              */}
              <div
                id={`qr-reader-${event.slug}`}
                className="w-full rounded-xl overflow-hidden bg-black"
                style={{ minHeight: cameraOn ? undefined : 1 }}
              />

              {/* ── Placeholder overlay (camera off, no result) ── */}
              {!cameraOn && !scanResult && (
                <div className="absolute inset-0 rounded-xl border-2 border-dashed border-[#eddada] bg-[#fdf8f8] flex flex-col items-center justify-center gap-4 text-[#9a6060]/50">
                  <ScanLine size={52} strokeWidth={1} />
                  <p
                    className="text-sm text-center px-8 leading-relaxed"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    Premi il pulsante qui sotto per attivare la fotocamera e iniziare la scansione
                  </p>
                </div>
              )}

              {/* ── Verifying overlay (API call in flight) ── */}
              {verifying && (
                <div className="absolute inset-0 bg-black/65 rounded-xl flex flex-col items-center justify-center gap-3">
                  <div className="w-9 h-9 rounded-full border-[3px] border-white border-t-transparent animate-spin" />
                  <span
                    className="text-[10px] tracking-[0.35em] text-white/80"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    VERIFICA…
                  </span>
                </div>
              )}

              {/* ── Result overlay ── */}
              {/*
                This overlay appears ON TOP of the camera div. The camera div is untouched —
                html5-qrcode keeps writing frames underneath but lockRef prevents any new
                scan from firing. No DOM change to the camera = no flickering.
                The overlay stays visible until the user presses "SCANSIONA PROSSIMO".
              */}
              {scanResult && resultOverlay && (
                <div
                  className={`absolute inset-0 rounded-xl ${resultOverlay.bg} flex flex-col items-center justify-center gap-4 p-6 text-center`}
                >
                  {resultOverlay.icon}
                  <div>
                    <div
                      className="text-[22px] font-bold text-white leading-tight"
                      style={{ fontFamily: 'var(--font-syne)' }}
                    >
                      {resultOverlay.title}
                    </div>
                    {scanResult.name && (
                      <div
                        className={`text-base font-semibold mt-1 ${resultOverlay.nameCls}`}
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      >
                        {scanResult.name}
                      </div>
                    )}
                    {resultOverlay.sub && (
                      <div
                        className={`text-sm mt-0.5 ${resultOverlay.subCls}`}
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      >
                        {resultOverlay.sub}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleNext}
                    className="mt-1 inline-flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-[10px] tracking-[0.3em] rounded-lg transition-colors"
                  >
                    <ArrowRight size={13} />
                    SCANSIONA PROSSIMO
                  </button>
                </div>
              )}
            </div>

            {/* Camera error message */}
            {cameraErr && (
              <p
                className="text-sm text-red-600 text-center max-w-xs"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {cameraErr}
              </p>
            )}

            {/* Camera toggle button — hidden while result overlay is showing */}
            {!scanResult && (
              <button
                onClick={cameraOn ? stopCamera : startCamera}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[10px] tracking-[0.3em] transition-colors ${
                  cameraOn
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : 'bg-[#731515] text-white hover:bg-[#9b2323]'
                }`}
              >
                {cameraOn ? <CameraOff size={14} /> : <Camera size={14} />}
                {cameraOn ? 'SPEGNI FOTOCAMERA' : 'ATTIVA FOTOCAMERA'}
              </button>
            )}

          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
