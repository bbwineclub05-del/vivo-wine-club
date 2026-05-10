'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ChevronDown, Trash2, ClipboardList } from 'lucide-react';

/* ── Constants ── */
export const ADMINS = [
  { name: 'Cris',  email: 'cristianomichelotti@gmail.com' },
  { name: 'Pippo', email: 'filippo.lombardi890@gmail.com' },
  { name: 'Jack',  email: 'giacomogallo1310@gmail.com'    },
  { name: 'Ricky', email: 'riccardo.consalvo@icloud.com'  },
];

export function isAdmin(email: string) {
  return ADMINS.some((a) => a.email === email);
}

function adminName(email: string) {
  return ADMINS.find((a) => a.email === email)?.name ?? email.split('@')[0];
}

/* ── Types ── */
type Priority = 'high' | 'medium' | 'low';
type Status   = 'todo' | 'in_progress' | 'done';

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_email: string;
  assigner_email: string;
  due_date: string | null;
  priority: Priority;
  status: Status;
  created_at: string;
}

/* ── Helpers ── */
const PRIORITY_STYLES: Record<Priority, string> = {
  high:   'bg-[#731515] text-white',
  medium: 'bg-[#7a4a4a]/15 text-[#7a4a4a]',
  low:    'bg-[#e8d5d5] text-[#7a4a4a]/70',
};

const STATUS_STYLES: Record<Status, string> = {
  todo:        'border border-[#e8d5d5] text-[#7a4a4a]',
  in_progress: 'border border-[#731515]/40 bg-[#731515]/8 text-[#731515]',
  done:        'border border-green-600/30 bg-green-50 text-green-700',
};

const STATUS_LABELS: Record<Status, string> = {
  todo:        'TO DO',
  in_progress: 'IN PROGRESS',
  done:        'DONE',
};

const STATUS_ORDER: Status[] = ['todo', 'in_progress', 'done'];

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
const EMPTY_FORM = { title: '', description: '', assignee_email: '', due_date: '', priority: 'medium' as Priority };

/* ── Task card ── */
function TaskCard({
  task,
  currentEmail,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  currentEmail: string;
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
  const isAssignedToMe = task.assignee_email === currentEmail;
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
          <span className="text-[#731515]">{adminName(task.assigner_email)}</span>
          {' → '}
          <span className={isAssignedToMe ? 'font-semibold text-[#1a0505]' : ''}>
            {adminName(task.assignee_email)}
          </span>
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

/* ── New task form ── */
function NewTaskForm({
  currentEmail,
  onClose,
  onCreated,
}: {
  currentEmail: string;
  onClose: () => void;
  onCreated: (task: Task) => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, assigner_email: currentEmail }),
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Assignee */}
          <div className="relative">
            <select
              required
              value={form.assignee_email}
              onChange={set('assignee_email')}
              className={`${inputClass} appearance-none cursor-pointer ${form.assignee_email === '' ? 'text-[#7a4a4a]/40' : ''}`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              <option value="" disabled>Assign to *</option>
              {ADMINS.map((a) => (
                <option key={a.email} value={a.email} className="bg-white text-[#1a0505]">
                  {a.name}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#731515]" />
          </div>

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
            className="text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors px-5 py-3 border border-[#e8d5d5]"
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
type Filter = 'all' | 'mine' | 'by_me';

export default function TaskBoard({ currentEmail }: { currentEmail: string }) {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter]     = useState<Filter>('all');

  useEffect(() => { loadTasks(); }, []);

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
    setTasks((prev) => [task, ...prev]);
  }

  const filtered = tasks.filter((t) => {
    if (filter === 'mine')   return t.assignee_email === currentEmail;
    if (filter === 'by_me')  return t.assigner_email === currentEmail;
    return true;
  });

  // Group by status for display
  const groups: Record<Status, Task[]> = { todo: [], in_progress: [], done: [] };
  for (const t of filtered) groups[t.status].push(t);

  const FILTER_TABS: { id: Filter; label: string }[] = [
    { id: 'all',   label: 'ALL' },
    { id: 'mine',  label: 'ASSIGNED TO ME' },
    { id: 'by_me', label: 'ASSIGNED BY ME' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#731515]/8 flex items-center justify-center shrink-0">
            <ClipboardList size={15} className="text-[#731515]" />
          </div>
          <h2 className="text-[10px] tracking-[0.4em] text-[#1a0505]">TASK BOARD</h2>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 text-[9px] tracking-[0.3em] text-white bg-[#731515] hover:bg-[#aa4848] transition-colors px-4 py-2.5 self-start sm:self-auto"
        >
          <Plus size={12} />
          NEW TASK
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-[#e8d5d5]">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`text-[9px] tracking-[0.2em] px-4 py-2.5 transition-colors duration-200 border-b-2 -mb-px ${
              filter === tab.id
                ? 'border-[#731515] text-[#731515]'
                : 'border-transparent text-[#7a4a4a]/50 hover:text-[#7a4a4a]'
            }`}
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {tab.label}
            {tab.id !== 'all' && (
              <span className="ml-1.5 text-[8px] opacity-60">
                ({tab.id === 'mine'
                  ? tasks.filter((t) => t.assignee_email === currentEmail).length
                  : tasks.filter((t) => t.assigner_email === currentEmail).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* New task form */}
      <AnimatePresence>
        {showForm && (
          <NewTaskForm
            currentEmail={currentEmail}
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
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-xs text-[#7a4a4a]/50 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
            No tasks yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="flex flex-col gap-2">
              {/* Column header */}
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
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
