'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, GripVertical, Mail, Plus, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOverlayBackClose } from '@/lib/useMobileOverlay';
import {
  ActionButton,
  Field,
  PageHead,
  Sheet,
  TextArea,
  TextInput,
} from '@/components/admin/ui';
import { formatEur, toCents } from '@/lib/ledger';
import { scaricaConModulo } from '@/lib/scarica';

/**
 * Preventivi.
 *
 * Prima i servizi erano sei caselle da spuntare — Degustazione,
 * Sommelier, DJ Set, Catering, Trasporto, Altro — e il prezzo era un
 * unico campo di testo scollegato da esse. Siccome gli eventi del club
 * non si somigliano quasi mai, metà delle proposte finiva dentro
 * "Altro" e il cliente riceveva un foglio che non diceva cosa stesse
 * comprando.
 *
 * Qui una proposta è un elenco di voci scritte a mano, ognuna col suo
 * importo, e il totale è la loro somma: non un campo a parte che
 * qualcuno può dimenticare di aggiornare. Una voce senza importo vale
 * "Incluso", che è il modo onesto di dire che c'è ma non si paga a
 * parte.
 */

interface Item {
  id: string;
  description: string;
  /** Come lo si scrive: "150", "150,50". Vuoto = incluso. */
  amount: string;
}

interface QuoteForm {
  clientName: string;
  clientEmail: string;
  eventType: string;
  eventDate: string;
  venue: string;
  attendees: string;
  items: Item[];
  paymentConditions: string;
  description: string;
  notes: string;
}

/** Scorciatoie, non una gabbia: aggiungono una voce che poi si modifica. */
const QUICK_ITEMS = [
  'Degustazione guidata',
  'Sommelier',
  'Vini',
  'Catering',
  'DJ set',
  'Allestimento',
  'Fotografo',
  'Trasporto',
  'Personale di sala',
];

const QUICK_EVENTS = ['Wine Party', 'Wine Visit', 'Wine Lounge', 'Degustazione privata', 'Evento aziendale'];

let seq = 0;
function newItem(description = ''): Item {
  seq += 1;
  return { id: `i${Date.now()}-${seq}`, description, amount: '' };
}

function quoteNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `VWC-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function todayIT() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const EMPTY: QuoteForm = {
  clientName: '',
  clientEmail: '',
  eventType: '',
  eventDate: '',
  venue: '',
  attendees: '',
  items: [newItem()],
  paymentConditions: '',
  description: '',
  notes: '',
};

/* ─────────────────────────────────────────────
   Invio
───────────────────────────────────────────── */
function SendSheet({
  defaultEmail,
  number,
  sending,
  onClose,
  onSend,
}: {
  defaultEmail: string;
  number: string;
  sending: boolean;
  onClose: () => void;
  onSend: (to: string, subject: string) => void;
}) {
  const [to, setTo] = useState(defaultEmail);
  const [subject, setSubject] = useState(`Proposta evento — Vivo Wine Club (N° ${number})`);

  return (
    <Sheet
      open
      title="Invia il preventivo"
      onClose={onClose}
      footer={
        <div className="flex gap-2.5">
          <ActionButton variant="quiet" onClick={onClose} className="flex-1">
            Annulla
          </ActionButton>
          <ActionButton
            onClick={() => onSend(to, subject)}
            disabled={sending || !to.includes('@')}
            className="flex-[2]"
          >
            {sending ? 'Invio…' : 'Invia'}
          </ActionButton>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="A">
          <TextInput
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="cliente@esempio.it"
          />
        </Field>
        <Field label="Oggetto">
          <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <p className="text-fine text-on-paper-muted">
          Il PDF viene allegato alla mail. Le risposte arrivano a info@vivowineclub.com.
        </p>
      </div>
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   Anteprima
───────────────────────────────────────────── */
function Preview({
  form,
  number,
  issueDate,
  totalCents,
}: {
  form: QuoteForm;
  number: string;
  issueDate: string;
  totalCents: number;
}) {
  const items = form.items.filter((i) => i.description.trim());

  const rows = [
    { k: 'Cliente', v: form.clientName },
    { k: 'Evento', v: form.eventType },
    { k: 'Data', v: form.eventDate },
    { k: 'Luogo', v: form.venue },
    { k: 'Persone', v: form.attendees },
  ].filter((r) => r.v.trim());

  return (
    <article className="rounded-2xl border border-rule-paper p-5 lg:p-8">
      <header className="border-b border-rule-paper pb-5">
        <p className="ds-display text-[22px] leading-none tracking-[-0.02em]">Proposta evento</p>
        <p className="mt-2 text-fine text-on-paper-muted">
          N° {number} · {issueDate}
        </p>
      </header>

      {rows.length > 0 && (
        <dl className="mt-5 grid gap-px overflow-hidden rounded-xl border border-rule-paper bg-rule-paper">
          {rows.map((r) => (
            <div key={r.k} className="flex flex-wrap gap-x-4 gap-y-1 bg-paper px-4 py-2.5">
              <dt className="min-w-[90px] shrink-0 text-fine text-on-paper-muted">{r.k}</dt>
              <dd className="min-w-0 break-words text-body">{r.v}</dd>
            </div>
          ))}
        </dl>
      )}

      {form.description.trim() && (
        <p className="mt-5 whitespace-pre-wrap text-body text-on-paper-muted">{form.description}</p>
      )}

      {items.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-fine font-medium">La proposta</h3>
          <div className="divide-y divide-rule-paper border-t border-rule-paper">
            {items.map((it) => {
              const c = it.amount.trim() ? toCents(it.amount) : null;
              return (
                <div key={it.id} className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="min-w-0 text-body">{it.description}</span>
                  <span
                    className={`shrink-0 tabular-nums ${
                      c === null ? 'text-fine text-on-paper-muted' : 'text-body'
                    }`}
                  >
                    {c === null ? 'Incluso' : formatEur(c)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-rule-paper pt-4">
        <span className="text-fine font-medium">Totale</span>
        <span className="ds-display text-[26px] leading-none tracking-[-0.02em] text-accent">
          {formatEur(totalCents)}
        </span>
      </div>

      {form.paymentConditions.trim() && (
        <div className="mt-6">
          <h3 className="mb-1.5 text-fine font-medium">Condizioni di pagamento</h3>
          <p className="whitespace-pre-wrap text-body text-on-paper-muted">
            {form.paymentConditions}
          </p>
        </div>
      )}

      {form.notes.trim() && (
        <div className="mt-5">
          <h3 className="mb-1.5 text-fine font-medium">Note</h3>
          <p className="whitespace-pre-wrap text-body text-on-paper-muted">{form.notes}</p>
        </div>
      )}
    </article>
  );
}

/* ─────────────────────────────────────────────
   Preventivi
───────────────────────────────────────────── */
export default function QuoteGenerator() {
  const [token, setToken] = useState('');
  const [form, setForm] = useState<QuoteForm>(EMPTY);

  // Numero e data si calcolano dopo il montaggio, non durante il render.
  // Il numero contiene una parte casuale: generato nel render, il server
  // ne scriverebbe uno e il browser un altro, e React butterebbe via
  // l'albero per rifarlo. Succedeva anche prima.
  const [number, setNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');

  useEffect(() => {
    setNumber(quoteNumber());
    setIssueDate(todayIT());
  }, []);

  const [tab, setTab] = useState<'form' | 'preview'>('form');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useOverlayBackClose(sendOpen, () => setSendOpen(false));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });
  }, []);

  function set<K extends keyof QuoteForm>(k: K, v: QuoteForm[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  /* ── Le voci ── */
  function patchItem(id: string, patch: Partial<Item>) {
    setForm((p) => ({
      ...p,
      items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }

  function addItem(description = '') {
    setForm((p) => {
      // Una scorciatoia riempie la prima riga ancora vuota invece di
      // accodarsene una sotto: altrimenti dopo due tocchi ci si ritrova
      // con una riga vuota in mezzo da cancellare a mano.
      if (description) {
        const i = p.items.findIndex((x) => !x.description.trim() && !x.amount.trim());
        if (i >= 0) {
          const items = [...p.items];
          items[i] = { ...items[i], description };
          return { ...p, items };
        }
      }
      return { ...p, items: [...p.items, newItem(description)] };
    });
  }

  function removeItem(id: string) {
    setForm((p) => {
      const next = p.items.filter((i) => i.id !== id);
      // Resta sempre una riga: un elenco vuoto senza il modo di
      // ricominciare è un vicolo cieco.
      return { ...p, items: next.length ? next : [newItem()] };
    });
  }

  const totalCents = useMemo(
    () =>
      form.items.reduce((sum, i) => {
        if (!i.description.trim() || !i.amount.trim()) return sum;
        return sum + (toCents(i.amount) ?? 0);
      }, 0),
    [form.items],
  );

  /** Quello che viaggia verso il PDF e verso la mail. */
  const payload = useCallback(
    () => ({
      quoteNumber: number,
      issueDate,
      clientName: form.clientName,
      clientEmail: form.clientEmail,
      eventType: form.eventType,
      eventDate: form.eventDate,
      venue: form.venue,
      attendees: form.attendees,
      items: form.items
        .filter((i) => i.description.trim())
        .map((i) => ({
          description: i.description.trim(),
          amountCents: i.amount.trim() ? toCents(i.amount) : null,
        })),
      paymentConditions: form.paymentConditions,
      description: form.description,
      notes: form.notes,
    }),
    [form, number, issueDate],
  );

  async function generateDescription() {
    setAiLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/generate-quote-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clientName: form.clientName,
          eventType: form.eventType,
          eventDate: form.eventDate,
          venue: form.venue,
          attendees: form.attendees,
          // L'endpoint si aspetta un elenco di servizi: sono le voci.
          services: form.items.map((i) => i.description.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.description) throw new Error(data.error || 'Errore nella generazione.');
      set('description', data.description);
    } catch (e) {
      setMessage({ tone: 'err', text: e instanceof Error ? e.message : 'Errore.' });
    } finally {
      setAiLoading(false);
    }
  }

  async function downloadPdf() {
    setPdfLoading(true);
    setMessage(null);
    try {
      const esito = await scaricaConModulo('/api/quotes/pdf', {
        token,
        payload: JSON.stringify(payload()),
      });
      if (!esito.ok) throw new Error(esito.messaggio ?? 'Non sono riuscito a generare il PDF.');
      if (esito.messaggio) setMessage({ tone: 'ok', text: esito.messaggio });
    } catch (e) {
      setMessage({ tone: 'err', text: e instanceof Error ? e.message : 'Errore.' });
    } finally {
      setPdfLoading(false);
    }
  }

  async function send(to: string, subject: string) {
    setSending(true);
    try {
      const res = await fetch('/api/quotes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to, subject, quoteData: payload() }),
      });
      setMessage(
        res.ok
          ? { tone: 'ok', text: `Preventivo inviato a ${to}.` }
          : { tone: 'err', text: 'Invio non riuscito.' },
      );
    } catch {
      setMessage({ tone: 'err', text: 'Invio non riuscito.' });
    } finally {
      setSending(false);
      setSendOpen(false);
    }
  }

  const ready = form.clientName.trim().length > 0;

  return (
    <div>
      <PageHead
        title="Preventivi"
        subtitle={`N° ${number} · ${issueDate}`}
        action={
          <div className="flex flex-wrap gap-2.5">
            <ActionButton variant="quiet" onClick={downloadPdf} disabled={pdfLoading || !ready}>
              <Download size={17} strokeWidth={1.9} />
              {pdfLoading ? 'Preparo…' : 'PDF'}
            </ActionButton>
            <ActionButton onClick={() => setSendOpen(true)} disabled={!ready}>
              <Mail size={17} strokeWidth={1.9} />
              Invia
            </ActionButton>
          </div>
        }
      />

      {message && (
        <p
          className={`mb-5 rounded-2xl border px-4 py-3 text-fine font-medium ${
            message.tone === 'ok'
              ? 'border-rule-paper text-on-paper'
              : 'border-accent/40 bg-accent/5 text-accent'
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="mb-6 flex rounded-full border border-rule-paper p-1 lg:w-fit">
        {(
          [
            { id: 'form', label: 'Compila' },
            { id: 'preview', label: 'Anteprima' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`min-h-[46px] flex-1 rounded-full px-4 text-fine font-medium transition-colors lg:flex-none lg:px-8 ${
              tab === t.id ? 'bg-accent text-paper' : 'text-on-paper-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'preview' ? (
        <Preview form={form} number={number} issueDate={issueDate} totalCents={totalCents} />
      ) : (
        <div className="flex flex-col gap-9">
          {/* ── Cliente ── */}
          <section>
            <h3 className="mb-3 text-subtitle font-medium">Cliente</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nome o azienda">
                <TextInput
                  value={form.clientName}
                  onChange={(e) => set('clientName', e.target.value)}
                  placeholder="Nome del cliente"
                />
              </Field>
              <Field label="Email" hint="— per l'invio">
                <TextInput
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => set('clientEmail', e.target.value)}
                  placeholder="cliente@esempio.it"
                />
              </Field>
            </div>
          </section>

          {/* ── Evento ── */}
          <section>
            <h3 className="mb-3 text-subtitle font-medium">Evento</h3>
            <div className="flex flex-col gap-5">
              <Field label="Che evento è">
                <TextInput
                  value={form.eventType}
                  onChange={(e) => set('eventType', e.target.value)}
                  placeholder="Scrivilo come vuoi chiamarlo"
                />
              </Field>
              <div className="-mt-2 flex flex-wrap gap-2">
                {QUICK_EVENTS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => set('eventType', e)}
                    className="inline-flex min-h-[38px] items-center rounded-full border border-rule-paper px-3 text-fine text-on-paper-muted transition-colors hover:border-accent/40 hover:text-on-paper"
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Data">
                  <TextInput
                    type="date"
                    value={form.eventDate}
                    onChange={(e) => set('eventDate', e.target.value)}
                  />
                </Field>
                <Field label="Luogo">
                  <TextInput
                    value={form.venue}
                    onChange={(e) => set('venue', e.target.value)}
                    placeholder="Dove"
                  />
                </Field>
                <Field label="Persone">
                  <TextInput
                    inputMode="numeric"
                    value={form.attendees}
                    onChange={(e) => set('attendees', e.target.value)}
                    placeholder="Quante"
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* ── Le voci ── */}
          <section>
            <h3 className="mb-1 text-subtitle font-medium">La proposta</h3>
            <p className="mb-3 text-fine text-on-paper-muted">
              Scrivi le voci come vuoi. Lascia vuoto l&apos;importo per le cose incluse.
            </p>

            <div className="flex flex-col gap-2">
              {form.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 rounded-2xl border border-rule-paper p-2.5"
                >
                  <span
                    aria-hidden="true"
                    className="mt-3 hidden shrink-0 text-on-paper-muted/40 sm:block"
                  >
                    <GripVertical size={16} strokeWidth={1.8} />
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <TextInput
                      value={item.description}
                      onChange={(e) => patchItem(item.id, { description: e.target.value })}
                      placeholder="Cosa comprende"
                      className="!py-3"
                    />
                    <div className="flex items-center gap-2 sm:w-[150px] sm:shrink-0">
                      <span className="text-body text-on-paper-muted">€</span>
                      <TextInput
                        value={item.amount}
                        onChange={(e) => patchItem(item.id, { amount: e.target.value })}
                        inputMode="decimal"
                        placeholder="Incluso"
                        className="!py-3 text-right tabular-nums"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label="Togli questa voce"
                    className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-on-paper-muted transition-colors hover:bg-paper-soft hover:text-accent"
                  >
                    <Trash2 size={16} strokeWidth={1.8} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addItem()}
              className="mt-2.5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-rule-paper text-fine font-medium transition-colors hover:border-accent/50"
            >
              <Plus size={17} strokeWidth={2} />
              Aggiungi una voce
            </button>

            <div className="mt-4">
              <p className="mb-2 text-fine text-on-paper-muted">Scorciatoie</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_ITEMS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => addItem(q)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-rule-paper px-3 text-fine text-on-paper-muted transition-colors hover:border-accent/40 hover:text-on-paper"
                  >
                    <Plus size={13} strokeWidth={2} />
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-rule-paper pt-4">
              <span className="text-subtitle font-medium">Totale</span>
              <span className="ds-display text-[28px] leading-none tracking-[-0.02em] text-accent">
                {formatEur(totalCents)}
              </span>
            </div>
          </section>

          {/* ── Testi ── */}
          <section>
            <h3 className="mb-3 text-subtitle font-medium">Testi</h3>
            <div className="flex flex-col gap-5">
              <div>
                <Field label="Descrizione" hint="— quella che legge il cliente">
                  <TextArea
                    rows={5}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Racconta la serata…"
                  />
                </Field>
                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={aiLoading}
                  className="mt-2.5 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-rule-paper px-4 text-fine font-medium transition-colors hover:border-accent/40 disabled:opacity-50"
                >
                  <Sparkles size={15} strokeWidth={1.9} />
                  {aiLoading ? 'Scrivo…' : 'Scrivila con l’AI'}
                </button>
              </div>

              <Field label="Condizioni di pagamento" hint="— opzionale">
                <TextArea
                  rows={2}
                  value={form.paymentConditions}
                  onChange={(e) => set('paymentConditions', e.target.value)}
                  placeholder="30% alla conferma, saldo a fine evento…"
                />
              </Field>

              <Field label="Note" hint="— opzionale">
                <TextArea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Quello che serve aggiungere…"
                />
              </Field>
            </div>
          </section>
        </div>
      )}

      {sendOpen && (
        <SendSheet
          defaultEmail={form.clientEmail}
          number={number}
          sending={sending}
          onClose={() => setSendOpen(false)}
          onSend={send}
        />
      )}
    </div>
  );
}
