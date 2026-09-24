'use client';

import { useEffect, useState, useMemo } from 'react';
import { Search, Mail, Plus, Trash2, Edit2, Check, X, Paperclip, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOverlayBackClose } from '@/lib/useMobileOverlay';

/* ── Types ── */
interface BordeauxContact {
  id: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  last_follow_up: string | null;
  note: string;
}

type EmailMode = 'custom' | 'visit';
type Lang = 'IT' | 'EN' | 'FR';
type SortKey = 'company' | 'name' | 'last_follow_up';

const EMPTY: Omit<BordeauxContact, 'id'> = { company: '', name: '', email: '', phone: '', last_follow_up: null, note: '' };

/* ── Email templates by language ── */
function customTemplate(lang: Lang, name: string, company: string) {
  const n = name || company;
  if (lang === 'EN') return {
    subject: `Vivo Wine Club — ${company}`,
    body: `Dear ${n},\n\nMy name is Giacomo, and I am the co-founder of Vivo Wine Club, a university wine club based in Milan dedicated to wine culture.\n\n[personalized message]\n\nPlease do not hesitate to reach out with any questions.\nKind regards,\n\nGiacomo\nVivo Wine Club\ninfo@vivowineclub.com`,
  };
  if (lang === 'FR') return {
    subject: `Vivo Wine Club — ${company}`,
    body: `Cher/Chère ${n},\n\nJe m'appelle Giacomo, co-fondateur de Vivo Wine Club, un club universitaire dédié à la culture du vin, basé à Milan.\n\n[message personnalisé]\n\nN'hésitez pas à me contacter pour toute question.\nCordialement,\n\nGiacomo\nVivo Wine Club\ninfo@vivowineclub.com`,
  };
  return {
    subject: `Vivo Wine Club — ${company}`,
    body: `Gentile ${n},\n\nmi chiamo Giacomo, sono il co-fondatore di Vivo Wine Club, un club universitario dedicato alla cultura del vino fondato a Milano.\n\n[messaggio personalizzato]\n\nRimanendo a disposizione per qualsiasi domanda,\nCordiali saluti,\n\nGiacomo\nVivo Wine Club\ninfo@vivowineclub.com`,
  };
}

function visitTemplate(lang: Lang, name: string, company: string) {
  const n = name || company;
  if (lang === 'EN') return {
    subject: `Visit Request — Vivo Wine Club / ${company}`,
    body: `Dear ${n},\n\nMy name is Giacomo, and I am the co-founder of Vivo Wine Club, a university wine club based in Milan that organises high-level winery visits for its members.\n\nWe would be very interested in visiting ${company} over the coming months, and we would like to explore the possibility of arranging a guided tour for a group of approximately 15 to 20 people.\n\nPlease find attached our presentation with full details about the club and the types of visits we organise.\n\nPlease do not hesitate to reach out with any questions.\nKind regards,\n\nGiacomo\nVivo Wine Club\ninfo@vivowineclub.com`,
  };
  if (lang === 'FR') return {
    subject: `Demande de visite — Vivo Wine Club / ${company}`,
    body: `Cher/Chère ${n},\n\nJe m'appelle Giacomo, co-fondateur de Vivo Wine Club, un club universitaire basé à Milan dédié à la culture du vin, qui organise des visites de domaines viticoles de haut niveau pour ses membres.\n\nNous serions très intéressés par la visite de ${company} au cours des prochains mois, et nous souhaitons explorer la possibilité d'organiser une visite guidée pour un groupe d'environ 15 à 20 personnes.\n\nVous trouverez en pièce jointe notre présentation avec tous les détails sur le club et les types de visites que nous organisons.\n\nN'hésitez pas à me contacter pour toute question.\nCordialement,\n\nGiacomo\nVivo Wine Club\ninfo@vivowineclub.com`,
  };
  return {
    subject: `Richiesta visita — Vivo Wine Club / ${company}`,
    body: `Gentile ${n},\n\nmi chiamo Giacomo, sono il co-fondatore di Vivo Wine Club, un club universitario dedicato alla cultura del vino fondato a Milano che organizza visite in cantina di alto livello per i propri membri.\n\nSaremmo molto interessati a visitare ${company} nel corso dei prossimi mesi, e vorremmo capire se esiste la possibilità di organizzare una visita guidata per un gruppo di circa 15-20 persone.\n\nIn allegato trovate la nostra presentazione con tutti i dettagli sul club e sulle tipologie di visita che organizziamo.\n\nRimanendo a disposizione per qualsiasi domanda,\nCordiali saluti,\n\nGiacomo\nVivo Wine Club\ninfo@vivowineclub.com`,
  };
}

/* ── Email modal ── */
function EmailModal({
  contact,
  initialMode,
  onClose,
}: {
  contact: BordeauxContact;
  initialMode: EmailMode;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<EmailMode>(initialMode);
  const [lang, setLang] = useState<Lang>('IT');

  const getTemplate = (m: EmailMode, l: Lang) =>
    m === 'visit' ? visitTemplate(l, contact.name, contact.company)
                  : customTemplate(l, contact.name, contact.company);

  const initTpl = getTemplate(initialMode, 'IT');
  const [subject, setSubject] = useState(initTpl.subject);
  const [body, setBody]       = useState(initTpl.body);
  const [pitch, setPitch]     = useState(initialMode === 'visit');
  const [status, setStatus]   = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [errMsg, setErrMsg]   = useState('');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const switchMode = (m: EmailMode) => {
    setMode(m);
    const t = getTemplate(m, lang);
    setSubject(t.subject);
    setBody(t.body);
    setPitch(m === 'visit');
    setStatus('idle');
  };

  const switchLang = (l: Lang) => {
    setLang(l);
    const t = getTemplate(mode, l);
    setSubject(t.subject);
    setBody(t.body);
    setStatus('idle');
  };

  const send = async () => {
    if (!contact.email) { setErrMsg('Nessun indirizzo email per questo contatto'); setStatus('err'); return; }
    setStatus('sending');
    try {
      const res = await fetch('/api/crm/contact-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: contact.email, toName: contact.name || contact.company, subject, text: body, attachPitch: pitch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore invio');
      setStatus('ok');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Errore');
      setStatus('err');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8d5d5]">
          <div>
            <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-0.5">INVIA EMAIL</div>
            <div className="text-sm font-medium text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
              {contact.name || contact.company}
              {contact.name && <span className="text-[#7a4a4a]/60 font-normal ml-2 text-xs">· {contact.company}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Language selector */}
            <div className="flex items-center gap-1 border border-[#e8d5d5] p-0.5">
              {(['IT', 'EN', 'FR'] as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => switchLang(l)}
                  className={`px-2.5 py-1 text-[9px] tracking-[0.2em] font-medium transition-colors ${
                    lang === l
                      ? 'bg-[#731515] text-white'
                      : 'text-[#7a4a4a] hover:text-[#731515]'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <button onClick={onClose} aria-label="Chiudi" className="min-w-[48px] min-h-[48px] flex items-center justify-center text-[#7a4a4a]/50 hover:text-[#731515] transition-colors rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-[#e8d5d5]">
          {(['custom', 'visit'] as EmailMode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2.5 text-[10px] tracking-[0.25em] transition-colors ${
                mode === m
                  ? 'text-[#731515] border-b-2 border-[#731515] -mb-px'
                  : 'text-[#7a4a4a]/60 hover:text-[#731515]'
              }`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {m === 'custom' ? 'MESSAGGIO PERSONALIZZATO' : 'RICHIESTA VISITA'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {/* To */}
          <div>
            <label className="text-[9px] tracking-[0.35em] text-[#7a4a4a] block mb-1">A</label>
            <div className="border border-[#e8d5d5] px-3 py-2 text-sm text-[#1a0505] bg-[#fdf6f6]" style={{ fontFamily: 'var(--font-nunito)' }}>
              {contact.email || <span className="text-[#c0a0a0] italic">nessuna email registrata</span>}
            </div>
          </div>
          {/* Subject */}
          <div>
            <label className="text-[9px] tracking-[0.35em] text-[#7a4a4a] block mb-1">OGGETTO</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-[#e8d5d5] px-3 py-2 text-sm text-[#1a0505] focus:outline-none focus:border-[#731515] transition-colors"
              style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
            />
          </div>
          {/* Body */}
          <div>
            <label className="text-[9px] tracking-[0.35em] text-[#7a4a4a] block mb-1">MESSAGGIO</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={12}
              className="w-full border border-[#e8d5d5] px-3 py-2 text-sm text-[#1a0505] focus:outline-none focus:border-[#731515] transition-colors resize-none"
              style={{ fontFamily: 'var(--font-nunito)' }}
            />
          </div>
          {/* Pitch toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={pitch} onChange={e => setPitch(e.target.checked)} className="accent-[#731515]" />
            <Paperclip size={13} className="text-[#7a4a4a]" />
            <span className="text-xs text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
              Allega pitch PDF Vivo Wine Club
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e8d5d5] flex items-center justify-between gap-3">
          {status === 'ok' ? (
            <span className="flex items-center gap-1.5 text-xs text-green-700">
              <Check size={14} /> Email inviata con successo
            </span>
          ) : status === 'err' ? (
            <span className="text-xs text-[#731515]">{errMsg}</span>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[11px] tracking-[0.2em] text-[#7a4a4a] border border-[#e8d5d5] bg-white hover:border-[#731515] transition-colors">
              ANNULLA
            </button>
            <button
              onClick={status === 'ok' ? onClose : send}
              disabled={status === 'sending' || !contact.email}
              className="px-5 py-2 bg-[#731515] text-white text-[11px] tracking-[0.2em] hover:bg-[#aa4848] disabled:opacity-50 transition-colors"
            >
              {status === 'sending' ? 'INVIO…' : status === 'ok' ? 'CHIUDI' : 'INVIA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Inline edit row ── */
function EditRow({
  contact,
  onSave,
  onCancel,
}: {
  contact: Partial<BordeauxContact>;
  onSave: (c: Partial<BordeauxContact>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...contact });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = "w-full border border-[#e8d5d5] bg-white px-2 py-1 text-xs text-[#1a0505] focus:outline-none focus:border-[#731515] transition-colors";

  return (
    <tr className="bg-[#fff8f8]">
      <td className="px-3 py-2"><input value={form.company ?? ''} onChange={e => set('company', e.target.value)} placeholder="Château…" className={inputCls} /></td>
      <td className="px-3 py-2"><input value={form.name ?? ''} onChange={e => set('name', e.target.value)} className={inputCls} /></td>
      <td className="px-3 py-2"><input value={form.email ?? ''} onChange={e => set('email', e.target.value)} type="email" className={inputCls} /></td>
      <td className="px-3 py-2"><input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} className={inputCls} /></td>
      <td className="px-3 py-2"><input value={form.last_follow_up ?? ''} onChange={e => set('last_follow_up', e.target.value)} placeholder="DD/MM/YYYY" className={inputCls} /></td>
      <td className="px-3 py-2"><input value={form.note ?? ''} onChange={e => set('note', e.target.value)} className={inputCls} /></td>
      <td className="px-3 py-2">
        <div className="flex gap-1.5">
          <button onClick={() => onSave(form)} className="text-green-700 hover:text-green-900 transition-colors"><Check size={14} /></button>
          <button onClick={onCancel} className="text-[#7a4a4a]/50 hover:text-[#731515] transition-colors"><X size={14} /></button>
        </div>
      </td>
    </tr>
  );
}

/* ── Main component ── */
export default function CrmBordeaux() {
  const [contacts, setContacts]   = useState<BordeauxContact[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [sortKey, setSortKey]     = useState<SortKey>('company');
  const [sortAsc, setSortAsc]     = useState(true);
  const [emailTarget, setEmailTarget] = useState<{ contact: BordeauxContact; mode: EmailMode } | null>(null);
  // EmailModal locks scroll on its own — only add back-close here.
  useOverlayBackClose(!!emailTarget, () => setEmailTarget(null));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });
  }, []);

  const authHeader = () => ({ Authorization: `Bearer ${accessToken}` });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/bordeaux', { headers: authHeader() });
      const data = await res.json();
      setContacts(data.contacts ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return contacts
      .filter(c =>
        !q || [c.company, c.name, c.email, c.phone, c.note].some(v => v.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        const av = (a[sortKey] ?? '') as string;
        const bv = (b[sortKey] ?? '') as string;
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [contacts, query, sortKey, sortAsc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(v => !v);
    else { setSortKey(k); setSortAsc(true); }
  };

  const handleSave = async (form: Partial<BordeauxContact>) => {
    if (editingId === 'new') {
      const res = await fetch('/api/crm/bordeaux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(form),
      });
      if (res.ok) { await load(); setEditingId(null); }
    } else if (editingId) {
      const res = await fetch(`/api/crm/bordeaux/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(form),
      });
      if (res.ok) { await load(); setEditingId(null); }
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch(`/api/crm/bordeaux/${id}`, { method: 'DELETE', headers: authHeader() });
    setDeleting(null);
    await load();
  };

  const thCls = (k: SortKey) =>
    `px-3 py-2.5 text-left text-[9px] tracking-[0.35em] cursor-pointer select-none whitespace-nowrap transition-colors ${sortKey === k ? 'text-[#731515]' : 'text-[#7a4a4a]/60 hover:text-[#731515]'}`;

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a4a4a]/50" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cerca château, contatto…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#e8d5d5] bg-white text-[#1a0505] placeholder-[#c0a0a0] focus:outline-none focus:border-[#731515] transition-colors"
            style={{ fontFamily: 'var(--font-nunito)' }}
          />
        </div>
        <button
          onClick={() => setEditingId('new')}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#731515] text-white text-[11px] tracking-[0.2em] hover:bg-[#aa4848] transition-colors"
        >
          <Plus size={13} /> AGGIUNGI
        </button>
      </div>

      {/* Count */}
      <div className="text-[10px] tracking-[0.3em] text-[#7a4a4a]/60">
        {filtered.length} PRODUTTORI{query ? ' (FILTRATI)' : ''}
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white border border-[#e8d5d5] rounded-lg">
        <table className="w-full min-w-[900px] text-sm border-collapse">
          <thead className="bg-[#fdf6f6] border-b border-[#e8d5d5]">
            <tr>
              <th className={thCls('company')} onClick={() => toggleSort('company')}>AZIENDA</th>
              <th className={thCls('name')} onClick={() => toggleSort('name')}>NOME</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">EMAIL</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">TELEFONO</th>
              <th className={thCls('last_follow_up')} onClick={() => toggleSort('last_follow_up')}>ULTIMO CONTATTO</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">NOTE</th>
              <th className="px-3 py-2.5 w-32" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0e4e4]">
            {editingId === 'new' && (
              <EditRow contact={EMPTY} onSave={handleSave} onCancel={() => setEditingId(null)} />
            )}
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-[#7a4a4a]/50">Caricamento…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-[#7a4a4a]/50">Nessun contatto trovato</td></tr>
            ) : filtered.map(c => {
              if (editingId === c.id) {
                return <EditRow key={c.id} contact={c} onSave={handleSave} onCancel={() => setEditingId(null)} />;
              }
              return (
                <tr key={c.id} className="bg-white hover:bg-[#fdf6f6] transition-colors group">
                  <td className="px-3 py-3 text-[13px] font-medium text-[#1a0505] max-w-[220px]">
                    <span className="line-clamp-2 leading-snug">{c.company}</span>
                  </td>
                  <td className="px-3 py-3 text-[13px] text-[#1a0505] whitespace-nowrap">{c.name || '—'}</td>
                  <td className="px-3 py-3">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="text-[12px] text-[#731515] hover:underline">
                        {c.email}
                      </a>
                    ) : <span className="text-[#7a4a4a]/40 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3 text-[11px] text-[#7a4a4a] whitespace-nowrap">{c.phone || '—'}</td>
                  <td className="px-3 py-3">
                    {c.last_follow_up ? (
                      <span className="text-[11px] text-[#7a4a4a]">{c.last_follow_up}</span>
                    ) : <span className="text-[#7a4a4a]/40 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3 text-[11px] text-[#7a4a4a] max-w-[180px]">
                    <span className="line-clamp-2">{c.note || '—'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEmailTarget({ contact: c, mode: 'custom' })}
                        title="Invia email"
                        className="text-[#7a4a4a]/60 hover:text-[#731515] transition-colors"
                      >
                        <Mail size={13} />
                      </button>
                      <button
                        onClick={() => setEmailTarget({ contact: c, mode: 'visit' })}
                        title="Richiesta visita"
                        className="text-[#7a4a4a]/60 hover:text-[#731515] transition-colors"
                      >
                        <Calendar size={13} />
                      </button>
                      <button
                        onClick={() => setEditingId(c.id)}
                        title="Modifica"
                        className="text-[#7a4a4a]/60 hover:text-[#731515] transition-colors"
                      >
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

      {/* Email modal */}
      {emailTarget && (
        <EmailModal
          contact={emailTarget.contact}
          initialMode={emailTarget.mode}
          onClose={() => setEmailTarget(null)}
        />
      )}
    </div>
  );
}
