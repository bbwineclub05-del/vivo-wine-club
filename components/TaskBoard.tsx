'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, ChevronDown, ChevronLeft, ChevronRight,
  Check, Trash2, CalendarDays, ClipboardList,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface TeamMember { name: string; email: string; }

interface Team {
  id: string;
  name: string;
  color: string;
  description: string | null;
  members: string[];
}

type Priority = 'high' | 'medium' | 'low';
type Status   = 'todo' | 'done';

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_email: string;
  assignee_emails?: string[];
  assigner_email: string;
  due_date: string | null;
  priority: Priority;
  status: Status;
  created_at: string;
  team_id?: string | null;
}

interface CalEvent {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  location: string | null;
  location_full: string | null;
  type: string | null;
  section: string | null;
  status: string | null;
  slug: string | null;
}

interface PedEntry {
  id: string;
  date: string;
  title: string;
  platform: string;
  content_type: string;
  status: string;
  assigned_to: string | null;
}

// Single uniform colour for all PED entries in the Task Board calendar
// (per-platform colours live only inside PedManager's own calendar)
const PED_BG    = '#e9d5ff'; // light violet / lavender
const PED_COLOR = '#6b21a8'; // deep purple text

/* ─────────────────────────────────────────────
   Static fallbacks
───────────────────────────────────────────── */
const STATIC_ADMINS = [
  { name: 'Cris',    email: 'cristianomichelotti@gmail.com'  },
  { name: 'Pippo',   email: 'filippo.lombardi890@gmail.com'  },
  { name: 'Jack',    email: 'giacomogallo1310@gmail.com'     },
  { name: 'Ricky',   email: 'riccardo.consalvo@icloud.com'   },
  { name: 'Lorenzo', email: 'lorenzofioretti2001@gmail.com'  },
];

export const ADMINS = STATIC_ADMINS;
export function isAdmin(email: string) {
  return STATIC_ADMINS.some(a => a.email === email);
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function memberName(email: string, members: TeamMember[]) {
  return (
    members.find(m => m.email === email)?.name ??
    STATIC_ADMINS.find(a => a.email === email)?.name ??
    email.split('@')[0]
  );
}

function memberInitials(email: string, members: TeamMember[]) {
  const name = memberName(email, members);
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function fmtDate(d: string) {
  const [y, m, day] = d.slice(0, 10).split('-');
  return `${day}/${m}/${y.slice(2)}`;
}

function isOverdue(due: string | null, status: Status) {
  if (!due || status === 'done') return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(due + 'T00:00:00') < today;
}

function getQuarterKey(dateStr: string): string {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00');
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

function quarterSortKey(q: string): string {
  // "Q2 2026" → "2026-2" for sorting
  const [part, year] = q.split(' ');
  return `${year}-${part.slice(1).padStart(2, '0')}`;
}

const MONTHS_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
];
const DAYS_SHORT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

function mondayFirst(dayOfWeek: number) { // JS: 0=Sun
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}

const PRIORITY_CFG: Record<Priority, { label: string; cls: string }> = {
  high:   { label: 'HIGH', cls: 'bg-red-50 text-red-700 border border-red-200' },
  medium: { label: 'MED',  cls: 'bg-orange-50 text-orange-600 border border-orange-200' },
  low:    { label: 'LOW',  cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
};

const SECTION_LABELS: Record<string, string> = {
  wine_party:   'Wine Party',
  winery_visit: 'Winery Visit',
  wine_lounge:  'Wine Lounge',
  general:      'Evento',
};

const STATUS_EVENT_CFG: Record<string, { label: string; cls: string }> = {
  open:      { label: 'Disponibile',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  soldout:   { label: 'Sold Out',      cls: 'bg-red-50 text-red-700 border-red-200' },
  soon:      { label: 'Prossimamente', cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  completed: { label: 'Concluso',      cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const EVENT_BG   = '#3d0d0d';
const EVENT_COLOR = '#731515';

const inputCls =
  'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-3 py-2.5 text-sm ' +
  'placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors rounded-lg';

/* ─────────────────────────────────────────────
   New Task Modal
───────────────────────────────────────────── */
const EMPTY_FORM = {
  title: '',
  description: '',
  assignee_emails: [] as string[],
  due_date: '',
  priority: 'medium' as Priority,
  team_id: '',
};

function NewTaskModal({
  currentEmail,
  members,
  teams,
  defaultTeamId,
  editTarget,
  onClose,
  onCreated,
  onUpdated,
}: {
  currentEmail:   string;
  members:        TeamMember[];
  teams:          Team[];
  defaultTeamId?: string;
  editTarget?:    Task;
  onClose:        () => void;
  onCreated:      (task: Task) => void;
  onUpdated?:     (task: Task) => void;
}) {
  const isEdit = !!editTarget;
  const initForm = isEdit
    ? {
        title:           editTarget.title,
        description:     editTarget.description ?? '',
        assignee_emails: editTarget.assignee_emails?.length
          ? editTarget.assignee_emails
          : (editTarget.assignee_email ? [editTarget.assignee_email] : []),
        due_date:        editTarget.due_date ?? '',
        priority:        editTarget.priority,
        team_id:         editTarget.team_id ?? '',
      }
    : { ...EMPTY_FORM, team_id: defaultTeamId ?? '' };

  const [form, setForm] = useState(initForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setAssigneeOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const toggleAssignee = useCallback((email: string) => {
    setForm(p => {
      const emails = p.assignee_emails.includes(email)
        ? p.assignee_emails.filter(e => e !== email)
        : [...p.assignee_emails, email];
      return { ...p, assignee_emails: emails };
    });
  }, []);

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Inserisci un titolo.'); return; }
    if (form.assignee_emails.length === 0) { setError('Seleziona almeno un assegnatario.'); return; }
    setError(''); setLoading(true);
    try {
      if (isEdit && editTarget) {
        const res = await fetch(`/api/tasks/${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:           form.title.trim(),
            description:     form.description.trim() || null,
            assignee_emails: form.assignee_emails,
            due_date:        form.due_date || null,
            priority:        form.priority,
            team_id:         form.team_id || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Errore.');
        onUpdated?.({ ...editTarget, ...data.task ?? data });
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:           form.title.trim(),
            description:     form.description.trim() || null,
            assignee_emails: form.assignee_emails,
            assigner_email:  currentEmail,
            due_date:        form.due_date || null,
            priority:        form.priority,
            team_id:         form.team_id || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Errore.');
        onCreated(data.task);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }

  const assigneeLabel = form.assignee_emails.length === 0
    ? 'Assegna a…'
    : members.filter(m => form.assignee_emails.includes(m.email)).map(m => m.name).join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eddada] shrink-0 bg-white z-10">
          <div>
            <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-0.5">TASK BOARD</div>
            <h3 className="text-base font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>{isEdit ? 'Modifica task' : 'Nuova task'}</h3>
          </div>
          <button onClick={onClose} aria-label="Chiudi" className="min-w-[48px] min-h-[48px] flex items-center justify-center text-[#7a4a4a]/50 hover:text-[#731515] transition-colors rounded-lg"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">TITOLO *</div>
            <input className={inputCls} placeholder="Titolo della task…" value={form.title} onChange={e => setField('title', e.target.value)} style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }} />
          </div>

          {/* Description */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">DESCRIZIONE <span className="text-[#7a4a4a]/40 normal-case tracking-normal">— opzionale</span></div>
            <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Descrizione…" value={form.description} onChange={e => setField('description', e.target.value)} style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }} />
          </div>

          {/* Assignee */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">ASSEGNATO A *</div>
            <div className="relative" ref={dropRef}>
              <button type="button" onClick={() => setAssigneeOpen(v => !v)}
                className={`${inputCls} text-left flex items-center justify-between gap-2 ${form.assignee_emails.length === 0 ? 'text-[#7a4a4a]/35' : 'text-[#1a0505]'}`}
                style={{ fontFamily: 'var(--font-nunito)' }}>
                <span className="truncate">{assigneeLabel}</span>
                <ChevronDown size={12} className="shrink-0 text-[#731515]" />
              </button>
              {assigneeOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-[#eddada] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {members.map(m => {
                    const checked = form.assignee_emails.includes(m.email);
                    return (
                      <button key={m.email} type="button" onClick={() => toggleAssignee(m.email)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[#fdf6f6] transition-colors text-left"
                        style={{ fontFamily: 'var(--font-nunito)' }}>
                        <span className={checked ? 'text-[#1a0505] font-medium' : 'text-[#7a4a4a]'}>{m.name}</span>
                        {checked && <Check size={12} className="text-[#731515] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Team + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">TEAM</div>
              <div className="relative">
                <select className={`${inputCls} appearance-none cursor-pointer pr-8`} value={form.team_id} onChange={e => setField('team_id', e.target.value)} style={{ fontFamily: 'var(--font-nunito)' }}>
                  <option value="">Nessun team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#731515]" />
              </div>
            </div>
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">PRIORITÀ</div>
              <div className="flex gap-1.5">
                {(['high', 'medium', 'low'] as Priority[]).map(p => (
                  <button key={p} type="button" onClick={() => setField('priority', p)}
                    className={`flex-1 py-2.5 text-[9px] tracking-[0.1em] font-medium rounded-lg border transition-all ${
                      form.priority === p ? PRIORITY_CFG[p].cls : 'bg-white text-[#7a4a4a] border-[#eddada] hover:border-[#731515]/30'
                    }`} style={{ fontFamily: 'var(--font-nunito)' }}>
                    {PRIORITY_CFG[p].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Due date */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">SCADENZA <span className="text-[#7a4a4a]/40 normal-case tracking-normal">— opzionale</span></div>
            <input type="date" className={inputCls} value={form.due_date} onChange={e => setField('due_date', e.target.value)} style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }} />
          </div>

          {error && <p className="text-xs text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors">
              {loading ? 'SALVATAGGIO…' : isEdit ? 'SALVA MODIFICHE' : 'CREA TASK'}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.3em] rounded-lg hover:border-[#731515]/40 transition-colors">
              ANNULLA
            </button>
          </div>
        </form>
        </div>{/* end scrollable area */}
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Task row
───────────────────────────────────────────── */
function TaskRow({
  task,
  members,
  teams,
  currentEmail,
  isExpanded,
  onToggle,
  onComplete,
  onDelete,
  onEdit,
}: {
  task:         Task;
  members:      TeamMember[];
  teams:        Team[];
  currentEmail: string;
  isExpanded:   boolean;
  onToggle:     () => void;
  onComplete:   () => void;
  onDelete:     () => void;
  onEdit:       () => void;
}) {
  const [completing, setCompleting] = useState(false);
  const overdue  = isOverdue(task.due_date, task.status);
  const team     = teams.find(t => t.id === task.team_id);
  const assigneeEmails = task.assignee_emails?.length ? task.assignee_emails : (task.assignee_email ? [task.assignee_email] : []);
  const canDelete = task.assigner_email === currentEmail;

  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (completing) return;
    setCompleting(true);
    await onComplete();
    setCompleting(false);
  }

  function fmtDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="border-b border-[#eddada] last:border-b-0"
    >
      {/* ── Summary row (always visible) ── */}
      <div
        onClick={onToggle}
        className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[#fdf6f6]/60 transition-colors group ${
          isExpanded ? 'bg-[#fdf6f6]' : ''
        } ${task.status === 'done' ? 'opacity-60' : ''}`}
      >
        {/* Checkbox */}
        <button
          onClick={handleComplete}
          disabled={completing}
          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
            task.status === 'done'
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-[#eddada] hover:border-[#731515] group-hover:border-[#731515]/50'
          }`}
        >
          {task.status === 'done' && !completing && <Check size={10} className="text-white" />}
          {completing && <div className="w-2.5 h-2.5 rounded-full border border-[#731515] border-t-transparent animate-spin" />}
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <span className={`text-[13px] ${task.status === 'done' ? 'line-through text-[#7a4a4a]/50' : 'text-[#1a0505]'}`} style={{ fontFamily: 'var(--font-nunito)' }}>
            {task.title}
          </span>
        </div>

        {/* Assignee avatars */}
        <div className="flex items-center -space-x-1.5 shrink-0">
          {assigneeEmails.slice(0, 3).map(email => (
            <div key={email} title={memberName(email, members)}
              className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-semibold text-white"
              style={{ backgroundColor: '#731515' }}>
              {memberInitials(email, members)}
            </div>
          ))}
        </div>

        {/* Priority badge */}
        <span className={`shrink-0 text-[8px] tracking-[0.15em] px-2 py-0.5 rounded-full ${PRIORITY_CFG[task.priority].cls}`} style={{ fontFamily: 'var(--font-nunito)' }}>
          {PRIORITY_CFG[task.priority].label}
        </span>

        {/* Team badge */}
        {team && (
          <span className="shrink-0 hidden sm:flex items-center gap-1.5 text-[9px] tracking-[0.1em] px-2 py-0.5 rounded-full bg-white border border-[#eddada]" style={{ fontFamily: 'var(--font-nunito)', color: team.color }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
            {team.name}
          </span>
        )}

        {/* Due date */}
        {task.due_date && (
          <span className={`shrink-0 text-[10px] tabular-nums ${overdue ? 'text-red-600 font-semibold' : 'text-[#7a4a4a]/50'}`} style={{ fontFamily: 'var(--font-nunito)' }}>
            {overdue ? '⚠ ' : ''}{fmtDate(task.due_date)}
          </span>
        )}

        {/* Expand chevron */}
        <ChevronDown size={13} className={`shrink-0 text-[#7a4a4a]/40 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {/* ── Expanded detail panel ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-3 bg-[#fdf6f6] border-t border-[#eddada] space-y-4">
              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <div className="text-[8px] tracking-[0.3em] text-[#731515] mb-1">ASSEGNATO A</div>
                  <div className="flex flex-wrap gap-1">
                    {assigneeEmails.map(email => (
                      <span key={email} className="text-[11px] text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        {memberName(email, members)}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] tracking-[0.3em] text-[#731515] mb-1">TEAM</div>
                  <span className="text-[11px] text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {team ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                        {team.name}
                      </span>
                    ) : '—'}
                  </span>
                </div>
                <div>
                  <div className="text-[8px] tracking-[0.3em] text-[#731515] mb-1">SCADENZA</div>
                  <span className={`text-[11px] ${overdue ? 'text-red-600 font-semibold' : 'text-[#1a0505]'}`} style={{ fontFamily: 'var(--font-nunito)' }}>
                    {task.due_date ? fmtDate(task.due_date) : '—'}
                    {overdue && ' ⚠'}
                  </span>
                </div>
                <div>
                  <div className="text-[8px] tracking-[0.3em] text-[#731515] mb-1">CREATA IL</div>
                  <span className="text-[11px] text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {fmtDateTime(task.created_at)}
                  </span>
                </div>
              </div>

              {/* Description */}
              {task.description && (
                <div>
                  <div className="text-[8px] tracking-[0.3em] text-[#731515] mb-1">DESCRIZIONE</div>
                  <p className="text-[12px] text-[#7a4a4a] leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {task.description}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleComplete(e); }}
                  disabled={completing}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[9px] tracking-[0.2em] rounded-lg border transition-colors disabled:opacity-50 ${
                    task.status === 'done'
                      ? 'border-[#eddada] bg-white text-[#7a4a4a] hover:border-[#731515]/30'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <Check size={10} />
                  {task.status === 'done' ? 'RIAPRI' : 'COMPLETA'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[9px] tracking-[0.2em] rounded-lg border border-[#eddada] bg-white text-[#7a4a4a] hover:border-[#731515]/30 transition-colors"
                >
                  MODIFICA
                </button>
                {canDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[9px] tracking-[0.2em] rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={10} />
                    ELIMINA
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Quarter accordion row
───────────────────────────────────────────── */
function QuarterSection({
  label,
  tasks,
  members,
  teams,
  currentEmail,
  expandedId,
  onToggleExpand,
  onComplete,
  onDelete,
  onEdit,
}: {
  label:          string;
  tasks:          Task[];
  members:        TeamMember[];
  teams:          Team[];
  currentEmail:   string;
  expandedId:     string | null;
  onToggleExpand: (id: string) => void;
  onComplete:     (id: string) => void;
  onDelete:       (id: string) => void;
  onEdit:         (task: Task) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#eddada] last:border-b-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#fdf6f6] transition-colors text-left"
      >
        <span className="text-[10px] tracking-[0.25em] text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#7a4a4a]/40">{tasks.length}</span>
          <ChevronDown size={12} className={`text-[#7a4a4a]/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {tasks.map(t => (
              <TaskRow
                key={t.id}
                task={t}
                members={members}
                teams={teams}
                currentEmail={currentEmail}
                isExpanded={expandedId === t.id}
                onToggle={() => onToggleExpand(t.id)}
                onComplete={() => onComplete(t.id)}
                onDelete={() => onDelete(t.id)}
                onEdit={() => onEdit(t)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Calendar view
───────────────────────────────────────────── */
function CalendarView({
  tasks,
  events,
  pedEntries,
  teams,
  members,
}: {
  tasks:      Task[];
  events:     CalEvent[];
  pedEntries: PedEntry[];
  teams:      Team[];
  members:    TeamMember[];
}) {
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [calView,   setCalView]   = useState<'month' | 'week'>('month');
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const n = new Date();
    const day = n.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(n);
    mon.setDate(n.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  });

  const year = month.getFullYear();
  const mon  = month.getMonth();
  const daysInMonth   = new Date(year, mon + 1, 0).getDate();
  const firstDayOfWeek = mondayFirst(new Date(year, mon, 1).getDay());

  const todayStr = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  })();

  // Build day → items map
  const dayMap = useMemo(() => {
    const map: Record<string, { tasks: Task[]; events: CalEvent[]; ped: PedEntry[] }> = {};
    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = t.due_date.slice(0, 10);
      if (!map[key]) map[key] = { tasks: [], events: [], ped: [] };
      map[key].tasks.push(t);
    }
    for (const ev of events) {
      if (!ev.date) continue;
      const key = ev.date.slice(0, 10);
      if (!map[key]) map[key] = { tasks: [], events: [], ped: [] };
      map[key].events.push(ev);
    }
    for (const pe of pedEntries) {
      const key = pe.date.slice(0, 10);
      if (!map[key]) map[key] = { tasks: [], events: [], ped: [] };
      map[key].ped.push(pe);
    }
    return map;
  }, [tasks, events, pedEntries]);

  function prevMonth() { setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)); }
  function nextMonth() { setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)); }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  function weekRangeLabel(): string {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    if (weekStart.getMonth() === end.getMonth()) {
      return `${weekStart.getDate()} - ${end.getDate()} ${MONTHS_IT[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    }
    return `${weekStart.getDate()} ${MONTHS_IT[weekStart.getMonth()]} - ${end.getDate()} ${MONTHS_IT[end.getMonth()]} ${end.getFullYear()}`;
  }

  // Selected day popup
  const selectedItems = selectedDay ? (dayMap[selectedDay] ?? { tasks: [], events: [], ped: [] }) : null;

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-4">
      {/* Nav + view toggle */}
      <div className="flex items-center justify-between bg-white border border-[#eddada] rounded-xl px-5 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => calView === 'month'
              ? prevMonth()
              : setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; })
            }
            className="p-1.5 rounded-lg hover:bg-[#fdf6f6] transition-colors text-[#7a4a4a] hover:text-[#731515]"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-light tracking-[0.1em] text-[#1a0505] min-w-[180px] text-center" style={{ fontFamily: 'var(--font-syne)' }}>
            {calView === 'month' ? `${MONTHS_IT[mon]} ${year}` : weekRangeLabel()}
          </span>
          <button
            onClick={() => calView === 'month'
              ? nextMonth()
              : setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; })
            }
            className="p-1.5 rounded-lg hover:bg-[#fdf6f6] transition-colors text-[#7a4a4a] hover:text-[#731515]"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        {/* Month / Week toggle */}
        <div className="flex gap-0.5 bg-[#fdf6f6] border border-[#eddada] rounded-lg p-0.5">
          {(['month', 'week'] as const).map(v => (
            <button
              key={v}
              onClick={() => setCalView(v)}
              className={`px-3 py-1.5 text-[9px] tracking-[0.2em] rounded-lg transition-all duration-150 ${
                calView === v ? 'bg-[#731515] text-white shadow-sm' : 'text-[#7a4a4a] hover:text-[#731515]'
              }`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {v === 'month' ? 'MESE' : 'SETTIMANA'}
            </button>
          ))}
        </div>
      </div>

      {/* Month grid */}
      {calView === 'month' && (
        <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[#eddada]">
            {DAYS_SHORT.map(d => (
              <div key={d} className="px-2 py-2.5 text-center text-[9px] tracking-[0.25em] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-[#eddada]">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="min-h-[80px] bg-[#fdf6f6]/30" />;
              const dayStr = `${year}-${String(mon + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const items  = dayMap[dayStr];
              const isToday    = dayStr === todayStr;
              const isSelected = dayStr === selectedDay;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : dayStr)}
                  className={`min-h-[80px] p-2 text-left flex flex-col gap-1 transition-colors hover:bg-[#fdf6f6] ${
                    isSelected ? 'bg-[#fdf6f6] ring-1 ring-inset ring-[#731515]/30' : ''
                  }`}
                >
                  <div className={`text-xs w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                    isToday ? 'bg-[#731515] text-white font-semibold' : 'text-[#7a4a4a]'
                  }`} style={{ fontFamily: 'var(--font-nunito)' }}>
                    {day}
                  </div>
                  {items?.tasks.map(t => {
                    const team = teams.find(te => te.id === t.team_id);
                    return (
                      <div key={t.id} className="w-full px-1.5 py-0.5 rounded text-[9px] truncate text-white leading-tight"
                        style={{ backgroundColor: team?.color ?? '#731515' }}>
                        {t.title}
                      </div>
                    );
                  })}
                  {items?.events.map(ev => (
                    <div key={ev.id} className="w-full px-1.5 py-0.5 rounded text-[9px] truncate leading-tight"
                      style={{ backgroundColor: EVENT_BG, color: '#fff', opacity: 0.92 }}>
                      {ev.title}
                    </div>
                  ))}
                  {items?.ped.map(pe => (
                    <div key={pe.id} className="w-full px-1.5 py-0.5 rounded text-[9px] truncate leading-tight"
                      style={{ backgroundColor: PED_BG, color: PED_COLOR }}>
                      {pe.title}
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Week grid */}
      {calView === 'week' && (
        <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#eddada]">
            {weekDays.map((d, i) => {
              const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const isToday = dayStr === todayStr;
              return (
                <div key={i} className={`px-2 py-3 text-center border-r border-[#eddada] last:border-r-0 ${isToday ? 'bg-[#fdf6f6]' : ''}`}>
                  <div className="text-[9px] tracking-[0.2em] text-[#7a4a4a]/50 mb-1.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {DAYS_SHORT[i]}
                  </div>
                  <div className={`text-sm w-7 h-7 mx-auto flex items-center justify-center rounded-full font-light ${isToday ? 'bg-[#731515] text-white' : 'text-[#1a0505]'}`} style={{ fontFamily: 'var(--font-syne)' }}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Day columns */}
          <div className="grid grid-cols-7 divide-x divide-[#eddada]">
            {weekDays.map((d, i) => {
              const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const items  = dayMap[dayStr];
              const isToday    = dayStr === todayStr;
              const isSelected = dayStr === selectedDay;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : dayStr)}
                  className={`min-h-[160px] p-2.5 text-left flex flex-col gap-1.5 transition-colors hover:bg-[#fdf6f6] ${
                    isSelected ? 'bg-[#fdf6f6] ring-1 ring-inset ring-[#731515]/30' : isToday ? 'bg-[#fdf6f6]/40' : ''
                  }`}
                >
                  {items?.tasks.map(t => {
                    const team = teams.find(te => te.id === t.team_id);
                    return (
                      <div key={t.id} className="w-full px-2 py-1 rounded text-white leading-tight"
                        style={{ backgroundColor: team?.color ?? '#731515' }}>
                        <div className="text-[10px] font-medium truncate">{t.title}</div>
                        <div className="text-[8px] opacity-75 mt-0.5">{memberName(t.assignee_email, members)}</div>
                      </div>
                    );
                  })}
                  {items?.events.map(ev => (
                    <div key={ev.id} className="w-full px-2 py-1 rounded leading-tight"
                      style={{ backgroundColor: EVENT_BG, color: '#fff' }}>
                      <div className="text-[10px] font-medium truncate">{ev.title}</div>
                      {ev.location && <div className="text-[8px] opacity-75 mt-0.5 truncate">📍 {ev.location}</div>}
                    </div>
                  ))}
                  {items?.ped.map(pe => (
                    <div key={pe.id} className="w-full px-2 py-1 rounded leading-tight"
                      style={{ backgroundColor: PED_BG, color: PED_COLOR }}>
                      <div className="text-[10px] font-medium truncate">{pe.title}</div>
                      <div className="text-[8px] opacity-75 mt-0.5">{pe.platform} · {pe.content_type}</div>
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day popup */}
      <AnimatePresence>
        {selectedDay && selectedItems && (selectedItems.tasks.length > 0 || selectedItems.events.length > 0 || selectedItems.ped.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="bg-white border border-[#eddada] rounded-xl overflow-hidden shadow-md"
          >
            <div className="flex items-center justify-between px-5 py-3 bg-[#fdf6f6] border-b border-[#eddada]">
              <div className="text-[9px] tracking-[0.35em] text-[#731515]">
                {fmtDate(selectedDay).toUpperCase()}
              </div>
              <button onClick={() => setSelectedDay(null)} className="text-[#7a4a4a]/40 hover:text-[#731515] transition-colors">
                <X size={13} />
              </button>
            </div>
            <div className="divide-y divide-[#eddada]">
              {selectedItems.tasks.map(t => {
                const team = teams.find(te => te.id === t.team_id);
                return (
                  <div key={t.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: team?.color ?? '#731515' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>{t.title}</div>
                      <div className="text-[10px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                        {team?.name ?? 'Task'} · {memberName(t.assignee_email, members)}
                      </div>
                    </div>
                    <span className={`shrink-0 text-[8px] tracking-[0.15em] px-1.5 py-0.5 rounded-full ${PRIORITY_CFG[t.priority].cls}`}>
                      {PRIORITY_CFG[t.priority].label}
                    </span>
                  </div>
                );
              })}
              {selectedItems.events.map(ev => {
                const statusCfg = STATUS_EVENT_CFG[ev.status ?? ''] ?? STATUS_EVENT_CFG['open'];
                const sectionLabel = SECTION_LABELS[ev.section ?? ''] ?? (ev.type ?? 'Evento');
                return (
                  <div key={ev.id} className="px-5 py-3 space-y-1.5">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: EVENT_BG }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>{ev.title}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[9px] tracking-[0.15em] px-1.5 py-0.5 rounded-full bg-[#fdf6f6] text-[#731515] border border-[#eddada]" style={{ fontFamily: 'var(--font-nunito)' }}>
                            {sectionLabel.toUpperCase()}
                          </span>
                          <span className={`text-[9px] tracking-[0.15em] px-1.5 py-0.5 rounded-full border ${statusCfg.cls}`} style={{ fontFamily: 'var(--font-nunito)' }}>
                            {statusCfg.label.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
                          {ev.location && <span>📍 {ev.location}</span>}
                          {ev.time     && <span>🕐 {ev.time}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {selectedItems.ped.map(pe => (
                <div key={pe.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: PED_COLOR }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>{pe.title}</div>
                    <div className="text-[10px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                      PED · {pe.platform} · {pe.content_type}
                      {pe.assigned_to && ` · ${pe.assigned_to}`}
                    </div>
                  </div>
                  <span className="shrink-0 text-[8px] tracking-[0.15em] px-1.5 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200" style={{ fontFamily: 'var(--font-nunito)' }}>
                    PED
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1" style={{ fontFamily: 'var(--font-nunito)' }}>
        <span className="text-[9px] text-[#7a4a4a]/40 tracking-[0.2em]">LEGENDA</span>
        {teams.map(t => (
          <div key={t.id} className="flex items-center gap-1.5 text-[9px] text-[#7a4a4a]">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: t.color }} />
            {t.name}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-[9px] text-[#7a4a4a]">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#f5e6e6', border: '1px solid #73151530' }} />
          Eventi
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-[#7a4a4a]">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: PED_BG, border: `1px solid ${PED_COLOR}40` }} />
          PED
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function TaskBoard({ currentEmail }: { currentEmail: string }) {
  const [tasks,         setTasks]         = useState<Task[]>([]);
  const [events,        setEvents]        = useState<CalEvent[]>([]);
  const [pedEntries,    setPedEntries]    = useState<PedEntry[]>([]);
  const [teams,         setTeams]         = useState<Team[]>([]);
  const [members,       setMembers]       = useState<TeamMember[]>(STATIC_ADMINS);
  const [loading,       setLoading]       = useState(true);
  const [mainTab,       setMainTab]       = useState<'tasks' | 'calendar'>('tasks');
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [editTarget,    setEditTarget]    = useState<Task | null>(null);
  const [teamFilter,    setTeamFilter]    = useState<string>('');
  const [doneOpen,      setDoneOpen]      = useState(false);
  const [showNewTask,   setShowNewTask]   = useState(false);
  const [token,         setToken]         = useState('');
  const [liveConnected, setLiveConnected] = useState(false);
  const localInsertIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadTasks(), loadMembers(), loadTeams(), loadEvents(), loadPedEntries()]);
    setLoading(false);
  }

  async function loadTasks() {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch { /* silent */ }
  }

  async function loadMembers() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/team/members', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.members?.length > 0) setMembers(json.members as TeamMember[]);
    } catch { /* fall back to static list */ }
  }

  async function loadTeams() {
    try {
      const res = await fetch('/api/teams');
      if (!res.ok) return;
      const json = await res.json();
      setTeams(json.teams ?? []);
    } catch { /* silent */ }
  }

  async function loadEvents() {
    try {
      const res = await fetch('/api/events/all');
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json.events)) setEvents(json.events as CalEvent[]);
    } catch { /* silent */ }
  }

  async function loadPedEntries() {
    try {
      const res = await fetch('/api/ped/all');
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json.entries)) setPedEntries(json.entries as PedEntry[]);
    } catch { /* silent */ }
  }

  /* ── Realtime ── */
  useEffect(() => {
    if (!token) return;
    supabase.realtime.setAuth(token);
    const channel = supabase
      .channel('tasks_realtime_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => { loadMembers(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const t = payload.new as Task;
          if (localInsertIds.current.has(t.id)) { localInsertIds.current.delete(t.id); return; }
          setTasks(prev => prev.some(x => x.id === t.id) ? prev : [t, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const t = payload.new as Task;
          setTasks(prev => prev.map(x => x.id === t.id ? t : x));
        } else if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id: string }).id;
          setTasks(prev => prev.filter(x => x.id !== id));
        }
      })
      .subscribe(status => setLiveConnected(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── CRUD ── */
  async function handleStatusChange(id: string, status: Status) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa task?')) return;
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== id));
  }

  function handleCreated(task: Task) {
    localInsertIds.current.add(task.id);
    setTasks(prev => [task, ...prev]);
  }

  /* ── Filtered tasks ── */
  const filtered = useMemo(() =>
    tasks.filter(t => !teamFilter || t.team_id === teamFilter),
  [tasks, teamFilter]);

  const openTasks = useMemo(() =>
    filtered.filter(t => t.status !== 'done')
      .sort((a, b) => {
        // Priority order: high → medium → low
        const pOrder = { high: 0, medium: 1, low: 2 };
        if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
        // Then by due date (soonest first, nulls last)
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      }),
  [filtered]);

  const doneTasks = useMemo(() =>
    filtered.filter(t => t.status === 'done')
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  [filtered]);

  /* ── Quarter groups for done tasks ── */
  const quarterGroups = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    for (const t of doneTasks) {
      const key = getQuarterKey(t.due_date ?? t.created_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    return Object.entries(groups)
      .sort((a, b) => quarterSortKey(b[0]).localeCompare(quarterSortKey(a[0])));
  }, [doneTasks]);

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[9px] tracking-[0.42em] text-[#731515] mb-1">ADMIN · TASKS</div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>Task</h2>
            {liveConnected && (
              <span className="flex items-center gap-1 text-[8px] tracking-[0.2em] text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowNewTask(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#731515] text-white text-[10px] tracking-[0.25em] rounded-lg hover:bg-[#9b2323] transition-colors"
        >
          <Plus size={11} />
          NUOVA TASK
        </button>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 bg-[#fdf6f6] border border-[#eddada] rounded-xl p-1 w-fit">
        {([
          { id: 'tasks',    label: 'Tasks',     Icon: ClipboardList },
          { id: 'calendar', label: 'Calendario', Icon: CalendarDays  },
        ] as { id: 'tasks' | 'calendar'; label: string; Icon: React.FC<{ size?: number }> }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setMainTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2 text-[10px] tracking-[0.22em] rounded-lg transition-all duration-200 ${
              mainTab === tab.id
                ? 'bg-[#731515] text-white shadow-sm'
                : 'text-[#7a4a4a] hover:text-[#731515]'
            }`}
          >
            <tab.Icon size={12} />
            {tab.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Team filter pills */}
      {teams.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTeamFilter('')}
            className={`px-4 py-1.5 text-[10px] tracking-[0.15em] rounded-full border transition-all duration-150 ${
              !teamFilter
                ? 'bg-[#731515] text-white border-[#731515]'
                : 'bg-white text-[#731515] border-[#731515]/40 hover:border-[#731515]'
            }`}
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Tutti
          </button>
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => setTeamFilter(teamFilter === team.id ? '' : team.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-[10px] tracking-[0.15em] rounded-full border transition-all duration-150 ${
                teamFilter === team.id
                  ? 'text-white border-transparent'
                  : 'bg-white border-[#eddada] hover:border-[#731515]/40'
              }`}
              style={{
                fontFamily: 'var(--font-nunito)',
                backgroundColor: teamFilter === team.id ? team.color : undefined,
                color: teamFilter === team.id ? 'white' : team.color,
                borderColor: teamFilter === team.id ? team.color : undefined,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: teamFilter === team.id ? 'white' : team.color }} />
              {team.name}
            </button>
          ))}
        </div>
      )}

      {/* New task modal */}
      <AnimatePresence>
        {showNewTask && (
          <NewTaskModal
            key="new-task"
            currentEmail={currentEmail}
            members={members}
            teams={teams}
            defaultTeamId={teamFilter || undefined}
            onClose={() => setShowNewTask(false)}
            onCreated={handleCreated}
          />
        )}
        {editTarget && (
          <NewTaskModal
            key="edit-task"
            currentEmail={currentEmail}
            members={members}
            teams={teams}
            editTarget={editTarget}
            onClose={() => setEditTarget(null)}
            onCreated={handleCreated}
            onUpdated={(updated) => {
              setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
              setEditTarget(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Tasks tab ── */}
      {mainTab === 'tasks' && (
        loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Open tasks */}
            <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(107,26,26,0.04)]">
              <div className="flex items-center justify-between px-5 py-3 bg-[#fdf6f6] border-b border-[#eddada]">
                <div className="text-[9px] tracking-[0.4em] text-[#731515]">APERTE</div>
                <span className="text-[10px] text-[#7a4a4a]/40">{openTasks.length}</span>
              </div>

              {openTasks.length === 0 ? (
                <div className="py-10 text-center text-[12px] text-[#7a4a4a]/40 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
                  Nessuna task aperta. Ottimo lavoro!
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {openTasks.map(t => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      members={members}
                      teams={teams}
                      currentEmail={currentEmail}
                      isExpanded={expandedId === t.id}
                      onToggle={() => setExpandedId(prev => prev === t.id ? null : t.id)}
                      onComplete={() => handleStatusChange(t.id, 'done')}
                      onDelete={() => handleDelete(t.id)}
                      onEdit={() => setEditTarget(t)}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Completed accordion */}
            {doneTasks.length > 0 && (
              <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(107,26,26,0.04)]">
                <button
                  onClick={() => setDoneOpen(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#fdf6f6] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] tracking-[0.4em] text-[#7a4a4a]/60">COMPLETATE</span>
                    <span className="text-[9px] tracking-[0.15em] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {doneTasks.length}
                    </span>
                  </div>
                  <ChevronDown size={14} className={`text-[#7a4a4a]/40 transition-transform duration-200 ${doneOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {doneOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden border-t border-[#eddada]"
                    >
                      {quarterGroups.map(([quarter, qTasks]) => (
                        <QuarterSection
                          key={quarter}
                          label={quarter}
                          tasks={qTasks}
                          members={members}
                          teams={teams}
                          currentEmail={currentEmail}
                          expandedId={expandedId}
                          onToggleExpand={(id) => setExpandedId(prev => prev === id ? null : id)}
                          onComplete={(id) => handleStatusChange(id, 'todo')}
                          onDelete={handleDelete}
                          onEdit={(task) => setEditTarget(task)}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )
      )}

      {/* ── Calendar tab ── */}
      {mainTab === 'calendar' && (
        <CalendarView
          tasks={filtered}
          events={events}
          pedEntries={pedEntries}
          teams={teams}
          members={members}
        />
      )}
    </div>
  );
}
