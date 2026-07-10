'use client';

import { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
  created_at: string;
}

const EMPTY: Omit<Contact, 'id' | 'created_at'> = {
  first_name: '', last_name: '', email: '', phone: '', notes: '',
};

const inputCls = 'w-full border border-[#e8d5d5] bg-white px-2 py-1 text-xs text-[#1a0505] focus:outline-none focus:border-[#731515] transition-colors';

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
        <table className="w-full min-w-[700px] text-sm border-collapse">
          <thead className="bg-[#fdf6f6] border-b border-[#e8d5d5]">
            <tr>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">NOME</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">EMAIL</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">TELEFONO</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">NOTE</th>
              <th className="px-3 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0e4e4]">
            {editingId === 'new' && (
              <EditRow contact={EMPTY} onSave={handleSave} onCancel={() => setEditingId(null)} />
            )}
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-[#7a4a4a]/50">Caricamento…</td></tr>
            ) : filtered.length === 0 && editingId !== 'new' ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-[#7a4a4a]/50">
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
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </div>
  );
}
