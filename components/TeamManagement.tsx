'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, ChevronDown, Shield, UserCheck, UserX,
  ToggleLeft, ToggleRight, X, Loader2, Mail, Crown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ADMIN_EMAILS, SUPER_ADMIN_EMAIL } from '@/lib/admins';
import { useMobileOverlay } from '@/lib/useMobileOverlay';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Permissions {
  tasks:     boolean;
  events:    boolean;
  news:      boolean;
  crm:       boolean;
  media:     boolean;
  scanner:   boolean;
  analytics: boolean;
  pipeline:  boolean;
  merch:     boolean;
  documents: boolean;
}

interface TeamMember {
  id:              string;
  email:           string;
  name:            string;
  role:            'admin' | 'staff';
  permissions:     Permissions;
  active:          boolean;
  email_confirmed: boolean;
  last_sign_in:    string | null;
  invited_at:      string | null;
  created_at:      string;
}

const PERMISSION_LABELS: { key: keyof Permissions; label: string }[] = [
  { key: 'tasks',     label: 'Task'                    },
  { key: 'events',    label: 'Gestione Eventi'         },
  { key: 'news',      label: 'Gestione News'           },
  { key: 'crm',       label: 'CRM'                     },
  { key: 'media',     label: 'Gestione Media'          },
  { key: 'merch',     label: 'Gestione Merch & Sconti' },
  { key: 'documents', label: 'Gestione Documenti'      },
  { key: 'scanner',   label: 'Scanner'                 },
  { key: 'analytics', label: 'Analytics'               },
  { key: 'pipeline',  label: 'Pipeline Membership'     },
];

// ── Small helpers ─────────────────────────────────────────────────────────────

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={`shrink-0 transition-colors duration-200 ${disabled ? 'opacity-30 cursor-default' : 'cursor-pointer'}`}
    >
      {on
        ? <ToggleRight size={22} className="text-[#731515]" />
        : <ToggleLeft  size={22} className="text-[#7a4a4a]/25" />}
    </button>
  );
}

function RoleBadge({ role, isFounder, isSuperAdm }: { role: string; isFounder?: boolean; isSuperAdm?: boolean }) {
  if (isSuperAdm) return (
    <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.3em] px-2 py-0.5 rounded-full bg-[#fbd8d8] text-[#731515] font-medium">
      <Crown size={8} /> SUPER ADMIN
    </span>
  );
  if (isFounder) return (
    <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.3em] px-2 py-0.5 rounded-full bg-[#fbd8d8] text-[#731515] font-medium">
      <Shield size={8} /> ADMIN
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.3em] px-2 py-0.5 rounded-full bg-[#e8d5d5] text-[#7a4a4a] font-medium">
      <UserCheck size={8} /> STAFF
    </span>
  );
}

function Monogram({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <div
      style={{ width: size, height: size, minWidth: size, fontSize: Math.round(size * 0.37) }}
      className="rounded-full bg-gradient-to-br from-[#731515] to-[#3d0808] flex items-center justify-center text-white font-semibold select-none shrink-0"
    >
      {initials}
    </div>
  );
}

// ── Add Member Modal ──────────────────────────────────────────────────────────

function AddMemberModal({ onClose, onAdded, token }: {
  onClose: () => void;
  onAdded: (m: TeamMember) => void;
  token: string;
}) {
  const [name,   setName]   = useState('');
  const [email,  setEmail]  = useState('');
  const [role,   setRole]   = useState<'admin' | 'staff'>('staff');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res  = await fetch('/api/team', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ name, email, role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Errore'); return; }
      onAdded(data.member);
      onClose();
    } catch { setError('Errore di rete.'); }
    finally  { setSaving(false); }
  }

  const inp = 'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-3.5 py-2.5 text-sm placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors rounded-lg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-xl border border-[#eddada] shadow-xl w-full max-w-md p-6"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-[16px] font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
              Aggiungi membro
            </h2>
            <p className="text-[11px] text-[#7a4a4a]/60 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
              Verrà inviata un&apos;email con link per impostare la password.
            </p>
          </div>
          <button onClick={onClose} className="text-[#7a4a4a]/40 hover:text-[#7a4a4a] mt-0.5">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">NOME COMPLETO</label>
            <input required placeholder="es. Mario Rossi" value={name}
              onChange={e => setName(e.target.value)} className={inp}
              style={{ fontFamily: 'var(--font-nunito)' }} />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">EMAIL</label>
            <input type="email" required placeholder="mario@email.com" value={email}
              onChange={e => setEmail(e.target.value)} className={inp}
              style={{ fontFamily: 'var(--font-nunito)' }} />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">RUOLO</label>
            <select value={role} onChange={e => setRole(e.target.value as 'admin' | 'staff')}
              className={inp} style={{ fontFamily: 'var(--font-nunito)' }}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && (
            <p className="text-[12px] text-[#731515] bg-[#fde8e8] border border-[#731515]/15 px-3 py-2 rounded-lg"
              style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 bg-white border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.25em] hover:bg-[#fdf6f6] transition-colors rounded-lg">
              ANNULLA
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.25em] hover:bg-[#9b2323] disabled:opacity-55 transition-colors rounded-lg flex items-center justify-center gap-2">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
              {saving ? 'INVIO…' : 'INVIA INVITO'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Member row ────────────────────────────────────────────────────────────────

function MemberRow({ member, token, onUpdated, onDeleted }: {
  member:    TeamMember;
  token:     string;
  onUpdated: (m: TeamMember) => void;
  onDeleted: (id: string)    => void;
}) {
  const [expanded,   setExpanded]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState('');
  const [deleting,   setDeleting]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const isFounder    = ADMIN_EMAILS.includes(member.email);
  const isSuperAdm   = member.email === SUPER_ADMIN_EMAIL;
  const locked       = isSuperAdm; // super admin row is fully read-only

  const patch = useCallback(async (body: Record<string, unknown>) => {
    setSaving(true);
    setSaveError('');
    try {
      const res  = await fetch(`/api/team/${member.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) onUpdated(data.member);
      else setSaveError(data.error ?? 'Errore nel salvataggio');
    } catch { setSaveError('Errore di rete'); }
    finally { setSaving(false); }
  }, [member.id, token, onUpdated]);

  async function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true);
    try {
      await fetch(`/api/team/${member.id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onDeleted(member.id);
    } finally { setDeleting(false); setConfirmDel(false); }
  }

  const lastSeen = member.last_sign_in
    ? new Date(member.last_sign_in).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Mai';

  return (
    <div className="border border-[#eddada] rounded-xl overflow-hidden">

      {/* ── Header row ── */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Monogram name={member.name} size={34} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-[#1a0505] leading-none"
              style={{ fontFamily: 'var(--font-nunito)' }}>{member.name}</span>
            <RoleBadge role={member.role} isFounder={isFounder} isSuperAdm={isSuperAdm} />
            {!member.active && !locked && (
              <span className="text-[9px] tracking-[0.3em] text-[#7a4a4a]/40 bg-[#e8e0e0] px-2 py-0.5 rounded-full">
                DISATTIVATO
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-[#7a4a4a]/55" style={{ fontFamily: 'var(--font-nunito)' }}>
              {member.email}
            </span>
            {!isSuperAdm && (
              <span className="text-[10px] text-[#7a4a4a]/35" style={{ fontFamily: 'var(--font-nunito)' }}>
                · Ultimo accesso: {lastSeen}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!locked && (
          <div className="flex items-center gap-1 shrink-0">
            {saving && <Loader2 size={13} className="animate-spin text-[#731515]/40 mr-1" />}

            {/* Active toggle */}
            <button
              onClick={() => patch({ active: !member.active })}
              title={member.active ? 'Disattiva' : 'Attiva'}
              className="p-1.5 rounded-lg text-[#7a4a4a]/30 hover:text-[#731515]/60 transition-colors"
            >
              {member.active ? <UserCheck size={15} /> : <UserX size={15} />}
            </button>

            {/* Delete */}
            {!isFounder && (
              <button
                onClick={handleDelete} disabled={deleting}
                title={confirmDel ? 'Conferma eliminazione' : 'Elimina'}
                onBlur={() => setConfirmDel(false)}
                className={`p-1.5 rounded-lg transition-colors ${confirmDel ? 'bg-red-50 text-red-600' : 'text-[#7a4a4a]/30 hover:text-red-500'}`}
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
            )}

            {/* Expand permissions (not for admin-role users — permissions have no effect on admins) */}
            {member.role === 'staff' && (
              <button onClick={() => setExpanded(v => !v)}
                className="p-1.5 rounded-lg text-[#7a4a4a]/30 hover:text-[#7a4a4a]/70 transition-colors"
                title="Modifica permessi">
                <ChevronDown size={15}
                  className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Save error */}
      {saveError && (
        <div className="px-4 pb-2.5">
          <p className="text-[11px] text-[#731515] bg-[#fde8e8] border border-[#731515]/15 px-3 py-1.5 rounded-lg"
            style={{ fontFamily: 'var(--font-nunito)' }}>{saveError}</p>
        </div>
      )}

      {/* ── Permissions panel (staff only) ── */}
      <AnimatePresence initial={false}>
        {expanded && member.role === 'staff' && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#eddada] bg-[#fdf8f8] px-4 py-4">
              <p className="text-[9px] tracking-[0.4em] text-[#731515] mb-3">PERMESSI SEZIONI</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                {PERMISSION_LABELS.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] text-[#3a1a1a]"
                      style={{ fontFamily: 'var(--font-nunito)' }}>{label}</span>
                    <Toggle
                      on={member.permissions?.[key] ?? false}
                      onChange={v => patch({ permissions: { [key]: v } })}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#7a4a4a]/40 mt-3 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
                Se disattivata, la sezione mostra &ldquo;Accesso non autorizzato&rdquo;.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admins note */}
      {member.role === 'admin' && !locked && (
        <div className="border-t border-[#eddada] bg-[#fdf8f8] px-4 py-2.5">
          <p className="text-[10px] text-[#7a4a4a]/45 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
            Gli admin hanno accesso completo a tutte le sezioni.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TeamManagement() {
  const [members,   setMembers]   = useState<TeamMember[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [token,     setToken]     = useState('');
  // AddMemberModal has no scroll lock of its own — use the full treatment.
  useMobileOverlay(showModal, () => setShowModal(false));
  const [error,     setError]     = useState('');

  const fetchMembers = useCallback(async (accessToken: string) => {
    setLoading(true);
    try {
      const res  = await fetch('/api/team', { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (res.ok) setMembers(data.members ?? []);
      else setError(data.error ?? 'Errore caricamento');
    } catch { setError('Errore di rete.'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      setToken(session.access_token);
      fetchMembers(session.access_token);
    });
  }, [fetchMembers]);

  function handleAdded(m: TeamMember) {
    setMembers(prev => {
      const exists = prev.find(x => x.email === m.email);
      return exists ? prev.map(x => x.email === m.email ? m : x) : [...prev, m];
    });
  }

  const admins = members.filter(m => m.role === 'admin');
  const staff  = members.filter(m => m.role === 'staff');

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[clamp(1.6rem,2.5vw,2.2rem)] font-light text-[#1a0505] leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-syne)' }}>Team Management</h1>
          <p className="mt-2 text-sm text-[#7a4a4a]/70 font-light" style={{ fontFamily: 'var(--font-nunito)' }}>
            Tutti gli utenti su Supabase Auth — gestisci ruoli e permessi per sezione.
          </p>
          <div className="mt-5 h-px w-16 bg-[#731515]/30" />
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-white bg-[#731515] px-5 py-3 hover:bg-[#9b2323] transition-colors rounded-lg shrink-0 mt-1">
          <Plus size={13} /> AGGIUNGI
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-[#731515]/40" />
        </div>
      )}

      {error && (
        <p className="text-sm text-[#731515] bg-[#fde8e8] border border-[#731515]/15 px-4 py-3 rounded-lg mb-6"
          style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
      )}

      {!loading && !error && (
        <div className="space-y-8">

          {/* Admin group */}
          {admins.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield size={11} className="text-[#731515]" />
                <span className="text-[9px] tracking-[0.42em] text-[#731515] uppercase">
                  Admin ({admins.length})
                </span>
              </div>
              <div className="space-y-2">
                {admins.map(m => (
                  <MemberRow key={m.id || m.email} member={m} token={token}
                    onUpdated={u => setMembers(prev => prev.map(x => x.id === u.id ? u : x))}
                    onDeleted={id => setMembers(prev => prev.filter(x => x.id !== id))} />
                ))}
              </div>
            </div>
          )}

          {/* Staff group */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserCheck size={11} className="text-[#7a4a4a]" />
              <span className="text-[9px] tracking-[0.42em] text-[#7a4a4a]/70 uppercase">
                Staff ({staff.length})
              </span>
            </div>
            {staff.length === 0 ? (
              <div className="border border-dashed border-[#eddada] rounded-xl px-6 py-10 text-center">
                <UserCheck size={28} className="text-[#7a4a4a]/20 mx-auto mb-3" />
                <p className="text-sm text-[#7a4a4a]/50 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
                  Nessun membro staff. Clicca &ldquo;Aggiungi&rdquo; per invitare qualcuno.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {staff.map(m => (
                  <MemberRow key={m.id || m.email} member={m} token={token}
                    onUpdated={u => setMembers(prev => prev.map(x => x.id === u.id ? u : x))}
                    onDeleted={id => setMembers(prev => prev.filter(x => x.id !== id))} />
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <AddMemberModal token={token} onClose={() => setShowModal(false)} onAdded={handleAdded} />
        )}
      </AnimatePresence>
    </>
  );
}
