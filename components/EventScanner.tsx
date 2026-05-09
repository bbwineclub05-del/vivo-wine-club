'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ScanLine, CheckCircle2, Circle, Users, RefreshCw, Camera, CameraOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────────
   Types — match actual Supabase tickets schema
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
function fmtTime(iso: string | null) {
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
   Scan result banner
───────────────────────────────────────────── */
function ScanBanner({ result, onDismiss }: { result: ScanResult; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [result, onDismiss]);

  const styles: Record<ScanResult['type'], { bg: string; border: string; text: string }> = {
    success: { bg: 'bg-emerald-50',  border: 'border-emerald-300', text: 'text-emerald-800' },
    already: { bg: 'bg-amber-50',    border: 'border-amber-300',   text: 'text-amber-800' },
    invalid: { bg: 'bg-red-50',      border: 'border-red-300',     text: 'text-red-800' },
    error:   { bg: 'bg-slate-50',    border: 'border-slate-300',   text: 'text-slate-700' },
  };

  const s = styles[result.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className={`rounded-xl border p-4 mb-4 ${s.bg} ${s.border}`}
    >
      <div className={`font-medium text-sm mb-0.5 ${s.text}`} style={{ fontFamily: 'var(--font-syne)' }}>
        {result.type === 'success' && `✓ Accesso confermato — ${result.name}`}
        {result.type === 'already' && `⚠ Biglietto già utilizzato — ${result.name}`}
        {result.type === 'invalid' && '✗ Biglietto non valido'}
        {result.type === 'error'   && 'Errore di connessione'}
      </div>
      {result.type === 'success' && result.email && (
        <p className={`text-xs ${s.text} opacity-75`} style={{ fontFamily: 'var(--font-nunito)' }}>
          {result.email}
        </p>
      )}
      {result.type === 'already' && result.scannedBy && (
        <p className={`text-xs ${s.text} opacity-75`} style={{ fontFamily: 'var(--font-nunito)' }}>
          Scansionato da {result.scannedBy} alle {fmtTime(result.scannedAt ?? null)}
        </p>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   QR Scanner tab
───────────────────────────────────────────── */
function QrScanner({
  accessToken,
  eventId,
  onScan,
}: {
  accessToken: string;
  eventId: string;
  onScan: (result: ScanResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const containerId = `qr-reader-${eventId}`;

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (scanning) return;
          setScanning(true);

          const token = extractToken(decodedText);

          try {
            const res = await fetch('/api/checkin', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ token }),
            });
            const data = await res.json();

            if (data.valid) {
              onScan({
                type: 'success',
                name:  data.buyerName,
                email: data.buyerEmail,
              });
            } else if (data.reason === 'already_scanned') {
              onScan({
                type: 'already',
                name: data.buyerName,
                scannedBy: data.scannedBy,
                scannedAt: data.scannedAt,
              });
            } else {
              onScan({ type: 'invalid' });
            }
          } catch {
            onScan({ type: 'error' });
          } finally {
            setTimeout(() => setScanning(false), 2000);
          }
        },
        undefined,
      );

      setCameraActive(true);
    } catch (err) {
      console.error('[QrScanner]', err);
      setCameraError('Impossibile accedere alla fotocamera. Controlla i permessi.');
    }
  }, [accessToken, eventId, onScan, scanning]);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch { /* already stopped */ }
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Camera container — html5-qrcode needs a DOM element with this id */}
      <div
        id={`qr-reader-${eventId}`}
        className={`w-full max-w-sm rounded-xl overflow-hidden bg-black ${cameraActive ? '' : 'hidden'}`}
      />

      {!cameraActive && (
        <div className="w-full max-w-sm aspect-square rounded-xl border-2 border-dashed border-[#eddada] bg-[#fdf8f8] flex flex-col items-center justify-center gap-4 text-[#9a6060]/60">
          <ScanLine size={48} strokeWidth={1} />
          <p className="text-sm text-center px-4" style={{ fontFamily: 'var(--font-nunito)' }}>
            Premi il pulsante per attivare la fotocamera e scannerizzare i QR code dei biglietti
          </p>
        </div>
      )}

      {cameraError && (
        <p className="text-sm text-red-600 text-center" style={{ fontFamily: 'var(--font-nunito)' }}>
          {cameraError}
        </p>
      )}

      {scanning && (
        <p className="text-sm text-[#731515] animate-pulse" style={{ fontFamily: 'var(--font-nunito)' }}>
          Verifica in corso…
        </p>
      )}

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
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<'list' | 'scanner'>('list');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

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
            load(); // INSERT or DELETE — reload full list
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event.slug, load]);

  /* ── Stats ── */
  const total   = tickets.length;
  const present = tickets.filter(t => t.checked_in).length;

  /* ── Scan handler: update locally optimistic + banner ── */
  const handleScanResult = useCallback((result: ScanResult) => {
    setScanResult(result);
    if (result.type === 'success') {
      load(); // refresh list to pick up newly scanned
    }
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
            <h2 className="text-lg font-light text-[#1a0505] leading-tight" style={{ fontFamily: 'var(--font-syne)' }}>
              {event.title}
            </h2>
          </div>

          {/* Counter */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-[28px] font-light text-[#731515] leading-none" style={{ fontFamily: 'var(--font-syne)' }}>
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

          {/* Scan result banner */}
          <div className="px-6 pt-4">
            <AnimatePresence>
              {scanResult && (
                <ScanBanner
                  key={JSON.stringify(scanResult)}
                  result={scanResult}
                  onDismiss={() => setScanResult(null)}
                />
              )}
            </AnimatePresence>
          </div>

          {tab === 'list' && (
            <div className="px-6 pb-6">
              {/* Refresh button */}
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
                <div className="text-center py-10 text-[#7a4a4a]/40 text-sm" style={{ fontFamily: 'var(--font-nunito)' }}>
                  <Users size={28} className="mx-auto mb-2 text-[#eddada]" />
                  Nessun biglietto acquistato per questo evento.
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.order_id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        ticket.checked_in
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-white border-[#eddada]'
                      }`}
                    >
                      {/* Status icon */}
                      {ticket.checked_in ? (
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      ) : (
                        <Circle size={16} className="text-[#e0c5c5] shrink-0" />
                      )}

                      {/* Info */}
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

                      {/* Check-in time */}
                      {ticket.checked_in && ticket.scanned_at && (
                        <div className="text-[10px] text-emerald-600/70 shrink-0 text-right" style={{ fontFamily: 'var(--font-nunito)' }}>
                          {fmtTime(ticket.scanned_at)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'scanner' && (
            <div className="px-6 py-6">
              <QrScanner
                accessToken={accessToken}
                eventId={event.slug}
                onScan={handleScanResult}
              />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
