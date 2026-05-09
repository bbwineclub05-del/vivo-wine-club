'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  type: 'success' | 'already' | 'invalid' | 'error';
  name?: string;
  email?: string;
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

/* ─────────────────────────────────────────────
   Scan result overlay (shown inside scanner tab)
   Stays visible until user presses "SCAN NEXT" —
   no auto-dismiss timer that could cause flickering.
───────────────────────────────────────────── */
function ScanResultOverlay({
  result,
  onNext,
}: {
  result: ScanResult;
  onNext: () => void;
}) {
  const cfg = {
    success: {
      bg:      'bg-emerald-50',
      border:  'border-emerald-200',
      icon:    <CheckCircle2 size={52} className="text-emerald-500" />,
      title:   `✓ Accesso confermato`,
      titleCls: 'text-emerald-800',
      subCls:   'text-emerald-700/70',
    },
    already: {
      bg:      'bg-amber-50',
      border:  'border-amber-200',
      icon:    <AlertTriangle size={52} className="text-amber-500" />,
      title:   '⚠ Biglietto già utilizzato',
      titleCls: 'text-amber-800',
      subCls:   'text-amber-700/70',
    },
    invalid: {
      bg:      'bg-red-50',
      border:  'border-red-200',
      icon:    <XCircle size={52} className="text-red-500" />,
      title:   '✗ Biglietto non valido',
      titleCls: 'text-red-800',
      subCls:   'text-red-700/70',
    },
    error: {
      bg:      'bg-slate-50',
      border:  'border-slate-200',
      icon:    <XCircle size={52} className="text-slate-400" />,
      title:   'Errore di connessione',
      titleCls: 'text-slate-700',
      subCls:   'text-slate-500',
    },
  }[result.type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full max-w-sm mx-auto rounded-2xl border-2 p-8 flex flex-col items-center gap-4 text-center ${cfg.bg} ${cfg.border}`}
    >
      {cfg.icon}

      <div>
        <div className={`text-lg font-semibold leading-tight ${cfg.titleCls}`} style={{ fontFamily: 'var(--font-syne)' }}>
          {cfg.title}
        </div>

        {result.name && (
          <div className={`mt-1 text-base font-medium ${cfg.titleCls}`} style={{ fontFamily: 'var(--font-nunito)' }}>
            {result.name}
          </div>
        )}

        {result.type === 'success' && result.email && (
          <div className={`mt-0.5 text-sm ${cfg.subCls}`} style={{ fontFamily: 'var(--font-nunito)' }}>
            {result.email}
          </div>
        )}

        {result.type === 'already' && result.scannedBy && (
          <div className={`mt-0.5 text-sm ${cfg.subCls}`} style={{ fontFamily: 'var(--font-nunito)' }}>
            Scansionato da {result.scannedBy} alle {fmtTime(result.scannedAt)}
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-[#731515] text-white text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#9b2323] transition-colors"
      >
        <ArrowRight size={13} />
        SCANSIONA PROSSIMO
      </button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   QR Scanner
───────────────────────────────────────────── */
function QrScanner({
  accessToken,
  eventId,
  onScanComplete,
}: {
  accessToken: string;
  eventId: string;
  onScanComplete: (result: ScanResult) => void;
}) {
  const scannerRef  = useRef<{ stop: () => Promise<void> } | null>(null);
  // ↓ useRef (not useState) so the closure inside html5-qrcode callback always
  //   sees the current value — state snapshots would always read the initial false.
  const lockRef     = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError,  setCameraError]  = useState('');
  const [verifying,    setVerifying]    = useState(false);
  const [result,       setResult]       = useState<ScanResult | null>(null);

  // ── Start camera ──────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError('');
    lockRef.current = false;

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const containerId = `qr-reader-${eventId}`;
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },

        // ── Success callback — fires every ~100ms while QR is in view ──────────
        async (decodedText) => {
          // lockRef.current guards against concurrent calls from repeated frames.
          // Using a ref (not state) ensures the closure always reads the latest value.
          if (lockRef.current) return;
          lockRef.current = true;
          setVerifying(true);

          const token = extractToken(decodedText);

          try {
            const res  = await fetch('/api/checkin', {
              method:  'POST',
              headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ token }),
            });
            const data = await res.json();

            let scanResult: ScanResult;
            if (data.valid) {
              scanResult = { type: 'success', name: data.buyerName, email: data.buyerEmail };
            } else if (data.reason === 'already_scanned') {
              scanResult = { type: 'already', name: data.buyerName, scannedBy: data.scannedBy, scannedAt: data.scannedAt };
            } else {
              scanResult = { type: 'invalid' };
            }

            setResult(scanResult);
            onScanComplete(scanResult);
          } catch {
            const errResult: ScanResult = { type: 'error' };
            setResult(errResult);
            onScanComplete(errResult);
            // On network error, unlock immediately so user can retry
            lockRef.current = false;
          } finally {
            setVerifying(false);
            // lockRef stays true on success/already/invalid —
            // unlocked only when user presses "SCAN NEXT"
          }
        },

        undefined, // error callback — suppress frame-level decode errors
      );

      setCameraActive(true);
    } catch (err) {
      console.error('[QrScanner] camera error:', err);
      setCameraError('Impossibile accedere alla fotocamera. Controlla i permessi del browser.');
    }
  }, [accessToken, eventId, onScanComplete]);

  // ── Stop camera ───────────────────────────────────────────────────────────────
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* already stopped */ }
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  // ── "Scan Next" — clear result and unlock ────────────────────────────────────
  const handleNext = useCallback(() => {
    setResult(null);
    lockRef.current = false;
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-5">

      {/* Result overlay — shown instead of camera view when a scan is complete */}
      <AnimatePresence mode="wait">
        {result ? (
          <ScanResultOverlay key="result" result={result} onNext={handleNext} />
        ) : (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full flex flex-col items-center gap-4"
          >
            {/* html5-qrcode mounts its video into this div */}
            <div
              id={`qr-reader-${eventId}`}
              className={`w-full max-w-sm rounded-xl overflow-hidden bg-black ${cameraActive ? '' : 'hidden'}`}
            />

            {!cameraActive && (
              <div className="w-full max-w-sm aspect-square rounded-xl border-2 border-dashed border-[#eddada] bg-[#fdf8f8] flex flex-col items-center justify-center gap-4 text-[#9a6060]/60">
                <ScanLine size={48} strokeWidth={1} />
                <p className="text-sm text-center px-6 leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                  Premi il pulsante qui sotto per attivare la fotocamera e scannerizzare il QR del biglietto
                </p>
              </div>
            )}

            {cameraError && (
              <p className="text-sm text-red-600 text-center px-4" style={{ fontFamily: 'var(--font-nunito)' }}>
                {cameraError}
              </p>
            )}

            {verifying && (
              <div className="flex items-center gap-2 text-sm text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
                <div className="w-4 h-4 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
                Verifica in corso…
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera toggle — hidden when result is showing */}
      {!result && (
        <button
          onClick={cameraActive ? stopCamera : startCamera}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[10px] tracking-[0.3em] transition-colors ${
            cameraActive
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-[#731515] text-white hover:bg-[#9b2323]'
          }`}
        >
          {cameraActive ? <CameraOff size={14} /> : <Camera size={14} />}
          {cameraActive ? 'SPEGNI FOTOCAMERA' : 'ATTIVA FOTOCAMERA'}
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<'list' | 'scanner'>('list');

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

  /* ── Supabase Realtime ── */
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
              prev.map(t => t.order_id === updated.order_id ? { ...t, ...updated } : t)
            );
          } else {
            load();
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event.slug, load]);

  /* ── Stats ── */
  const total   = tickets.length;
  const present = tickets.filter(t => t.checked_in).length;

  /* ── Scan complete: refresh list on success ── */
  const handleScanComplete = useCallback((result: ScanResult) => {
    if (result.type === 'success') load();
  }, [load]);

  /* Close on ESC */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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

        {/* ── Tabs ── */}
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

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* PARTICIPANTS tab */}
          {tab === 'list' && (
            <div className="px-6 py-5">
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
          )}

          {/* SCANNER tab */}
          {tab === 'scanner' && (
            <div className="px-6 py-6">
              <QrScanner
                accessToken={accessToken}
                eventId={event.slug}
                onScanComplete={handleScanComplete}
              />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
