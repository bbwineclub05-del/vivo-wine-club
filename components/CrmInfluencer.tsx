'use client';

import { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Trash2, Edit2, Check, X, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ── Types ── */
interface Influencer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  instagram: string;
  tiktok: string;
  followers: number;
  notes: string;
  status: string;
  last_contact_date: string | null;
}

type SortKey = 'last_name' | 'followers' | 'status' | 'last_contact_date';

const STATUSES = ['Contattato', 'In trattativa', 'Confermato', 'Scartato'];

const STATUS_COLORS: Record<string, string> = {
  'Contattato':    'bg-blue-50 text-blue-700 border-blue-200',
  'In trattativa': 'bg-amber-50 text-amber-700 border-amber-200',
  'Confermato':    'bg-green-50 text-green-700 border-green-200',
  'Scartato':      'bg-red-50 text-red-600 border-red-200',
};

const EMPTY: Omit<Influencer, 'id'> = {
  first_name: '', last_name: '', email: '', phone: '',
  instagram: '', tiktok: '', followers: 0,
  notes: '', status: 'Contattato', last_contact_date: null,
};

/* ── Edit row ── */
function EditRow({
  contact,
  onSave,
  onCancel,
}: {
  contact: Partial<Influencer>;
  onSave: (c: Partial<Influencer>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...contact });
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = "w-full border border-[#e8d5d5] bg-white px-2 py-1 text-xs text-[#1a0505] focus:outline-none focus:border-[#731515] transition-colors";

  return (
    <tr className="bg-[#fff8f8]">
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <input value={form.first_name ?? ''} onChange={e => set('first_name', e.target.value)} placeholder="Nome" className={inputCls} />
          <input value={form.last_name ?? ''} onChange={e => set('last_name', e.target.value)} placeholder="Cognome" className={inputCls} />
        </div>
      </td>
      <td className="px-3 py-2"><input value={form.email ?? ''} onChange={e => set('email', e.target.value)} type="email" placeholder="Email" className={inputCls} /></td>
      <td className="px-3 py-2"><input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="Telefono" className={inputCls} /></td>
      <td className="px-3 py-2"><input value={form.instagram ?? ''} onChange={e => set('instagram', e.target.value)} placeholder="@username" className={inputCls} /></td>
      <td className="px-3 py-2"><input value={form.tiktok ?? ''} onChange={e => set('tiktok', e.target.value)} placeholder="@username" className={inputCls} /></td>
      <td className="px-3 py-2">
        <input
          value={form.followers ?? 0}
          onChange={e => set('followers', parseInt(e.target.value) || 0)}
          type="number"
          min={0}
          placeholder="0"
          className={inputCls}
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={form.status ?? 'Contattato'}
          onChange={e => set('status', e.target.value)}
          className={inputCls}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          value={form.last_contact_date ?? ''}
          onChange={e => set('last_contact_date', e.target.value)}
          type="date"
          className={inputCls}
        />
      </td>
      <td className="px-3 py-2"><input value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Note…" className={inputCls} /></td>
      <td className="px-3 py-2">
        <div className="flex gap-1.5">
          <button onClick={() => onSave(form)} className="text-green-700 hover:text-green-900 transition-colors"><Check size={14} /></button>
          <button onClick={onCancel} className="text-[#7a4a4a]/50 hover:text-[#731515] transition-colors"><X size={14} /></button>
        </div>
      </td>
    </tr>
  );
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/* ── Main component ── */
export default function CrmInfluencer() {
  const [contacts, setContacts] = useState<Influencer[]>([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortKey, setSortKey]   = useState<SortKey>('last_name');
  const [sortAsc, setSortAsc]   = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
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
      const res = await fetch('/api/crm/influencers', { headers: authHeader() });
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
      .filter(c => {
        if (statusFilter && c.status !== statusFilter) return false;
        if (!q) return true;
        return [c.first_name, c.last_name, c.email, c.instagram, c.tiktok, c.notes, c.status]
          .some(v => v?.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        let av: string | number, bv: string | number;
        if (sortKey === 'followers') {
          av = a.followers ?? 0;
          bv = b.followers ?? 0;
          return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
        }
        av = (a[sortKey] ?? '') as string;
        bv = (b[sortKey] ?? '') as string;
        return sortAsc ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string);
      });
  }, [contacts, query, statusFilter, sortKey, sortAsc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(v => !v);
    else { setSortKey(k); setSortAsc(true); }
  };

  const handleSave = async (form: Partial<Influencer>) => {
    if (editingId === 'new') {
      const res = await fetch('/api/crm/influencers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(form),
      });
      if (res.ok) { await load(); setEditingId(null); }
    } else if (editingId) {
      const res = await fetch(`/api/crm/influencers/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(form),
      });
      if (res.ok) { await load(); setEditingId(null); }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo influencer?')) return;
    setDeleting(id);
    await fetch(`/api/crm/influencers/${id}`, { method: 'DELETE', headers: authHeader() });
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
            placeholder="Cerca nome, Instagram, TikTok…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#e8d5d5] bg-white text-[#1a0505] placeholder-[#c0a0a0] focus:outline-none focus:border-[#731515] transition-colors"
            style={{ fontFamily: 'var(--font-nunito)' }}
          />
        </div>
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="py-2 px-3 text-xs border border-[#e8d5d5] bg-white text-[#1a0505] focus:outline-none focus:border-[#731515] transition-colors"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          <option value="">Tutti gli stati</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => setEditingId('new')}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#731515] text-white text-[11px] tracking-[0.2em] hover:bg-[#aa4848] transition-colors"
        >
          <Plus size={13} /> AGGIUNGI
        </button>
      </div>

      {/* Count */}
      <div className="text-[10px] tracking-[0.3em] text-[#7a4a4a]/60">
        {filtered.length} INFLUENCER{(query || statusFilter) ? ' (FILTRATI)' : ''}
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white border border-[#e8d5d5] rounded-lg">
        <table className="w-full min-w-[1100px] text-sm border-collapse">
          <thead className="bg-[#fdf6f6] border-b border-[#e8d5d5]">
            <tr>
              <th className={thCls('last_name')} onClick={() => toggleSort('last_name')}>NOME</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">EMAIL</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">TELEFONO</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">INSTAGRAM</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">TIKTOK</th>
              <th className={thCls('followers')} onClick={() => toggleSort('followers')}>FOLLOWER</th>
              <th className={thCls('status')} onClick={() => toggleSort('status')}>STATO</th>
              <th className={thCls('last_contact_date')} onClick={() => toggleSort('last_contact_date')}>ULTIMO CONTATTO</th>
              <th className="px-3 py-2.5 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 whitespace-nowrap">NOTE</th>
              <th className="px-3 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0e4e4]">
            {editingId === 'new' && (
              <EditRow contact={EMPTY} onSave={handleSave} onCancel={() => setEditingId(null)} />
            )}
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-xs text-[#7a4a4a]/50">Caricamento…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-xs text-[#7a4a4a]/50">Nessun influencer trovato</td></tr>
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
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="text-[12px] text-[#731515] hover:underline">
                        {c.email}
                      </a>
                    ) : <span className="text-[#7a4a4a]/40 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3 text-[11px] text-[#7a4a4a] whitespace-nowrap">
                    {c.phone || '—'}
                  </td>
                  <td className="px-3 py-3">
                    {c.instagram ? (
                      <a
                        href={`https://instagram.com/${c.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[12px] text-[#7a4a4a] hover:text-[#731515] transition-colors"
                      >
                        <ExternalLink size={10} />
                        {c.instagram.startsWith('@') ? c.instagram : `@${c.instagram}`}
                      </a>
                    ) : <span className="text-[#7a4a4a]/40 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    {c.tiktok ? (
                      <span className="text-[12px] text-[#7a4a4a]">
                        {c.tiktok.startsWith('@') ? c.tiktok : `@${c.tiktok}`}
                      </span>
                    ) : <span className="text-[#7a4a4a]/40 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3 text-[12px] font-medium text-[#1a0505]">
                    {c.followers > 0 ? formatFollowers(c.followers) : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] tracking-[0.1em] border ${STATUS_COLORS[c.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[11px] text-[#7a4a4a] whitespace-nowrap">
                    {c.last_contact_date
                      ? new Date(c.last_contact_date + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : <span className="text-[#7a4a4a]/40">—</span>
                    }
                  </td>
                  <td className="px-3 py-3 text-[11px] text-[#7a4a4a] max-w-[180px]">
                    <span className="line-clamp-2">{c.notes || '—'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </div>
  );
}
