'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Camera, CameraOff, Check, Loader2, RefreshCw, ScanLine, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ActionButton, EmptyState } from '@/components/admin/ui';

/**
 * Il controllo dei biglietti all'ingresso.
 *
 * Si usa in piedi sulla porta, al buio, con una mano sola e la gente
 * che aspetta: per questo è a tutto schermo sul telefono, il tondo
 * del check-in manuale è grande e l'esito di una scansione occupa
 * l'inquadratura intera.
 *
 * **I colori dell'esito restano il semaforo** — verde, ambra, rosso —
 * e sono l'unico posto in tutta l'area riservata dove il bordeaux non
 * comanda. Alla porta "è entrato" e "non è valido" devono
 * distinguersi in un decimo di secondo e di sguardo; perché non
 * dipenda solo dal colore, ognuno porta la sua icona e la sua frase.
 *
 * Note sulla fotocamera (da non smontare per ragioni estetiche):
 *  · Le due schede stanno **sempre** nel DOM e si nascondono con i
 *    CSS. Se il div della fotocamera viene smontato mentre
 *    html5-qrcode ci scrive dentro, al rimontaggio sfarfalla.
 *  · Il div `qr-reader-*` non cambia mai display: gli stati
 *    "verifica" ed "esito" sono veli sopra, non al posto suo.
 *  · `lockRef` impedisce chiamate sovrapposte dai dieci fotogrammi
 *    al secondo; `lastCodeRef` ignora lo stesso codice per cinque
 *    secondi. Sono ref, non stato, così la callback legge sempre il
 *    valore attuale.
 */

interface Ticket {
  order_id: string;
  qr_code: string | null;
  name: string;
  email: string;
  phone: string | null;
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

function ora(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function estraiToken(raw: string): string {
  try {
    return new URL(raw).searchParams.get('token') ?? raw;
  } catch {
    return raw;
  }
}

/** Per quanto ignorare lo stesso QR dopo averlo appena letto. */
const DEBOUNCE_MS = 5000;

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
  const [caricando, setCaricando] = useState(true);
  const [scheda, setScheda] = useState<'list' | 'scanner'>('list');
  const [inCorso, setInCorso] = useState<string | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraErr, setCameraErr] = useState('');
  const [verifica, setVerifica] = useState(false);
  const [esito, setEsito] = useState<ScanResult | null>(null);

  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const lockRef = useRef(false);
  const lastCodeRef = useRef('');
  const lastCodeAtRef = useRef(0);

  const load = useCallback(() => {
    setCaricando(true);
    fetch(`/api/tickets?event_id=${event.slug}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((j) => setTickets(Array.isArray(j.tickets) ? j.tickets : []))
      .catch(console.error)
      .finally(() => setCaricando(false));
  }, [event.slug, accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  /* Due persone sulla porta con due telefoni: ognuna vede i check-in
     dell'altra senza ricaricare. */
  useEffect(() => {
    supabase.realtime.setAuth(accessToken);
    const channel = supabase
      .channel(`tickets:event_id:${event.slug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `event_id=eq.${event.slug}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const agg = payload.new as Ticket;
            setTickets((prev) => prev.map((t) => (t.order_id === agg.order_id ? { ...t, ...agg } : t)));
          } else {
            load();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.slug, accessToken, load]);

  const accendiCamera = useCallback(async () => {
    setCameraErr('');
    setEsito(null);
    lockRef.current = false;
    lastCodeRef.current = '';
    lastCodeAtRef.current = 0;

    // Il div deve essere già dipinto prima che html5-qrcode parta.
    setCameraOn(true);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(`qr-reader-${event.slug}`);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },

        async (decodedText) => {
          // Controllo sincrono prima di qualunque await.
          if (lockRef.current) return;

          const token = estraiToken(decodedText);
          const adesso = Date.now();
          if (token === lastCodeRef.current && adesso - lastCodeAtRef.current < DEBOUNCE_MS) return;

          lockRef.current = true;
          lastCodeRef.current = token;
          lastCodeAtRef.current = adesso;
          setVerifica(true);

          try {
            const res = await fetch('/api/checkin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({ token }),
            });
            const data = await res.json();

            let result: ScanResult;
            if (data.valid) {
              result = { type: 'success', name: data.buyerName, email: data.buyerEmail };
              load();
            } else if (data.reason === 'already_scanned') {
              result = {
                type: 'already',
                name: data.buyerName,
                scannedBy: data.scannedBy,
                scannedAt: data.scannedAt,
              };
            } else {
              result = { type: 'invalid' };
            }

            setVerifica(false);
            setEsito(result);
            // Il lock resta: l'esito sta fermo finché non si tocca "prossimo".
          } catch {
            setVerifica(false);
            setEsito({ type: 'error' });
            // Errore di rete: si sblocca, così si riprova senza toccare nulla.
            lockRef.current = false;
          }
        },

        undefined, // gli errori per fotogramma sono normali: niente QR in vista
      );
    } catch (err) {
      console.error('[EventScanner] fotocamera', err);
      setCameraErr('Non riesco ad accedere alla fotocamera. Controlla i permessi del browser.');
      setCameraOn(false);
    }
  }, [accessToken, event.slug, load]);

  const spegniCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        /* già ferma */
      }
      scannerRef.current = null;
    }
    setCameraOn(false);
    setEsito(null);
    setVerifica(false);
    lockRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  /* Toglie il velo dell'esito: la fotocamera sotto non si è mai fermata. */
  const prossimo = useCallback(() => {
    setEsito(null);
    lockRef.current = false;
  }, []);

  const segnaPresenza = useCallback(
    async (ticket: Ticket) => {
      if (inCorso) return;
      const nuovo = !ticket.checked_in;
      setInCorso(ticket.order_id);

      setTickets((prev) =>
        prev.map((t) =>
          t.order_id === ticket.order_id
            ? {
                ...t,
                checked_in: nuovo,
                scanned_at: nuovo ? new Date().toISOString() : null,
                scanned_by: nuovo ? 'manuale' : null,
              }
            : t,
        ),
      );

      const { error } = await supabase
        .from('tickets')
        .update({
          checked_in: nuovo,
          scanned_at: nuovo ? new Date().toISOString() : null,
          scanned_by: nuovo ? 'manuale' : null,
        })
        .eq('order_id', ticket.order_id);

      if (error) {
        setTickets((prev) => prev.map((t) => (t.order_id === ticket.order_id ? { ...t, ...ticket } : t)));
      }
      setInCorso(null);
    },
    [inCorso],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const totale = tickets.length;
  const presenti = tickets.filter((t) => t.checked_in).length;

  const velo = esito
    ? ({
        success: {
          sfondo: 'bg-emerald-600',
          icona: <Check size={64} strokeWidth={2.5} />,
          titolo: 'Può entrare',
          sotto: esito.email,
        },
        already: {
          sfondo: 'bg-amber-500',
          icona: <RefreshCw size={60} strokeWidth={2} />,
          titolo: 'Già entrato',
          sotto: esito.scannedBy ? `Segnato da ${esito.scannedBy} alle ${ora(esito.scannedAt)}` : undefined,
        },
        invalid: {
          sfondo: 'bg-red-600',
          icona: <X size={64} strokeWidth={2.5} />,
          titolo: 'Biglietto non valido',
          sotto: 'Non risulta nessun biglietto con questo codice.',
        },
        error: {
          sfondo: 'bg-ink',
          icona: <X size={60} strokeWidth={2} />,
          titolo: 'Connessione assente',
          sotto: 'Riprova fra un istante.',
        },
      } as const)[esito.type]
    : null;

  return (
    <div className="ds fixed inset-0 z-[80] flex flex-col bg-paper text-on-paper lg:items-center lg:justify-center lg:bg-ink/60 lg:p-10 lg:backdrop-blur-sm">
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-paper lg:max-h-[90vh] lg:max-w-[680px] lg:flex-none lg:rounded-3xl">
        <div
          className="flex shrink-0 items-center gap-3 border-b border-rule-paper px-4 py-3 sm:px-6"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
        >
          <button
            onClick={onClose}
            aria-label="Chiudi lo scanner"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-paper-soft"
          >
            <X size={21} strokeWidth={1.8} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="ds-display truncate text-[19px] tracking-[-0.02em]">{event.title}</h2>
            <p className="mt-0.5 text-fine text-on-paper-muted">
              <span className="ds-numeric text-on-paper">{presenti}</span> presenti su{' '}
              <span className="ds-numeric text-on-paper">{totale}</span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-b border-rule-paper px-4 pb-3 sm:px-6">
          {(
            [
              { id: 'list', label: 'Partecipanti' },
              { id: 'scanner', label: 'Scanner QR' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setScheda(t.id)}
              aria-pressed={scheda === t.id}
              className={`min-h-[44px] flex-1 rounded-full border px-3 text-fine font-medium transition-colors ${
                scheda === t.id ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Nascosta con i CSS, mai smontata. */}
          <div style={{ display: scheda === 'list' ? 'block' : 'none' }} className="px-4 py-4 sm:px-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-fine text-on-paper-muted">
                {totale} {totale === 1 ? 'biglietto' : 'biglietti'}
              </p>
              <ActionButton variant="quiet" onClick={load}>
                <RefreshCw size={15} strokeWidth={1.8} />
                Aggiorna
              </ActionButton>
            </div>

            {caricando ? (
              <div className="flex justify-center py-12">
                <Loader2 size={22} className="animate-spin text-accent/50" />
              </div>
            ) : tickets.length === 0 ? (
              <EmptyState title="Nessun biglietto" body="Per questo evento non risulta ancora nessun acquisto." />
            ) : (
              <ul className="flex flex-col gap-2">
                {tickets.map((ticket) => {
                  const attesa = inCorso === ticket.order_id;
                  return (
                    <li
                      key={ticket.order_id}
                      className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${
                        ticket.checked_in ? 'border-accent/35 bg-accent/5' : 'border-rule-paper'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium">{ticket.name}</p>
                        <p className="mt-0.5 flex flex-wrap gap-x-3 truncate text-fine text-on-paper-muted">
                          <span>{ticket.email}</span>
                          {ticket.phone && <span>{ticket.phone}</span>}
                          {ticket.checked_in && ticket.scanned_at && (
                            <span>
                              {ticket.scanned_by === 'manuale' ? 'a mano' : 'scansionato'} alle {ora(ticket.scanned_at)}
                            </span>
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => segnaPresenza(ticket)}
                        disabled={attesa}
                        aria-pressed={!!ticket.checked_in}
                        aria-label={ticket.checked_in ? 'Togli la presenza' : 'Segna come presente'}
                        style={{ touchAction: 'manipulation' }}
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border transition-colors active:scale-95 ${
                          ticket.checked_in
                            ? 'border-accent bg-accent text-paper'
                            : 'border-rule-paper text-on-paper-muted/40 hover:border-accent/50 hover:text-accent'
                        }`}
                      >
                        {attesa ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Check size={20} strokeWidth={ticket.checked_in ? 2.5 : 1.6} />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Anche questa resta nel DOM: è il punto di tutta l'architettura. */}
          <div
            style={{ display: scheda === 'scanner' ? 'flex' : 'none' }}
            className="flex-col items-center gap-5 px-4 py-5 sm:px-6"
          >
            <div className="relative w-full max-w-sm" style={{ minHeight: 280 }}>
              {/* html5-qrcode scrive qui dentro: mai nascosto, mai smontato. */}
              <div
                id={`qr-reader-${event.slug}`}
                className="w-full overflow-hidden rounded-2xl bg-ink"
                style={{ minHeight: cameraOn ? undefined : 1 }}
              />

              {!cameraOn && !esito && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-rule-paper bg-paper-soft px-8 text-center text-on-paper-muted">
                  <ScanLine size={48} strokeWidth={1} />
                  <p className="text-body">Accendi la fotocamera e inquadra il QR del biglietto.</p>
                </div>
              )}

              {verifica && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-ink/70 text-on-ink">
                  <Loader2 size={34} className="animate-spin" />
                  <span className="text-body">Verifico…</span>
                </div>
              )}

              {esito && velo && (
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl p-6 text-center text-white ${velo.sfondo}`}
                >
                  {velo.icona}
                  <div>
                    <p className="ds-display text-[24px] leading-tight tracking-[-0.02em]">{velo.titolo}</p>
                    {esito.name && <p className="mt-1 text-lead">{esito.name}</p>}
                    {velo.sotto && <p className="mt-1 text-fine text-white/80">{velo.sotto}</p>}
                  </div>
                  <button
                    onClick={prossimo}
                    className="mt-1 inline-flex min-h-[48px] items-center gap-2 rounded-full border border-white/35 bg-white/15 px-6 text-fine font-medium transition-colors hover:bg-white/25"
                  >
                    <ArrowRight size={16} strokeWidth={2} />
                    Prossimo
                  </button>
                </div>
              )}
            </div>

            {cameraErr && <p className="max-w-xs text-center text-fine text-accent">{cameraErr}</p>}

            {!esito && (
              <ActionButton variant={cameraOn ? 'quiet' : 'accent'} onClick={cameraOn ? spegniCamera : accendiCamera}>
                {cameraOn ? <CameraOff size={16} strokeWidth={1.8} /> : <Camera size={16} strokeWidth={1.8} />}
                {cameraOn ? 'Spegni la fotocamera' : 'Accendi la fotocamera'}
              </ActionButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
