'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ChevronDown, Trash2, ClipboardList, Check, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ── Team member type (from Supabase) ── */
interface TeamMember { name: string; email: string; }

/* ── Team type ── */
interface Team {
  id: string;
  name: string;
  color: string;
  description: string | null;
  members: string[]; // emails
}

/* ── Static fallback list for isAdmin / adminName before team loads ── */
const STATIC_ADMINS = [
  { name: 'Cris',  email: 'cristianomichelotti@gmail.com' },
  { name: 'Pippo', email: 'filippo.lombardi890@gmail.com' },
  { name: 'Jack',  email: 'giacomogallo1310@gmail.com'    },
  { name: 'Ricky', email: 'riccardo.consalvo@icloud.com'  },
];

export const ADMINS = STATIC_ADMINS; // keep export for callers that import it

export function isAdmin(email: string) {
  return STATIC_ADMINS.some((a) => a.email === email);
}

function memberName(email: string, members: TeamMember[]) {
  return (
    members.find((m) => m.email === email)?.name ??
    STATIC_ADMINS.find((a) => a.email === email)?.name ??
    email.split('@')[0]
  );
}

function initials(email: string, members: TeamMember[]) {
  const name = memberName(email, members);
  return name.slice(0, 2).toUpperCase();
}

/* ── Types ── */
type Priority = 'high' | 'medium' | 'low';
type Status   = 'todo' | 'done';

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_email: string;        // first assignee (backward compat)
  assignee_emails?: string[];    // full array (new)
  assigner_email: string;
  due_date: string | null;
  priority: Priority;
  status: Status;
  created_at: string;
  team_id?: string | null;
}

/* ── Helpers ── */
const PRIORITY_STYLES: Record<Priority, string> = {
  high:   'bg-[#731515] text-white',
  medium: 'bg-[#e8d5d5] text-[#7a4a4a]',
  low:    'bg-[#e8d5d5] text-[#7a4a4a]/70',
};

const STATUS_STYLES: Record<Status, string> = {
  todo: 'border border-[#e8d5d5] bg-white text-[#7a4a4a]',
  done: 'border border-green-600/30 bg-green-50 text-green-700',
};

const STATUS_LABELS: Record<Status, string> = {
  todo: 'TO DO',
  done: 'DONE',
};

const STATUS_ORDER: Status[] = ['todo', 'done'];

function nextStatus(s: Status): Status {
  const i = STATUS_ORDER.indexOf(s);
  return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(due: string | null, status: Status) {
  if (!due || status === 'done') return false;
  return new Date(due) < new Date(new Date().toDateString());
}

/* ── Empty form ── */
const EMPTY_FORM = {
  title: '',
  description: '',
  assignee_emails: [] as string[],
  due_date: '',
  priority: 'medium' as Priority,
  team_id: '',
};

/* ── Task card ── */
function TaskCard({
  task,
  currentEmail,
  members,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  currentEmail: string;
  members: TeamMember[];
  onStatusChange: (id: string, status: Status) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);

  async function handleStatusClick() {
    setUpdating(true);
    await onStatusChange(task.id, nextStatus(task.status));
    setUpdating(false);
  }

  const overdue = isOverdue(task.due_date, task.status);
  const assigneeEmails = task.assignee_emails?.length ? task.assignee_emails : (task.assignee_email ? [task.assignee_email] : []);
  const isAssignedByMe = task.assigner_email === currentEmail;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="bg-white border border-[#e8d5d5] p-5 flex flex-col gap-3 hover:border-[#731515]/30 transition-colors duration-200"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <h3
          className="text-sm font-medium text-[#1a0505] leading-snug flex-1"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {task.title}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[9px] tracking-[0.2em] px-2 py-0.5 ${PRIORITY_STYLES[task.priority]}`}>
            {task.priority.toUpperCase()}
          </span>
          {(isAssignedByMe) && (
            <button
              onClick={() => onDelete(task.id)}
              className="text-[#7a4a4a]/30 hover:text-[#731515] transition-colors duration-200"
              aria-label="Delete task"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p
          className="text-xs text-[#7a4a4a] leading-relaxed"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {task.description}
        </p>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
        <span>
          <span className="text-[#731515]">{memberName(task.assigner_email, members)}</span>
          {' → '}
          {assigneeEmails.map((e, i) => (
            <span key={e} className={e === currentEmail ? 'font-semibold text-[#1a0505]' : ''}>
              {memberName(e, members)}{i < assigneeEmails.length - 1 ? ', ' : ''}
            </span>
          ))}
        </span>
        {task.due_date && (
          <span className={overdue ? 'text-[#731515] font-semibold' : ''}>
            {overdue ? '⚠ ' : ''}Due {formatDate(task.due_date)}
          </span>
        )}
      </div>

      {/* Status stepper */}
      <div className="flex items-center gap-1 pt-1">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={s !== task.status ? handleStatusClick : undefined}
            disabled={updating}
            className={`
              text-[8px] tracking-[0.2em] px-2.5 py-1 transition-all duration-200
              ${s === task.status
                ? STATUS_STYLES[s]
                : 'text-[#7a4a4a]/30 hover:text-[#7a4a4a]/60'}
              ${updating ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Kanban board (reusable) ── */
function KanbanBoard({
  tasks,
  currentEmail,
  members,
  onStatusChange,
  onDelete,
}: {
  tasks: Task[];
  currentEmail: string;
  members: TeamMember[];
  onStatusChange: (id: string, status: Status) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const groups: Record<Status, Task[]> = { todo: [], done: [] };
  for (const t of tasks) {
    const s: Status = t.status === 'done' ? 'done' : 'todo';
    groups[s].push(t);
  }

  if (tasks.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-xs text-[#7a4a4a]/50 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
          No tasks yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      {STATUS_ORDER.map((status) => (
        <div key={status} className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[8px] tracking-[0.3em] px-2.5 py-1 ${STATUS_STYLES[status]}`}>
              {STATUS_LABELS[status]}
            </span>
            {groups[status].length > 0 && (
              <span className="text-[9px] text-[#7a4a4a]/40">{groups[status].length}</span>
            )}
          </div>
          <AnimatePresence mode="popLayout">
            {groups[status].length === 0 ? (
              <div className="border border-dashed border-[#e8d5d5] py-6 text-center">
                <p className="text-[10px] text-[#7a4a4a]/30 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
                  Empty
                </p>
              </div>
            ) : (
              groups[status].map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentEmail={currentEmail}
                  members={members}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

/* ── Team card ── */
function TeamCard({
  team,
  tasks,
  onClick,
}: {
  team: Team;
  tasks: Task[];
  onClick: () => void;
}) {
  const teamTasks = tasks.filter((t) => t.team_id === team.id);
  const counts = { todo: 0, done: 0 };
  for (const t of teamTasks) {
    const s: Status = t.status === 'done' ? 'done' : 'todo';
    counts[s]++;
  }

  return (
    <button
      onClick={onClick}
      className="bg-white border border-[#e8d5d5] p-6 text-left flex flex-col gap-4 hover:border-[#731515]/40 hover:shadow-sm transition-all duration-200 group"
    >
      {/* Team name + color dot */}
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
        <h3
          className="text-sm font-semibold text-[#1a0505] group-hover:text-[#731515] transition-colors"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {team.name}
        </h3>
      </div>

      {/* Members count */}
      <div className="flex items-center gap-1.5 text-[10px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
        <Users size={11} />
        <span>{team.members.length} member{team.members.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Task counters */}
      <div className="flex gap-2 flex-wrap">
        {teamTasks.length === 0 ? (
          <span className="text-[9px] text-[#7a4a4a]/40 italic" style={{ fontFamily: 'var(--font-nunito)' }}>No tasks</span>
        ) : (
          <>
            {counts.todo > 0 && (
              <span className="text-[9px] tracking-[0.15em] px-2 py-0.5 border border-[#e8d5d5] text-[#7a4a4a]">
                {counts.todo} TO DO
              </span>
            )}
            {counts.done > 0 && (
              <span className="text-[9px] tracking-[0.15em] px-2 py-0.5 border border-green-600/30 bg-green-50 text-green-700">
                {counts.done} DONE
              </span>
            )}
          </>
        )}
      </div>
    </button>
  );
}

/* ── New task form ── */
function NewTaskForm({
  currentEmail,
  members,
  teams,
  defaultTeamId,
  onClose,
  onCreated,
}: {
  currentEmail: string;
  members: TeamMember[];
  teams: Team[];
  defaultTeamId?: string;
  onClose: () => void;
  onCreated: (task: Task) => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, team_id: defaultTeamId ?? '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleAssignee = useCallback((email: string) => {
    setForm((p) => {
      const emails = p.assignee_emails.includes(email)
        ? p.assignee_emails.filter((e) => e !== email)
        : [...p.assignee_emails, email];
      return { ...p, assignee_emails: emails };
    });
  }, []);

  const set = (k: 'title' | 'description' | 'due_date' | 'priority' | 'team_id') => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.assignee_emails.length === 0) { setError('Please select at least one assignee.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:           form.title,
          description:     form.description,
          assignee_emails: form.assignee_emails,
          assigner_email:  currentEmail,
          due_date:        form.due_date,
          priority:        form.priority,
          team_id:         form.team_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      onCreated(data.task);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full bg-[#fdf6f6] border border-[#e8d5d5] text-[#1a0505] px-4 py-3 text-sm placeholder-[#7a4a4a]/40 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200';

  const assigneeLabel =
    form.assignee_emails.length === 0
      ? 'Assign to *'
      : members
          .filter((m) => form.assignee_emails.includes(m.email))
          .map((m) => m.name)
          .join(', ');

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="bg-white border border-[#731515]/30 p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="text-[10px] tracking-[0.4em] text-[#731515]">NEW TASK</div>
        <button onClick={onClose} className="text-[#7a4a4a]/50 hover:text-[#731515] transition-colors">
          <X size={15} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Title */}
        <input
          type="text"
          placeholder="Task title *"
          required
          value={form.title}
          onChange={set('title')}
          className={inputClass}
          style={{ fontFamily: 'var(--font-nunito)' }}
        />

        {/* Description */}
        <textarea
          placeholder="Description (optional)"
          rows={3}
          value={form.description}
          onChange={set('description')}
          className={`${inputClass} resize-none`}
          style={{ fontFamily: 'var(--font-nunito)' }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Assignee multi-select */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className={`${inputClass} text-left flex items-center justify-between gap-2 ${form.assignee_emails.length === 0 ? 'text-[#7a4a4a]/40' : 'text-[#1a0505]'}`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              <span className="truncate">{assigneeLabel}</span>
              <ChevronDown size={12} className="shrink-0 text-[#731515]" />
            </button>

            {dropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-[#e8d5d5] shadow-md max-h-48 overflow-y-auto">
                {members.map((m) => {
                  const checked = form.assignee_emails.includes(m.email);
                  return (
                    <button
                      key={m.email}
                      type="button"
                      onClick={() => toggleAssignee(m.email)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[#fdf6f6] transition-colors text-left"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      <span className={checked ? 'text-[#1a0505] font-medium' : 'text-[#7a4a4a]'}>{m.name}</span>
                      {checked && <Check size={12} className="text-[#731515] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team */}
          <div className="relative">
            <select
              value={form.team_id}
              onChange={set('team_id')}
              className={`${inputClass} appearance-none cursor-pointer`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#731515]" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Priority */}
          <div className="relative">
            <select
              value={form.priority}
              onChange={set('priority')}
              className={`${inputClass} appearance-none cursor-pointer`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#731515]" />
          </div>

          {/* Due date */}
          <input
            type="date"
            value={form.due_date}
            onChange={set('due_date')}
            className={inputClass}
            style={{ fontFamily: 'var(--font-nunito)' }}
          />
        </div>

        {error && (
          <p className="text-xs text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors px-5 py-3 border border-[#e8d5d5] bg-white"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={loading}
            className="text-[10px] tracking-[0.3em] text-white bg-[#731515] hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed transition-colors px-6 py-3"
          >
            {loading ? 'SENDING…' : 'CREATE TASK'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

/* ── Main component ── */
type Filter = 'all' | 'mine' | 'by_me' | 'teams';

export default function TaskBoard({ currentEmail }: { currentEmail: string }) {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter]     = useState<Filter>('all');
  const [token, setToken]       = useState('');
  const [liveConnected, setLiveConnected] = useState(false);
  const [members, setMembers]   = useState<TeamMember[]>(STATIC_ADMINS);
  const [teams, setTeams]       = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null); // for team detail drill-down
  const [teamFilter, setTeamFilter] = useState<string>(''); // '' = no filter, otherwise team id
  // Track IDs we inserted locally to skip duplicate INSERT events from realtime
  const localInsertIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });
  }, []);

  /* ── Load team members via API (bypasses RLS, returns all members) ── */
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
    } catch {/* fall back to static list */}
  }

  /* ── Load teams ── */
  async function loadTeams() {
    try {
      const res = await fetch('/api/teams');
      if (!res.ok) return;
      const json = await res.json();
      console.log('[TaskBoard] teams loaded:', json.teams);
      setTeams(json.teams ?? []);
    } catch (err) {
      console.error('[TaskBoard] loadTeams error:', err);
    }
  }

  useEffect(() => { loadMembers(); loadTeams(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadTasks(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Supabase Realtime ── */
  useEffect(() => {
    if (!token) return;
    supabase.realtime.setAuth(token);
    const channel = supabase
      .channel('tasks_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        loadMembers();
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const t = payload.new as Task;
            if (localInsertIds.current.has(t.id)) {
              localInsertIds.current.delete(t.id);
              return;
            }
            setTasks(prev => prev.some(x => x.id === t.id) ? prev : [t, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const t = payload.new as Task;
            setTasks(prev => prev.map(x => x.id === t.id ? t : x));
          } else if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id: string }).id;
            setTasks(prev => prev.filter(x => x.id !== id));
          }
        },
      )
      .subscribe((status) => {
        setLiveConnected(status === 'SUBSCRIBED');
      });
    return () => { supabase.removeChannel(channel); };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: Status) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return;
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function handleCreated(task: Task) {
    localInsertIds.current.add(task.id);
    setTasks((prev) => [task, ...prev]);
  }

  function taskAssignedToMe(t: Task) {
    return (t.assignee_emails?.includes(currentEmail)) || t.assignee_email === currentEmail;
  }

  // Board-view filtered tasks (not teams view)
  const filtered = tasks.filter((t) => {
    if (filter === 'mine')   { if (!taskAssignedToMe(t)) return false; }
    if (filter === 'by_me')  { if (t.assigner_email !== currentEmail) return false; }
    if (teamFilter)          { if (t.team_id !== teamFilter) return false; }
    return true;
  });

  const FILTER_TABS: { id: Filter; label: string }[] = [
    { id: 'all',   label: 'ALL' },
    { id: 'mine',  label: 'ASSIGNED TO ME' },
    { id: 'by_me', label: 'ASSIGNED BY ME' },
    { id: 'teams', label: 'TEAMS' },
  ];

  /* ── Team detail view ── */
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;
  const teamDetailTasks = selectedTeam ? tasks.filter((t) => t.team_id === selectedTeam.id) : [];

  if (filter === 'teams' && selectedTeam) {
    const teamCounts = { todo: 0, done: 0 };
    for (const t of teamDetailTasks) {
      const s: Status = t.status === 'done' ? 'done' : 'todo';
      teamCounts[s]++;
    }

    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedTeamId(null)}
              className="text-[#7a4a4a]/50 hover:text-[#731515] transition-colors"
              aria-label="Back to teams"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedTeam.color }} />
            <h2 className="text-[10px] tracking-[0.4em] text-[#1a0505]">{selectedTeam.name.toUpperCase()}</h2>
            {liveConnected && (
              <span className="flex items-center gap-1 text-[8px] tracking-[0.2em] text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 text-[9px] tracking-[0.3em] text-white bg-[#731515] hover:bg-[#aa4848] transition-colors px-4 py-2.5 self-start sm:self-auto"
          >
            <Plus size={12} />
            NEW TASK
          </button>
        </div>

        {/* Members row */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[9px] tracking-[0.2em] text-[#7a4a4a]/50">MEMBERS</span>
          {selectedTeam.members.map((email) => (
            <div
              key={email}
              title={email}
              className="flex items-center gap-1.5 text-[10px] text-[#7a4a4a]"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-semibold text-white shrink-0"
                style={{ backgroundColor: selectedTeam.color }}
              >
                {initials(email, members)}
              </div>
              <span>{memberName(email, members)}</span>
            </div>
          ))}
        </div>

        {/* Task counters */}
        <div className="flex gap-3 flex-wrap">
          <span className="text-[9px] tracking-[0.15em] px-3 py-1.5 border border-[#e8d5d5] text-[#7a4a4a]">
            {teamCounts.todo} TO DO
          </span>
          <span className="text-[9px] tracking-[0.15em] px-3 py-1.5 border border-green-600/30 bg-green-50 text-green-700">
            {teamCounts.done} DONE
          </span>
        </div>

        {/* New task form */}
        <AnimatePresence>
          {showForm && (
            <NewTaskForm
              currentEmail={currentEmail}
              members={members}
              teams={teams}
              defaultTeamId={selectedTeam.id}
              onClose={() => setShowForm(false)}
              onCreated={handleCreated}
            />
          )}
        </AnimatePresence>

        {/* Kanban */}
        {loading ? (
          <div className="py-10 text-center text-xs text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
            Loading tasks…
          </div>
        ) : (
          <KanbanBoard
            tasks={teamDetailTasks}
            currentEmail={currentEmail}
            members={members}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        )}
      </div>
    );
  }

  /* ── Teams grid view ── */
  if (filter === 'teams') {
    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#fde8e8] flex items-center justify-center shrink-0">
              <ClipboardList size={15} className="text-[#731515]" />
            </div>
            <h2 className="text-[10px] tracking-[0.4em] text-[#1a0505]">TASK BOARD</h2>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-[#e8d5d5]">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setFilter(tab.id); if (tab.id !== 'teams') setSelectedTeamId(null); }}
              className={`text-[9px] tracking-[0.2em] px-4 py-2.5 transition-colors duration-200 border-b-2 -mb-px ${
                filter === tab.id
                  ? 'border-[#731515] text-[#731515]'
                  : 'border-transparent text-[#7a4a4a]/50 hover:text-[#7a4a4a]'
              }`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Teams grid */}
        {teams.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-xs text-[#7a4a4a]/50 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
              No teams found.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                tasks={tasks}
                onClick={() => setSelectedTeamId(team.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Default board view ── */
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#fde8e8] flex items-center justify-center shrink-0">
            <ClipboardList size={15} className="text-[#731515]" />
          </div>
          <h2 className="text-[10px] tracking-[0.4em] text-[#1a0505]">TASK BOARD</h2>
          {liveConnected && (
            <span className="flex items-center gap-1 text-[8px] tracking-[0.2em] text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 text-[9px] tracking-[0.3em] text-white bg-[#731515] hover:bg-[#aa4848] transition-colors px-4 py-2.5 self-start sm:self-auto"
        >
          <Plus size={12} />
          NEW TASK
        </button>
      </div>

      {/* Filter tabs + team filter */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-1 border-b border-[#e8d5d5]">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setFilter(tab.id); if (tab.id !== 'teams') setSelectedTeamId(null); }}
              className={`text-[9px] tracking-[0.2em] px-4 py-2.5 transition-colors duration-200 border-b-2 -mb-px ${
                filter === tab.id
                  ? 'border-[#731515] text-[#731515]'
                  : 'border-transparent text-[#7a4a4a]/50 hover:text-[#7a4a4a]'
              }`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {tab.label}
              {tab.id !== 'all' && tab.id !== 'teams' && (
                <span className="ml-1.5 text-[8px] opacity-60">
                  ({tab.id === 'mine'
                    ? tasks.filter(taskAssignedToMe).length
                    : tasks.filter((t) => t.assigner_email === currentEmail).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Team filter dropdown (only when in board view) */}
        {teams.length > 0 && (
          <div className="flex items-center gap-2">
            <Users size={11} className="text-[#7a4a4a]/50 shrink-0" />
            <div className="relative">
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="bg-transparent border border-[#e8d5d5] text-[#7a4a4a] text-[10px] tracking-[0.1em] px-3 py-1.5 pr-7 focus:outline-none focus:border-[#731515]/50 appearance-none cursor-pointer"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                <option value="">All teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown size={10} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#731515]" />
            </div>
          </div>
        )}
      </div>

      {/* New task form */}
      <AnimatePresence>
        {showForm && (
          <NewTaskForm
            currentEmail={currentEmail}
            members={members}
            teams={teams}
            defaultTeamId={teamFilter || undefined}
            onClose={() => setShowForm(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>

      {/* Task list */}
      {loading ? (
        <div className="py-10 text-center text-xs text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
          Loading tasks…
        </div>
      ) : (
        <KanbanBoard
          tasks={filtered}
          currentEmail={currentEmail}
          members={members}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
