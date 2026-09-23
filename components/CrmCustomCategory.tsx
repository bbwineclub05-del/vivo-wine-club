'use client';

import { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Trash2, Edit2, Check, X, Mail, AlertTriangle } from 'lucide-react';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
  created_at: string;
  last_reminder_sent_at: string | null;
}

const EMPTY: Omit<Contact, 'id' | 'created_at' | 'last_reminder_sent_at'> = {
  first_name: '', last_name: '', email: '', phone: '', notes: '',
};

const inputCls = 'w-full border border-[#e8d5d5] bg-white px-2 py-1 text-xs text-[#1a0505] focus:outline-none focus:border-[#731515] transition-colors';

function fmtShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function contactName(c: Pick<Contact, 'first_name' | 'last_name' | 'email'>) {
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email;
}

function EditRow({
  contact, onSave, onCancel,
}: {
  contact: Partial<Contact>;
  onSave: (c: Partial<Contact>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...contact });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setErr(null);
    setSaving(true);
    try { await onSave(form); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Errore'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <tr className="bg-[#fff8f8]">
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <input value={form.first_name ?? ''} onChange={e => set('first_name', e.target.value)} placeholder="Nome" className={inputCls} />
            <input value={form.last_name ?? ''} onChange={e => set('last_name', e.target.value)} placeholder="Cognome" className={inputCls} />
          </div>
        </td>
        <td className="px-3 py-2"><input value={form.email ?? ''} onChange={e => set('email', e.target.value)} type="email" placeholder="Email" className={inputCls} /></td>
        <td className="px-3 py-2"><input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="Telefono" className={inputCls} /></td>
        <td className="px-3 py-2"><input value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Note…" className={inputCls} /></td>
        <td className="px-3 py-2">
          <div className="flex gap-1.5">
            <button onClick={handleSave} disabled={saving} className="text-green-700 hover:text-green-900 disabled:opacity-40 transition-colors">
              {saving ? <span className="text-[10px]">…</span> : <Check size={14} />}
            </button>
            <button onClick={onCancel} disabled={saving} className="text-[#7a4a4a]/50 hover:text-[#731515] disabled:opacity-40 transition-colors">
              <X size={14} />
            </button>
          </div>
        </td>
      </tr>
      {err && (
        <tr className="bg-red-50">
          <td colSpan={5} className="px-3 py-1.5 text-[11px] text-red-600">{err}</td>
        </tr>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   Reminder compose modal — free-text subject/body,
   works for a single recipient or a deduplicated list.
───────────────────────────────────────────── */
function ComposeModal({
  recipients,
  onClose,
  accessToken,
  onSent,
}: {
  recipients: Contact[];
  onClose: () => void;
  accessToken: string;
  onSent: (successfulEmails: string[]) => void;
}) {
  const [subject, setSubject]     = useState('');
  const [body, setBody]           = useState('');
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus]       = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errMsg, setErrMsg]       = useState('');
  const [result, setResult]       = useState<{ sent: number; failed: number; failedEmails?: { email: string; error: string }[] } | null>(null);

  const isBulk = recipients.length > 1;
  const previewNames = recipients.slice(0, 3).map(r => contactName(r).split(' ')[0]).join(', ');
  const extra = recipients.length > 3 ? ` e altri ${recipients.length - 3}` : '';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/crm/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          type:       'custom',
          recipients: recipients.map(r => ({ email: r.email, name: contactName(r) })),
          subject:    subject.trim(),
          text:       body.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Errore invio');

      setResult({ sent: json.sent, failed: json.failed, failedEmails: json.failedEmails });
      setStatus('done');

      const failedSet = new Set(((json.failedEmails ?? []) as { email: string }[]).map(f => f.email.toLowerCase()));
      const successfulEmails = recipients
        .map(r => r.email)
        .filter(email => !failedSet.has(email.toLowerCase()));
      if (successfulEmails.length > 0) onSent(successfulEmails);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Errore invio');
      setStatus('error');
    }
  }

  function handlePrimaryClick() {
    if (isBulk && !confirming) { setConfirming(true); return; }
    handleSend();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8d5d5]">
          <div>
            <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-0.5">INVIA REMINDER</div>
            <div className="text-sm font-medium text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
              {recipients.length === 1 ? contactName(recipients[0]) : `${recipients.length} destinatari`}
            </div>
          </div>
          <button onClick={onClose} aria-label="Chiudi" className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#7a4a4a]/50 hover:text-[#731515] transition-colors rounded-lg">
            <X size={18} />
          </button>
        </div>

        {status === 'done' ? (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Check size={22} className="text-emerald-600" />
            </div>
            <p className="text-sm text-[#1a0505] font-medium" style={{ fontFamily: 'var(--font-nunito)' }}>
              {result?.sent} email inviate con successo
            </p>
            {(result?.failed ?? 0) > 0 && (
              <p className="text-xs text-[#731515] mt-1">{result?.failed} fallite</p>
            )}
            {result?.failedEmails && result.failedEmails.length > 0 && (
              <div className="mt-3 text-left bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-h-28 overflow-y-auto">
                {result.failedEmails.map(f => (
                  <div key={f.email} className="text-[10px] text-red-600 truncate">{f.email}</div>
                ))}
              </div>
            )}
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#9b2323] transition-colors"
            >
              CHIUDI
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            {/* To */}
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">A</div>
              <div className="text-sm text-[#1a0505] bg-[#fdf6f6] border border-[#eddada] rounded-lg px-3 py-2" style={{ fontFamily: 'var(--font-nunito)' }}>
                {previewNames}{extra}
              </div>
            </div>

            {/* Subject */}
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">OGGETTO</div>
              <input
                className={`${inputCls} py-2`}
                placeholder="Oggetto email..."
                value={subject}
                onChange={e => setSubject(e.target.value)}
                style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
              />
            </div>

            {/* Body */}
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">MESSAGGIO</div>
              <textarea
                className={`${inputCls} py-2 resize-none`}
                rows={8}
                placeholder="Scrivi il messaggio..."
                value={body}
                onChange={e => setBody(e.target.value)}
                style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
              />
            </div>

            {status === 'error' && (
              <p className="text-xs text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{errMsg}</p>
            )}

            {/* Bulk confirmation warning */}
            {confirming && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800" style={{ fontFamily: 'var(--font-nunito)' }}>
                  Stai per inviare questa email a <strong>{recipients.length} destinatari</strong>. Confermi l&apos;invio?
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handlePrimaryClick}
                disabled={status === 'sending' || !subject.trim() || !body.trim()}
                className={`flex-1 py-2.5 text-white text-[10px] tracking-[0.3em] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  confirming ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#731515] hover:bg-[#9b2323]'
                }`}
              >
                {status === 'sending'
                  ? 'INVIO IN CORSO…'
                  : confirming
                    ? 'CONFERMA E INVIA'
                    : isBulk
                      ? `INVIA A ${recipients.length} DESTINATARI`
                      : 'INVIA'}
              </button>
              <button
                onClick={() => (confirming ? setConfirming(false) : onClose())}
                className="px-5 py-2.5 border border-[#e8d5d5] text-[#7a4a4a] text-[10px] tracking-[0.2em] rounded-lg hover:border-[#731515]/40 transition-colors"
              >
                ANNULLA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CrmCustomCategory({
  categoryId,
  accessToken,
}: {
  categoryId: string;
  accessToken: string | null;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [composeFor, setComposeFor] = useState<Contact[] | null>(null);

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });
  const base = `/api/crm/categories/${categoryId}/contacts`;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(base, { headers: auth() });
      const j = await res.json();
      setContacts(j.contacts ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (accessToken) load(); }, [accessToken, categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c =>
      [c.first_name, c.last_name, c.email, c.phone, c.notes]
        .some(v => v?.toLowerCase().includes(q)),
    );
  }, [contacts, query]);

  // Same person can have several rows (e.g. one per event ticket bought) —
  // a mass reminder must reach each unique email only once.
  const bulkRecipients = useMemo(() => {
    const seen = new Set<string>();
    const out: Contact[] = [];
    for (const c of filtered) {
      if (!c.email) continue;
      const key = c.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  }, [filtered]);

  const handleSave = async (form: Partial<Contact>) => {
    if (editingId === 'new') {
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `Errore ${res.status}`);
    } else if (editingId) {
      const res = await fetch(`${base}/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `Errore ${res.status}`);
    }
    await load();
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo contatto?')) return;
    setDeleting(id);
    await fetch(`${base}/${id}`, { method: 'DELETE', headers: auth() });
    setDeleting(null);
    await load();
  };

  /** After a successful send, stamp last_reminder_sent_at on every row sharing
      one of the successful emails — a person with several ticket rows must
      show the same "last reminded" date on all of them. */
  const handleSent = async (successfulEmails: string[]) => {
    const now = new Date().toISOString();
    try {
      const res = await fetch(`${base}/mark-reminded`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...auth() },
        body:    JSON.stringify({ emails: successfulEmails }),
      });
      const json = await res.json().catch(() => ({}));
      const stamped = json.last_reminder_sent_at ?? now;
      const successSet = new Set(successfulEmails.map(e => e.toLowerCase()));
      setContacts(prev => prev.map(c =>
        c.email && successSet.has(c.email.toLowerCase())
          ? { ...c, last_reminder_sent_at: stamped }
          : c,
      ));
    } catch (err) {
      console.error('[CrmCustomCategory] mark-reminded error:', err);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a4a4a]/50" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cerca nome, email, telefono…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#e8d5d5] bg-white text-[#1a0505] placeholder-[#c0a0a0] focus:outline-none focus:border-[#731515] transition-colors"
            style={{ fontFamily: 'var(--font-nunito)' }}
          />
        </div>
        <button
          onClick={() => setComposeFor(bulkRecipients)}
          disabled={bulkRecipients.length === 0}
          title={query ? 'Invia ai contatti attualmente filtrati' : 'Invia a tutti i contatti'}
          className="flex items-center gap-1.5 px-4 py-2 border border-[#731515]/30 text-[#731515] text-[11px] tracking-[0.2em] hover:bg-[#fdf6f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg"
        >
          <Mail size={13} /> INVIA A TUTTI ({bulkRecipients.length})
        </button>
        <button
          onClick={() => setEditingId('new')}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#731515] text-white text-[11px] tracking-[0.2em] hover:bg-[#aa4848] transition-colors"
        >
          <Plus size={13} /> AGGIUNGI
        </button>
      </div>

      <div className="text-[10px] tracking-[0.3em] text-[#7a4a4a]/60">
        {filtered.length} CONTATT{filtered.length === 1 ? 'O' : 'I'}{query ? ' (FILTRATI)' : ''}
      </div>

      <div className="overflow-x-auto bg-white border border-[#e8d5d5] rounded-lg">
        <table className="w-full min-w-[760px] text-sm border-collapse">
          <thead className="bg-[#fdf6f6] border-b border-[#e8d5d5]">
            <tr>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">NOME</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">EMAIL</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">TELEFONO</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">NOTE</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">REMINDER</th>
              <th className="px-3 py-2.5 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0e4e4]">
            {editingId === 'new' && (
              <EditRow contact={EMPTY} onSave={handleSave} onCancel={() => setEditingId(null)} />
            )}
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-[#7a4a4a]/50">Caricamento…</td></tr>
            ) : filtered.length === 0 && editingId !== 'new' ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-[#7a4a4a]/50">
                {query ? 'Nessun contatto trovato' : 'Nessun contatto — clicca AGGIUNGI per iniziare'}
              </td></tr>
            ) : filtered.map(c => {
              if (editingId === c.id) {
                return <EditRow key={c.id} contact={c} onSave={handleSave} onCancel={() => setEditingId(null)} />;
              }
              const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ');
              return (
                <tr key={c.id} className="bg-white hover:bg-[#fdf6f6] transition-colors group">
                  <td className="px-3 py-3 text-[13px] font-medium text-[#1a0505] whitespace-nowrap">
                    {fullName || '—'}
                  </td>
                  <td className="px-3 py-3">
                    {c.email
                      ? <a href={`mailto:${c.email}`} className="text-[12px] text-[#731515] hover:underline">{c.email}</a>
                      : <span className="text-[#7a4a4a]/40 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3 text-[11px] text-[#7a4a4a] whitespace-nowrap">{c.phone || '—'}</td>
                  <td className="px-3 py-3 text-[11px] text-[#7a4a4a] max-w-[240px]">
                    <span className="line-clamp-2">{c.notes || '—'}</span>
                  </td>
                  <td className="px-3 py-3 text-[10px] text-[#7a4a4a]/60 whitespace-nowrap">
                    {c.last_reminder_sent_at ? `Inviato ${fmtShortDate(c.last_reminder_sent_at)}` : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setComposeFor([c])}
                        disabled={!c.email}
                        title={c.email ? 'Invia reminder' : 'Nessuna email'}
                        className="text-[#7a4a4a]/60 hover:text-[#731515] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Mail size={13} />
                      </button>
                      <button onClick={() => setEditingId(c.id)} title="Modifica" className="text-[#7a4a4a]/60 hover:text-[#731515] transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleting === c.id}
                        title="Elimina"
                        className="text-[#7a4a4a]/60 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {composeFor && accessToken && (
        <ComposeModal
          recipients={composeFor}
          accessToken={accessToken}
          onClose={() => setComposeFor(null)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}
