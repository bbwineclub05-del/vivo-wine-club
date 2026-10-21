'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Mail, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOverlayBackClose } from '@/lib/useMobileOverlay';
import {
  ActionButton,
  EmptyState,
  Field,
  PageHead,
  Select,
  Sheet,
  TextArea,
  TextInput,
} from '@/components/admin/ui';
import {
  SEGMENTS,
  countByEvent,
  filterPeople,
  mailable,
  prettifySlug,
  type Person,
  type SegmentId,
} from '@/lib/crm';

/**
 * Persone.
 *
 * La domanda che si fa chi apre questa schermata è sempre la stessa:
 * *a chi sto scrivendo, e quanti sono.* Quindi il numero di
 * destinatari sta in alto, grande, e cambia mentre si stringono i
 * filtri; e il pulsante per scrivere dice quante persone riceveranno
 * la mail, non "Invia".
 *
 * Il filtro per evento è la cosa che serve di più e per questo è il
 * primo comando. Prima non funzionava — non per come era fatto, ma
 * perché la rubrica arrivava tagliata a mille righe su 1413, e
 * "Bottenago" ne mostrava 270 su 538.
 *
 * I gruppi non sono etichette da assegnare a mano, che nessuno
 * manterrebbe aggiornate: sono domande a cui i dati rispondono già —
 * chi è venuto una volta sola, chi torna, chi non si vede da sei mesi.
 */

type PersonRow = Person & { consent_marketing?: boolean };

interface EventOption {
  slug: string;
  title: string;
  count: number;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─────────────────────────────────────────────
   Scrivi
───────────────────────────────────────────── */
function ComposeSheet({
  recipients,
  consenting,
  token,
  onClose,
  onSent,
}: {
  recipients: { email: string; name: string }[];
  consenting: { email: string; name: string }[];
  token: string;
  onClose: () => void;
  onSent: (msg: string) => void;
}) {
  // Si parte da chi ha dato il consenso: è la scelta che non va
  // spiegata a nessuno. L'altra resta possibile, ma va presa apposta.
  const [onlyConsenting, setOnlyConsenting] = useState(true);
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const list = onlyConsenting ? consenting : recipients;
  const without = recipients.length - consenting.length;

  async function send() {
    if (!subject.trim() || !text.trim()) {
      setError('Servono oggetto e testo.');
      return;
    }
    if (list.length === 0) {
      setError('Nessun destinatario.');
      return;
    }
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/crm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: 'custom',
          recipients: list,
          subject: subject.trim(),
          text: text.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Invio non riuscito.');
      onSent(`Mail inviata a ${data.sent ?? list.length} persone.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet
      open
      title="Scrivi"
      onClose={onClose}
      footer={
        <div className="flex gap-2.5">
          <ActionButton variant="quiet" onClick={onClose} className="flex-1">
            Annulla
          </ActionButton>
          <ActionButton onClick={send} disabled={sending || list.length === 0} className="flex-[2]">
            {sending ? 'Invio…' : `Invia a ${list.length}`}
          </ActionButton>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-rule-paper p-4">
          <p className="text-fine text-on-paper-muted">Destinatari</p>
          <p className="ds-display mt-1 text-[26px] leading-none tracking-[-0.02em]">
            {list.length}
          </p>

          {without > 0 && (
            <label className="mt-3.5 flex cursor-pointer items-start gap-3">
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors ${
                  onlyConsenting ? 'border-accent bg-accent text-paper' : 'border-rule-paper'
                }`}
              >
                {onlyConsenting && <Check size={14} strokeWidth={3} />}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={onlyConsenting}
                onChange={(e) => setOnlyConsenting(e.target.checked)}
              />
              <span className="min-w-0 text-fine">
                Solo chi ha dato il consenso marketing
                <span className="mt-0.5 block text-on-paper-muted">
                  {without} delle {recipients.length} persone selezionate non risultano averlo
                  dato. Per chi si è iscritto prima di fine luglio 2026 la casella non esisteva
                  ancora, quindi è una domanda mai fatta più che un rifiuto.
                </span>
              </span>
            </label>
          )}
        </div>

        <Field label="Oggetto">
          <TextInput
            autoFocus
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Di cosa si tratta"
          />
        </Field>

        <Field label="Messaggio" hint="— {{name}} diventa il nome di chi legge">
          <TextArea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Ciao {{name}},\n\n…'}
          />
        </Field>

        {error && <p className="text-fine font-medium text-accent">{error}</p>}
      </div>
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   Persone
───────────────────────────────────────────── */
export default function CrmPersone() {
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [events, setEvents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');

  const [segment, setSegment] = useState<SegmentId>('all');
  const [event, setEvent] = useState('');
  const [query, setQuery] = useState('');
  const [onlyConsent, setOnlyConsent] = useState(false);
  const [shown, setShown] = useState(60);
  const [compose, setCompose] = useState(false);

  useOverlayBackClose(compose, () => setCompose(false));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tk = session?.access_token ?? '';
      setToken(tk);

      const [cRes, eRes] = await Promise.all([
        fetch('/api/crm/customers', { headers: { Authorization: `Bearer ${tk}` } }),
        fetch('/api/events/all'),
      ]);

      const cJson = await cRes.json();
      if (!cRes.ok) throw new Error(cJson.error ?? 'Impossibile leggere la rubrica.');
      setPeople(cJson.customers ?? []);

      if (eRes.ok) {
        const eJson = await eRes.json().catch(() => ({}));
        const map: Record<string, string> = {};
        for (const e of eJson.events ?? []) if (e.slug) map[e.slug] = e.title ?? e.slug;
        setEvents(map);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Gli eventi, con quante persone ciascuno, su tutta la rubrica. */
  const eventOptions = useMemo<EventOption[]>(() => {
    const counts = countByEvent(people);
    return Object.entries(counts)
      .map(([slug, count]) => ({ slug, title: events[slug] ?? prettifySlug(slug), count }))
      .sort((a, b) => b.count - a.count);
  }, [people, events]);

  const filtered = useMemo(() => {
    const base = filterPeople(people, { segment, event, query });
    return onlyConsent ? base.filter((p) => p.consent_marketing) : base;
  }, [people, segment, event, query, onlyConsent]);

  const recipients = useMemo(() => mailable(filtered), [filtered]);
  const consenting = useMemo(
    () => mailable(filtered.filter((p) => p.consent_marketing)),
    [filtered],
  );

  // Stringere un filtro e restare a pagina 4 dell'elenco precedente
  // non ha senso.
  useEffect(() => {
    setShown(60);
  }, [segment, event, query, onlyConsent]);

  const activeSegment = SEGMENTS.find((s) => s.id === segment) ?? SEGMENTS[0];
  const filtersOn = segment !== 'all' || !!event || !!query.trim() || onlyConsent;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHead
        title="Persone"
        subtitle={`${people.length} persone passate dagli eventi del club.`}
        action={
          <ActionButton onClick={() => setCompose(true)} disabled={recipients.length === 0}>
            <Mail size={17} strokeWidth={1.9} />
            Scrivi a {recipients.length}
          </ActionButton>
        }
      />

      {message && (
        <p className="mb-5 rounded-2xl border border-rule-paper px-4 py-3 text-fine font-medium">
          {message}
        </p>
      )}

      {error ? (
        <EmptyState
          title="Non riesco a leggere la rubrica"
          body={error}
          action={<ActionButton onClick={load}>Riprova</ActionButton>}
        />
      ) : (
        <>
          {/* ── Evento: il filtro che serve di più, quindi il primo ── */}
          <div className="mb-3">
            <Field label="Evento">
              <Select value={event} onChange={(e) => setEvent(e.target.value)}>
                <option value="">Tutti gli eventi — {people.length} persone</option>
                {eventOptions.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.title} — {o.count}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* ── Gruppi ── */}
          <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SEGMENTS.map((s) => {
              const on = segment === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSegment(s.id)}
                  aria-pressed={on}
                  className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full border px-3.5 text-fine font-medium transition-colors ${
                    on ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <p className="mb-4 text-fine text-on-paper-muted">{activeSegment.hint}</p>

          {/* ── Ricerca e consenso ── */}
          <div className="mb-4 flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="flex min-w-[220px] flex-1 items-center gap-2.5 rounded-full border border-rule-paper px-4">
              <Search size={17} strokeWidth={1.8} className="shrink-0 text-on-paper-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca nome o email"
                className="min-h-[48px] w-full bg-transparent text-body placeholder:text-on-paper-muted/60 focus:outline-none [font-size:16px]"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Pulisci"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-paper-soft"
                >
                  <X size={15} strokeWidth={2} />
                </button>
              )}
            </div>

            <button
              onClick={() => setOnlyConsent((v) => !v)}
              aria-pressed={onlyConsent}
              className={`inline-flex min-h-[48px] items-center gap-2 rounded-full border px-4 text-fine font-medium transition-colors ${
                onlyConsent
                  ? 'border-accent bg-accent text-paper'
                  : 'border-rule-paper text-on-paper'
              }`}
            >
              <ShieldCheck size={16} strokeWidth={1.8} />
              Solo con consenso
            </button>
          </div>

          {/* ── Quante persone, adesso ── */}
          <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-2xl border border-rule-paper px-4 py-3.5">
            <span className="ds-display text-[26px] leading-none tracking-[-0.02em]">
              {recipients.length}
            </span>
            <span className="text-fine text-on-paper-muted">
              {recipients.length === 1 ? 'persona selezionata' : 'persone selezionate'} ·{' '}
              {consenting.length} con consenso marketing
            </span>
            {filtersOn && (
              <button
                onClick={() => {
                  setSegment('all');
                  setEvent('');
                  setQuery('');
                  setOnlyConsent(false);
                }}
                className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 text-fine font-medium text-accent"
              >
                <RefreshCw size={13} strokeWidth={2} />
                Azzera i filtri
              </button>
            )}
          </div>

          {/* ── L'elenco ── */}
          {filtered.length === 0 ? (
            <EmptyState
              title="Nessuno corrisponde"
              body="Prova ad allargare i filtri, o a togliere il vincolo del consenso."
            />
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                {filtered.slice(0, shown).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-2xl border border-rule-paper px-3.5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body">{p.name?.trim() || p.email}</p>
                      <p className="mt-0.5 truncate text-fine text-on-paper-muted">
                        {p.email} · {p.total_events ?? p.events?.length ?? 0}{' '}
                        {(p.total_events ?? p.events?.length ?? 0) === 1 ? 'evento' : 'eventi'} ·{' '}
                        {fmtDate(p.last_purchase_at)}
                      </p>
                    </div>
                    {p.consent_marketing && (
                      <span
                        title="Ha dato il consenso marketing"
                        className="shrink-0 text-accent"
                        aria-label="Consenso marketing"
                      >
                        <ShieldCheck size={17} strokeWidth={1.8} />
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {filtered.length > shown && (
                <button
                  onClick={() => setShown((n) => n + 120)}
                  className="mt-3 flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-dashed border-rule-paper text-fine font-medium transition-colors hover:border-accent/50"
                >
                  Mostra altre {Math.min(120, filtered.length - shown)} · ne restano{' '}
                  {filtered.length - shown}
                </button>
              )}
            </>
          )}
        </>
      )}

      {compose && (
        <ComposeSheet
          recipients={recipients}
          consenting={consenting}
          token={token}
          onClose={() => setCompose(false)}
          onSent={(m) => {
            setMessage(m);
            setCompose(false);
          }}
        />
      )}
    </div>
  );
}
