'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Download, Mail, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface QuoteForm {
  clientName:        string;
  clientEmail:       string;
  eventType:         string;
  eventDate:         string;
  venue:             string;
  attendees:         string;
  services:          string[];
  totalPrice:        string;
  paymentConditions: string;
  description:       string;
  notes:             string;
}

const EVENT_TYPES = [
  { value: 'Wine Party',         label: 'Wine Party'          },
  { value: 'Wine Visits',        label: 'Wine Visits'         },
  { value: 'Wine Lounge',        label: 'Wine Lounge'         },
  { value: 'Evento Personalizzato', label: 'Evento Personalizzato' },
];

const SERVICE_OPTIONS = [
  'Degustazione guidata',
  'Sommelier',
  'DJ Set',
  'Catering',
  'Trasporto',
  'Altro',
];

const FOUNDERS = ['Giacomo Gallo', 'Filippo Lombardi', 'Cristiano Michelotti', 'Riccardo Consalvo'];

/* ─── Helpers ────────────────────────────────────────────────────────── */

function generateQuoteNumber(): string {
  const now    = new Date();
  const date   = now.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `VWC-${date}-${suffix}`;
}

function todayFormatted(): string {
  return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const INITIAL: QuoteForm = {
  clientName: '', clientEmail: '', eventType: '', eventDate: '',
  venue: '', attendees: '', services: [], totalPrice: '',
  paymentConditions: '', description: '', notes: '',
};

/* ─── Shared input styles ────────────────────────────────────────────── */
const INPUT =
  'w-full bg-[#1a0505]/30 border border-[#731515]/20 rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-[#731515]/60 transition-colors duration-200';
const LABEL =
  'block text-[9.5px] tracking-[0.3em] text-[#c84040] mb-1.5 font-semibold';

/* ─── Sub-components ─────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

/* ─── PDF Preview ────────────────────────────────────────────────────── */

const DIV = <div className="h-px bg-[#d4d4d4] my-3" />;
const SEC = ({ label }: { label: string }) => (
  <div className="text-[8px] tracking-[0.3em] text-[#5b1a14] font-bold mb-2">{label}</div>
);

function QuotePreview({ form, quoteNumber, issueDate }: { form: QuoteForm; quoteNumber: string; issueDate: string }) {
  return (
    <div
      className="bg-white text-[#1a1010] rounded-xl overflow-hidden shadow-xl border border-gray-100"
      style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 11 }}
    >
      {/* ── Header ── */}
      <div className="px-8 pt-6 pb-4 flex items-start justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/main-logo.png" alt="Vivo Wine Club" className="h-8 object-contain" />
        <div className="text-right">
          <div className="text-[12px] font-bold text-[#5b1a14] tracking-wide">VIVO WINE CLUB</div>
          <div className="text-[9px] text-gray-400 mt-0.5">info@vivowineclub.com · vivowineclub.com</div>
        </div>
      </div>

      {/* Bordeaux separator */}
      <div className="mx-8 h-[1.5px] bg-[#5b1a14]" />

      {/* ── Title block ── */}
      <div className="px-8 pt-5 pb-4 text-center">
        <div className="text-[18px] font-bold text-[#5b1a14] tracking-widest">PROPOSTA EVENTO</div>
        <div className="text-[9px] text-gray-400 mt-1.5">
          N° {quoteNumber} &nbsp;·&nbsp; Emesso il {issueDate}
        </div>
      </div>

      <div className="px-8 space-y-0">
        {/* ── Client ── */}
        <div className="h-px bg-[#d4d4d4]" />
        <div className="py-3">
          <SEC label="DATI CLIENTE" />
          <div className="text-[13px] font-bold text-[#1a1010]">
            {form.clientName || <span className="font-normal italic text-gray-300">Nome cliente</span>}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {form.clientEmail || <span className="italic text-gray-300">email@cliente.com</span>}
          </div>
        </div>

        {/* ── Event details ── */}
        <div className="h-px bg-[#d4d4d4]" />
        <div className="py-3">
          <SEC label="DETTAGLI EVENTO" />
          <div className="grid grid-cols-4 gap-3">
            {[
              { l: 'TIPO EVENTO',   v: form.eventType  },
              { l: 'DATA',          v: form.eventDate  },
              { l: 'LUOGO',         v: form.venue      },
              { l: 'PARTECIPANTI',  v: form.attendees  },
            ].map(({ l, v }) => (
              <div key={l}>
                <div className="text-[7px] tracking-[0.25em] text-[#5b1a14] font-bold mb-1">{l}</div>
                <div className="text-[10px] font-medium text-[#1a1010]">
                  {v || <span className="text-gray-300 font-normal">—</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Description ── */}
        <div className="h-px bg-[#d4d4d4]" />
        <div className="py-3">
          <SEC label="DESCRIZIONE EVENTO" />
          {form.description
            ? <p className="text-[10px] text-gray-500 italic leading-relaxed whitespace-pre-wrap">{form.description}</p>
            : <p className="text-[10px] text-gray-300 italic">La descrizione apparirà qui dopo la generazione AI...</p>
          }
        </div>

        {/* ── Services ── */}
        {form.services.length > 0 && (
          <>
            <div className="h-px bg-[#d4d4d4]" />
            <div className="py-3">
              <SEC label="SERVIZI INCLUSI" />
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {form.services.map(s => (
                  <div key={s} className="text-[10px] text-[#1a1010]">•&nbsp; {s}</div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Pricing ── */}
        <div className="h-px bg-[#d4d4d4]" />
        <div className="py-3">
          <SEC label="PRICING" />
          <div className="text-[8px] text-gray-400 font-semibold">TOTALE</div>
          <div className="text-[22px] font-bold text-[#5b1a14] leading-tight mt-0.5">
            € {form.totalPrice || '—'}
          </div>
          {form.paymentConditions && (
            <div className="mt-2">
              <div className="text-[7px] tracking-[0.25em] text-[#5b1a14] font-bold mb-1">CONDIZIONI DI PAGAMENTO</div>
              <p className="text-[10px] text-gray-500 leading-relaxed">{form.paymentConditions}</p>
            </div>
          )}
        </div>

        {/* ── Notes ── */}
        {form.notes && (
          <>
            <div className="h-px bg-[#d4d4d4]" />
            <div className="py-3">
              <SEC label="NOTE" />
              <p className="text-[10px] text-gray-500 leading-relaxed whitespace-pre-wrap">{form.notes}</p>
            </div>
          </>
        )}

        {/* ── Signatures ── */}
        <div className="h-px bg-[#d4d4d4]" />
        <div className="py-3">
          <SEC label="FIRME" />
          <div className="grid grid-cols-4 gap-3 mt-4">
            {FOUNDERS.map(name => (
              <div key={name}>
                <div className="h-px bg-[#d4d4d4] mb-1.5" />
                <div className="text-[8px] text-gray-400">{name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="bg-[#5b1a14] py-2.5 text-center text-[9px] text-[#ebb5b5]">
        vivowineclub.com &nbsp;·&nbsp; info@vivowineclub.com &nbsp;·&nbsp; Vivo Wine Club
      </div>
    </div>
  );
}

/* ─── Send Modal ─────────────────────────────────────────────────────── */

function SendModal({
  defaultEmail,
  quoteNumber,
  onClose,
  onSend,
  sending,
}: {
  defaultEmail: string;
  quoteNumber: string;
  onClose: () => void;
  onSend: (to: string, subject: string) => void;
  sending: boolean;
}) {
  const [to,      setTo]      = useState(defaultEmail);
  const [subject, setSubject] = useState(`Proposta Evento — Vivo Wine Club (N° ${quoteNumber})`);

  return (
    <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1c0606] border border-[#731515]/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#c84040] mb-1">INVIO PREVENTIVO</div>
            <h3 className="text-white font-semibold text-base" style={{ fontFamily: 'var(--font-syne)' }}>
              Invia via Mail
            </h3>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className={LABEL}>DESTINATARIO</label>
            <input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              className={INPUT}
              placeholder="email@cliente.com"
            />
          </div>
          <div>
            <label className={LABEL}>OGGETTO</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-[#731515]/30 text-white/60 text-[10px] tracking-[0.3em] rounded-lg hover:border-[#731515]/60 transition-colors"
          >
            ANNULLA
          </button>
          <button
            onClick={() => onSend(to, subject)}
            disabled={sending || !to}
            className="flex-1 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
            {sending ? 'INVIO...' : 'INVIA'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */

export default function QuoteGenerator() {
  const [token, setToken] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });
  }, []);

  const [form,        setForm]        = useState<QuoteForm>(INITIAL);
  const [quoteNumber] = useState(() => generateQuoteNumber());
  const issueDate = todayFormatted();

  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiError,      setAiError]      = useState('');
  const [pdfLoading,   setPdfLoading]   = useState(false);
  const [sendModal,    setSendModal]    = useState(false);
  const [sending,      setSending]      = useState(false);
  const [sendResult,   setSendResult]   = useState<'ok' | 'err' | null>(null);
  const [activeTab,    setActiveTab]    = useState<'form' | 'preview'>('form');

  function set<K extends keyof QuoteForm>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  function toggleService(svc: string) {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(svc)
        ? prev.services.filter(s => s !== svc)
        : [...prev.services, svc],
    }));
  }

  async function generateDescription() {
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/generate-quote-description', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          clientName: form.clientName,
          eventType:  form.eventType,
          eventDate:  form.eventDate,
          venue:      form.venue,
          attendees:  form.attendees,
          services:   form.services,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.description) throw new Error(data.error || 'Errore generazione');
      setForm(prev => ({ ...prev, description: data.description }));
    } catch (err) {
      setAiError((err as Error).message || 'Errore generazione AI');
    } finally {
      setAiLoading(false);
    }
  }

  async function downloadPdf() {
    setPdfLoading(true);
    try {
      const res = await fetch('/api/quotes/pdf', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ ...form, quoteNumber, issueDate }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `preventivo-${quoteNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[QuoteGenerator] pdf error:', err);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleSend(to: string, subject: string) {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/quotes/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ to, subject, quoteData: { ...form, quoteNumber, issueDate } }),
      });
      setSendResult(res.ok ? 'ok' : 'err');
    } catch {
      setSendResult('err');
    } finally {
      setSending(false);
      if (!sending) setSendModal(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[9px] tracking-[0.4em] text-[#c84040] mb-1">PREVENTIVI</div>
          <h2 className="text-xl text-white font-light" style={{ fontFamily: 'var(--font-syne)' }}>
            Genera Preventivo
          </h2>
          <p className="text-white/40 text-[12px] mt-0.5">N° {quoteNumber} · {issueDate}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadPdf}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#731515] text-white text-[10px] tracking-[0.25em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors"
          >
            {pdfLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            SCARICA PDF
          </button>
          <button
            onClick={() => { setSendResult(null); setSendModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 border border-[#731515]/40 text-white/70 text-[10px] tracking-[0.25em] rounded-lg hover:bg-[#731515]/20 hover:text-white transition-colors"
          >
            <Mail size={12} />
            INVIA VIA MAIL
          </button>
        </div>
      </div>

      {/* Send result toast */}
      {sendResult === 'ok' && (
        <div className="flex items-center gap-2 text-[12px] text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-2.5">
          <CheckCircle2 size={14} /> Email inviata con successo.
        </div>
      )}
      {sendResult === 'err' && (
        <div className="flex items-center gap-2 text-[12px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
          <AlertCircle size={14} /> Errore nell'invio. Controlla la connessione e riprova.
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#1a0505]/40 p-1 rounded-lg w-fit">
        {(['form', 'preview'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-[10px] tracking-[0.3em] transition-colors duration-150 ${
              activeTab === tab
                ? 'bg-[#731515] text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {tab === 'form' ? 'FORM' : 'ANTEPRIMA PDF'}
          </button>
        ))}
      </div>

      {/* ── FORM TAB ── */}
      {activeTab === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left column */}
          <div className="space-y-4">
            <div className="bg-[#1a0505]/30 rounded-xl p-5 border border-[#731515]/15 space-y-4">
              <div className="text-[9px] tracking-[0.4em] text-[#c84040]">DATI CLIENTE</div>
              <Field label="NOME CLIENTE / AZIENDA">
                <input type="text" value={form.clientName} onChange={set('clientName')} className={INPUT} placeholder="Es. Mario Rossi / Azienda SRL" />
              </Field>
              <Field label="EMAIL CLIENTE">
                <input type="email" value={form.clientEmail} onChange={set('clientEmail')} className={INPUT} placeholder="cliente@email.com" />
              </Field>
            </div>

            <div className="bg-[#1a0505]/30 rounded-xl p-5 border border-[#731515]/15 space-y-4">
              <div className="text-[9px] tracking-[0.4em] text-[#c84040]">DETTAGLI EVENTO</div>
              <Field label="TIPO EVENTO">
                <select value={form.eventType} onChange={set('eventType')} className={INPUT}>
                  <option value="">Seleziona tipo...</option>
                  {EVENT_TYPES.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="DATA EVENTO">
                  <input type="date" value={form.eventDate} onChange={set('eventDate')} className={`${INPUT} [color-scheme:dark]`} />
                </Field>
                <Field label="N° PARTECIPANTI">
                  <input type="number" min="1" value={form.attendees} onChange={set('attendees')} className={INPUT} placeholder="50" />
                </Field>
              </div>
              <Field label="LUOGO">
                <input type="text" value={form.venue} onChange={set('venue')} className={INPUT} placeholder="Es. Milano, Palazzo Reale" />
              </Field>
            </div>

            <div className="bg-[#1a0505]/30 rounded-xl p-5 border border-[#731515]/15">
              <div className="text-[9px] tracking-[0.4em] text-[#c84040] mb-3">SERVIZI INCLUSI</div>
              <div className="grid grid-cols-2 gap-2">
                {SERVICE_OPTIONS.map(svc => (
                  <label key={svc} className="flex items-center gap-2 cursor-pointer group">
                    <div
                      onClick={() => toggleService(svc)}
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                        form.services.includes(svc)
                          ? 'bg-[#731515] border-[#731515]'
                          : 'border-[#731515]/30 group-hover:border-[#731515]/60'
                      }`}
                    >
                      {form.services.includes(svc) && (
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span
                      onClick={() => toggleService(svc)}
                      className={`text-[12px] transition-colors cursor-pointer ${form.services.includes(svc) ? 'text-white' : 'text-white/50 group-hover:text-white/70'}`}
                    >
                      {svc}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* AI Description */}
            <div className="bg-[#1a0505]/30 rounded-xl p-5 border border-[#731515]/15 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[9px] tracking-[0.4em] text-[#c84040]">DESCRIZIONE EVENTO</div>
                <button
                  onClick={generateDescription}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#731515]/80 hover:bg-[#731515] text-white text-[9px] tracking-[0.25em] rounded-md transition-colors disabled:opacity-50"
                >
                  {aiLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  {aiLoading ? 'GENERAZIONE...' : 'GENERA CON AI'}
                </button>
              </div>
              {aiError && (
                <div className="text-[10px] text-red-400 bg-red-400/10 rounded px-2 py-1">{aiError}</div>
              )}
              <textarea
                rows={10}
                value={form.description}
                onChange={set('description')}
                placeholder="Clicca 'Genera con AI' per creare automaticamente una descrizione professionale, oppure scrivi qui la tua..."
                className={`${INPUT} resize-none`}
              />
            </div>

            {/* Pricing */}
            <div className="bg-[#1a0505]/30 rounded-xl p-5 border border-[#731515]/15 space-y-4">
              <div className="text-[9px] tracking-[0.4em] text-[#c84040]">PRICING</div>
              <Field label="PREZZO TOTALE (€)">
                <input type="text" value={form.totalPrice} onChange={set('totalPrice')} className={INPUT} placeholder="Es. 2.500,00" />
              </Field>
              <Field label="CONDIZIONI DI PAGAMENTO">
                <textarea rows={3} value={form.paymentConditions} onChange={set('paymentConditions')} className={`${INPUT} resize-none`}
                  placeholder="Es. 50% all'accettazione, 50% il giorno dell'evento." />
              </Field>
            </div>

            {/* Notes */}
            <div className="bg-[#1a0505]/30 rounded-xl p-5 border border-[#731515]/15">
              <Field label="NOTE AGGIUNTIVE">
                <textarea rows={4} value={form.notes} onChange={set('notes')} className={`${INPUT} resize-none`}
                  placeholder="Informazioni aggiuntive, clausole speciali, note per il cliente..." />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW TAB ── */}
      {activeTab === 'preview' && (
        <div className="max-w-2xl">
          <QuotePreview form={form} quoteNumber={quoteNumber} issueDate={issueDate} />
        </div>
      )}

      {/* Send modal */}
      {sendModal && (
        <SendModal
          defaultEmail={form.clientEmail}
          quoteNumber={quoteNumber}
          onClose={() => setSendModal(false)}
          onSend={handleSend}
          sending={sending}
        />
      )}
    </div>
  );
}
