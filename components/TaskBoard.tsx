'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar as CalendarIcon, Check, ListTodo, Pencil, Trash2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOverlayBackClose } from '@/lib/useMobileOverlay';
import {
  ActionButton,
  EmptyState,
  Field,
  NewButton,
  PageHead,
  Select,
  Sheet,
  TextArea,
  TextInput,
} from '@/components/admin/ui';
import {
  Calendar,
  longDay,
  parseYmd,
  relativeDay,
  ymd,
  type CalendarItem,
} from '@/components/admin/Calendar';

/**
 * Tasks.
 *
 * The old board sorted by priority: every HIGH in the club, from any
 * team, in one column, each row shouting a red HIGH badge. That tells
 * you what somebody once felt was important. It does not tell you what
 * to do this morning.
 *
 * So this one sorts by *when* — in ritardo, oggi, domani, this week,
 * later — and opens on the tasks assigned to you. Priority still
 * exists and still goes to the API unchanged, but only `high` earns a
 * mark on the row: a list where every row is badged has no emphasis at
 * all.
 */

interface TeamMember {
  name: string;
  email: string;
}

interface Team {
  id: string;
  name: string;
  color: string;
  description: string | null;
  members: string[];
}

type Priority = 'high' | 'medium' | 'low';
type Status = 'todo' | 'done';

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

/* ─────────────────────────────────────────────
   Members
   `app/members/page.tsx` imports `isAdmin` from here, so both the
   list and the helper keep the same shape they had.
───────────────────────────────────────────── */
const STATIC_ADMINS = [
  { name: 'Cris', email: 'cristianomichelotti@gmail.com' },
  { name: 'Pippo', email: 'filippo.lombardi890@gmail.com' },
  { name: 'Jack', email: 'giacomogallo1310@gmail.com' },
  { name: 'Lorenzo', email: 'lorenzofioretti2001@gmail.com' },
  { name: 'Francesco', email: 'francesco.basile@luniversotuo.it' },
];

export const ADMINS = STATIC_ADMINS;
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
  const name = memberName(email, members).trim();
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function assigneesOf(t: Task) {
  return t.assignee_emails?.length ? t.assignee_emails : t.assignee_email ? [t.assignee_email] : [];
}

/* ─────────────────────────────────────────────
   Time buckets — the spine of the list
───────────────────────────────────────────── */
type Bucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'undated';

const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: 'In ritardo',
  today: 'Oggi',
  tomorrow: 'Domani',
  week: 'Questa settimana',
  later: 'Più avanti',
  undated: 'Senza data',
};

const BUCKET_ORDER: Bucket[] = ['overdue', 'today', 'tomorrow', 'week', 'later', 'undated'];

function bucketOf(due: string | null, today: string): Bucket {
  if (!due) return 'undated';
  const d = due.slice(0, 10);
  if (d < today) return 'overdue';
  if (d === today) return 'today';
  const diff = Math.round((parseYmd(d).getTime() - parseYmd(today).getTime()) / 86400000);
  if (diff === 1) return 'tomorrow';
  if (diff <= 7) return 'week';
  return 'later';
}

const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'Alta',
  medium: 'Normale',
  low: 'Bassa',
};

/* ─────────────────────────────────────────────
   One row
───────────────────────────────────────────── */
function TaskRow({
  task,
  teams,
  members,
  today,
  onToggle,
  onOpen,
}: {
  task: Task;
  teams: Team[];
  members: TeamMember[];
  today: string;
  onToggle: (t: Task) => void;
  onOpen: (t: Task) => void;
}) {
  const done = task.status === 'done';
  const team = teams.find((t) => t.id === task.team_id);
  const overdue = !done && !!task.due_date && task.due_date.slice(0, 10) < today;
  const people = assigneesOf(task);

  return (
    <div className="flex items-stretch rounded-2xl border border-rule-paper transition-colors hover:border-accent/35">
      {/* The circle is its own 52px target, because completing a task is
          the thing you do most and it must never open the detail. */}
      <button
        onClick={() => onToggle(task)}
        aria-label={done ? 'Segna da fare' : 'Segna completata'}
        aria-pressed={done}
        className="grid w-[52px] shrink-0 place-items-center rounded-l-2xl"
      >
        <span
          className={`grid h-[26px] w-[26px] place-items-center rounded-full border-2 transition-colors ${
            done ? 'border-accent bg-accent text-paper' : 'border-rule-paper'
          }`}
        >
          {done && <Check size={15} strokeWidth={3} />}
        </span>
      </button>

      <button onClick={() => onOpen(task)} className="min-w-0 flex-1 py-3 pr-3 text-left">
        <span className="flex items-start gap-2">
          {task.priority === 'high' && !done && (
            <span
              aria-label="Priorità alta"
              className="mt-[9px] h-[7px] w-[7px] shrink-0 rounded-full bg-accent"
            />
          )}
          <span className={`min-w-0 text-body ${done ? 'line-through opacity-50' : ''}`}>
            {task.title}
          </span>
        </span>

        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-fine text-on-paper-muted">
          {task.due_date && (
            <span className={overdue ? 'font-medium text-accent' : ''}>
              {relativeDay(task.due_date.slice(0, 10), today)}
            </span>
          )}
          {team && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
              {team.name}
            </span>
          )}
          {people.length > 0 && (
            <span className="inline-flex items-center gap-1">
              {people.slice(0, 3).map((e) => (
                <span
                  key={e}
                  title={memberName(e, members)}
                  className="grid h-[22px] w-[22px] place-items-center rounded-full bg-paper-soft text-[10px] font-medium text-on-paper"
                >
                  {initials(e, members)}
                </span>
              ))}
              {people.length > 3 && <span>+{people.length - 3}</span>}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Task detail — replaces the row of cramped icon buttons
───────────────────────────────────────────── */
function TaskDetail({
  task,
  teams,
  members,
  onClose,
  onEdit,
  onDelete,
  onToggle,
}: {
  task: Task | null;
  teams: Team[];
  members: TeamMember[];
  onClose: () => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onToggle: (t: Task) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  useOverlayBackClose(!!task, onClose);

  if (!task) return null;
  const done = task.status === 'done';
  const team = teams.find((t) => t.id === task.team_id);
  const confirming = confirmId === task.id;

  return (
    <Sheet
      open
      title="Task"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2.5">
          <ActionButton onClick={() => onToggle(task)} className="flex-1">
            <Check size={17} strokeWidth={2} />
            {done ? 'Riapri' : 'Completata'}
          </ActionButton>
          <ActionButton variant="quiet" onClick={() => onEdit(task)}>
            <Pencil size={16} strokeWidth={1.8} />
            Modifica
          </ActionButton>
          <ActionButton
            variant="danger"
            onClick={() => (confirming ? onDelete(task) : setConfirmId(task.id))}
          >
            <Trash2 size={16} strokeWidth={1.8} />
            {confirming ? 'Confermi?' : 'Elimina'}
          </ActionButton>
        </div>
      }
    >
      <h3 className="ds-display text-[22px] leading-tight tracking-[-0.02em]">{task.title}</h3>

      {task.description && (
        <p className="mt-3 whitespace-pre-wrap text-body text-on-paper-muted">{task.description}</p>
      )}

      <dl className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-rule-paper bg-rule-paper">
        {[
          { k: 'Scadenza', v: task.due_date ? longDay(task.due_date.slice(0, 10)) : 'Nessuna' },
          { k: 'Team', v: team?.name ?? 'Nessuno' },
          { k: 'Priorità', v: PRIORITY_LABEL[task.priority] },
          {
            k: 'Assegnata a',
            v: assigneesOf(task).map((e) => memberName(e, members)).join(', ') || '—',
          },
          { k: 'Assegnata da', v: memberName(task.assigner_email, members) },
        ].map((r) => (
          <div key={r.k} className="flex flex-wrap gap-x-4 gap-y-1 bg-paper px-4 py-3">
            <dt className="min-w-[110px] text-fine text-on-paper-muted">{r.k}</dt>
            <dd className="text-body">{r.v}</dd>
          </div>
        ))}
      </dl>
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   New / edit task
───────────────────────────────────────────── */
const EMPTY_FORM = {
  title: '',
  description: '',
  assignee_emails: [] as string[],
  due_date: '',
  priority: 'medium' as Priority,
  team_id: '',
};

function TaskForm({
  currentEmail,
  members,
  teams,
  editTarget,
  defaultDate,
  onClose,
  onCreated,
  onUpdated,
}: {
  currentEmail: string;
  members: TeamMember[];
  teams: Team[];
  editTarget?: Task | null;
  defaultDate?: string;
  onClose: () => void;
  onCreated: (t: Task) => void;
  onUpdated: (t: Task) => void;
}) {
  const isEdit = !!editTarget;
  const [form, setForm] = useState(() =>
    editTarget
      ? {
          title: editTarget.title,
          description: editTarget.description ?? '',
          assignee_emails: assigneesOf(editTarget),
          due_date: editTarget.due_date?.slice(0, 10) ?? '',
          priority: editTarget.priority,
          team_id: editTarget.team_id ?? '',
        }
      : { ...EMPTY_FORM, due_date: defaultDate ?? '' },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  /**
   * Picking the team narrows who you can assign to — which is most of
   * the reason teams exist. Anyone already picked who is not on the new
   * team is dropped, so a task can't end up assigned outside it.
   *
   * A team with no roster yet falls back to everyone, otherwise the
   * picker would be empty and the form unusable.
   */
  const team = teams.find((t) => t.id === form.team_id);
  const assignable = useMemo(() => {
    if (!team || team.members.length === 0) return members;
    const inTeam = members.filter((m) => team.members.includes(m.email));
    return inTeam.length ? inTeam : members;
  }, [team, members]);

  function pickTeam(id: string) {
    const next = teams.find((t) => t.id === id);
    setForm((p) => ({
      ...p,
      team_id: id,
      assignee_emails:
        next && next.members.length
          ? p.assignee_emails.filter((e) => next.members.includes(e))
          : p.assignee_emails,
    }));
  }

  function toggleAssignee(email: string) {
    setForm((p) => ({
      ...p,
      assignee_emails: p.assignee_emails.includes(email)
        ? p.assignee_emails.filter((e) => e !== email)
        : [...p.assignee_emails, email],
    }));
  }

  async function submit() {
    if (!form.title.trim()) {
      setError('Serve un titolo.');
      return;
    }
    if (form.assignee_emails.length === 0) {
      setError('Scegli almeno una persona.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      // The payload is what the old form sent, field for field: the API
      // validates the assigner and the assignees, and nothing here
      // changes that contract.
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        assignee_emails: form.assignee_emails,
        due_date: form.due_date || null,
        priority: form.priority,
        team_id: form.team_id || null,
      };
      const res = await fetch(isEdit ? `/api/tasks/${editTarget!.id}` : '/api/tasks', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? payload : { ...payload, assigner_email: currentEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore.');
      if (isEdit) onUpdated({ ...editTarget!, ...(data.task ?? data) });
      else onCreated(data.task);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open
      title={isEdit ? 'Modifica task' : 'Nuova task'}
      onClose={onClose}
      footer={
        <div className="flex gap-2.5">
          <ActionButton variant="quiet" onClick={onClose} className="flex-1">
            Annulla
          </ActionButton>
          <ActionButton onClick={submit} disabled={saving} className="flex-[2]">
            {saving ? 'Salvo…' : isEdit ? 'Salva' : 'Crea task'}
          </ActionButton>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* The title first and alone: most tasks get written in a hurry,
            and everything below has a sensible default. */}
        <TextInput
          autoFocus
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Cosa va fatto?"
          className="!py-4 !text-[19px]"
        />

        <Field label="Team">
          <Select value={form.team_id} onChange={(e) => pickTeam(e.target.value)}>
            <option value="">Nessun team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Assegna a" hint={team ? `— ${team.name}` : undefined}>
          <div className="flex flex-wrap gap-2">
            {assignable.map((m) => {
              const on = form.assignee_emails.includes(m.email);
              return (
                <button
                  key={m.email}
                  type="button"
                  onClick={() => toggleAssignee(m.email)}
                  aria-pressed={on}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 text-fine font-medium transition-colors ${
                    on
                      ? 'border-accent bg-accent text-paper'
                      : 'border-rule-paper text-on-paper hover:border-accent/40'
                  }`}
                >
                  <span
                    className={`grid h-[22px] w-[22px] place-items-center rounded-full text-[10px] ${
                      on ? 'bg-paper/25' : 'bg-paper-soft'
                    }`}
                  >
                    {initials(m.email, members)}
                  </span>
                  {m.name}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Scadenza" hint="— opzionale">
            <TextInput
              type="date"
              value={form.due_date}
              onChange={(e) => set('due_date', e.target.value)}
            />
          </Field>

          <Field label="Priorità">
            <div className="flex rounded-2xl border border-rule-paper p-1">
              {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set('priority', p)}
                  aria-pressed={form.priority === p}
                  className={`min-h-[44px] flex-1 rounded-xl text-fine font-medium transition-colors ${
                    form.priority === p ? 'bg-accent text-paper' : 'text-on-paper-muted'
                  }`}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field label="Dettagli" hint="— opzionale">
          <TextArea
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Contesto, link, cosa serve per chiuderla…"
          />
        </Field>

        {error && <p className="text-fine font-medium text-accent">{error}</p>}
      </div>
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   Board
───────────────────────────────────────────── */
export default function TaskBoard({ currentEmail }: { currentEmail: string }) {
  const today = ymd(new Date());

  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [ped, setPed] = useState<PedEntry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>(STATIC_ADMINS);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<'list' | 'calendar'>('list');
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [teamFilter, setTeamFilter] = useState('');
  const [doneOpen, setDoneOpen] = useState(false);

  const [detail, setDetail] = useState<Task | null>(null);
  const [formFor, setFormFor] = useState<{ edit?: Task | null; date?: string } | null>(null);

  const [token, setToken] = useState('');
  const localInsertIds = useRef<Set<string>>(new Set());

  // Called here rather than inside the sheet: the hook pushes a history
  // entry when `active` turns true and pops it on cleanup, and under
  // StrictMode a component that mounts with `active` already true gets
  // its effect run, cleaned up and run again — the pop from that
  // cleanup fires `popstate` and closes the sheet the instant it opens.
  useOverlayBackClose(!!formFor, () => setFormFor(null));

  /* ── Load ── */
  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch {
      /* silent */
    }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/team/members', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.members?.length > 0) setMembers(json.members as TeamMember[]);
    } catch {
      /* fall back to the static list */
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });

    (async () => {
      setLoading(true);
      await Promise.all([
        loadTasks(),
        loadMembers(),
        fetch('/api/teams')
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => j && setTeams(j.teams ?? []))
          .catch(() => {}),
        fetch('/api/events/all')
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => Array.isArray(j?.events) && setEvents(j.events))
          .catch(() => {}),
        fetch('/api/ped/all')
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => Array.isArray(j?.entries) && setPed(j.entries))
          .catch(() => {}),
      ]);
      setLoading(false);
    })();
  }, [loadTasks, loadMembers]);

  /* ── Realtime ── */
  useEffect(() => {
    if (!token) return;
    supabase.realtime.setAuth(token);
    const channel = supabase
      .channel('tasks_realtime_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        loadMembers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const t = payload.new as Task;
          if (localInsertIds.current.has(t.id)) {
            localInsertIds.current.delete(t.id);
            return;
          }
          setTasks((prev) => (prev.some((x) => x.id === t.id) ? prev : [t, ...prev]));
        } else if (payload.eventType === 'UPDATE') {
          const t = payload.new as Task;
          setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
        } else if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id: string }).id;
          setTasks((prev) => prev.filter((x) => x.id !== id));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [token, loadMembers]);

  /* ── Mutations ── */
  const toggle = useCallback(async (task: Task) => {
    const status: Status = task.status === 'done' ? 'todo' : 'done';
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    setDetail((d) => (d && d.id === task.id ? { ...d, status } : d));
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      // Put it back: a checkbox that lies is worse than one that is slow.
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      setDetail((d) => (d && d.id === task.id ? { ...d, status: task.status } : d));
    }
  }, []);

  const remove = useCallback(async (task: Task) => {
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setDetail(null);
    }
  }, []);

  /* ── Filtering ── */
  const mineCount = useMemo(
    () => tasks.filter((t) => t.status !== 'done' && assigneesOf(t).includes(currentEmail)).length,
    [tasks, currentEmail],
  );

  // Opening on "Le mie" is only kind if you have any; otherwise it is an
  // empty screen that reads as broken.
  const scopeSettled = useRef(false);
  useEffect(() => {
    if (loading || scopeSettled.current) return;
    scopeSettled.current = true;
    if (mineCount === 0) setScope('all');
  }, [loading, mineCount]);

  const visible = useMemo(
    () =>
      tasks.filter((t) => {
        if (teamFilter && t.team_id !== teamFilter) return false;
        if (scope === 'mine' && !assigneesOf(t).includes(currentEmail)) return false;
        return true;
      }),
    [tasks, teamFilter, scope, currentEmail],
  );

  const open = useMemo(() => visible.filter((t) => t.status !== 'done'), [visible]);
  const done = useMemo(
    () =>
      visible
        .filter((t) => t.status === 'done')
        .sort((a, b) => (b.due_date ?? b.created_at).localeCompare(a.due_date ?? a.created_at)),
    [visible],
  );

  /** Open tasks in time buckets, each sorted by date then priority. */
  const buckets = useMemo(() => {
    const map: Partial<Record<Bucket, Task[]>> = {};
    for (const t of open) {
      const b = bucketOf(t.due_date, today);
      (map[b] ??= []).push(t);
    }
    const rank = { high: 0, medium: 1, low: 2 };
    for (const list of Object.values(map)) {
      list!.sort((a, b) => {
        if (a.due_date && b.due_date && a.due_date !== b.due_date)
          return a.due_date.localeCompare(b.due_date);
        return rank[a.priority] - rank[b.priority];
      });
    }
    return BUCKET_ORDER.filter((b) => map[b]?.length).map((b) => ({ bucket: b, list: map[b]! }));
  }, [open, today]);

  /* ── Calendar feed ── */
  const calendarItems = useMemo<CalendarItem[]>(() => {
    const out: CalendarItem[] = [];

    for (const t of visible) {
      if (!t.due_date) continue;
      const team = teams.find((x) => x.id === t.team_id);
      out.push({
        id: `task-${t.id}`,
        date: t.due_date.slice(0, 10),
        title: t.title,
        source: 'tasks',
        detail:
          [team?.name, assigneesOf(t).map((e) => memberName(e, members)).join(', ')]
            .filter(Boolean)
            .join(' · ') || null,
        tint: team?.color ?? null,
        done: t.status === 'done',
      });
    }

    for (const e of events) {
      if (!e.date) continue;
      out.push({
        id: `event-${e.id}`,
        date: e.date.slice(0, 10),
        time: e.time,
        title: e.title,
        source: 'events',
        detail: e.location ?? null,
      });
    }

    for (const p of ped) {
      out.push({
        id: `ped-${p.id}`,
        date: p.date.slice(0, 10),
        title: p.title,
        source: 'content',
        detail: [p.platform, p.content_type].filter(Boolean).join(' · ') || null,
        done: p.status === 'published',
      });
    }

    return out;
  }, [visible, events, ped, teams, members]);

  /* ── Render ── */
  return (
    <div>
      <PageHead
        title="Task"
        subtitle="Cosa deve fare il team, in ordine di quando va fatto."
        action={<NewButton label="Nuova task" onClick={() => setFormFor({})} />}
      />

      {/* Elenco / calendario */}
      <div className="mb-5 flex rounded-full border border-rule-paper p-1 lg:w-fit">
        {(
          [
            { id: 'list', label: 'Elenco', Icon: ListTodo },
            { id: 'calendar', label: 'Calendario', Icon: CalendarIcon },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-full text-fine font-medium transition-colors lg:flex-none lg:px-8 ${
              tab === t.id ? 'bg-accent text-paper' : 'text-on-paper-muted hover:text-on-paper'
            }`}
          >
            <t.Icon size={16} strokeWidth={1.8} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Mine / everyone */}
      <div className="mb-3 flex rounded-full border border-rule-paper p-1 lg:w-fit">
        {(
          [
            { id: 'mine', label: `Le mie${mineCount ? ` · ${mineCount}` : ''}` },
            { id: 'all', label: 'Tutto il team' },
          ] as const
        ).map((s) => (
          <button
            key={s.id}
            onClick={() => setScope(s.id)}
            aria-pressed={scope === s.id}
            className={`min-h-[44px] flex-1 rounded-full px-4 text-fine font-medium transition-colors lg:flex-none lg:px-7 ${
              scope === s.id ? 'bg-paper-soft text-on-paper' : 'text-on-paper-muted'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Teams. Scrolls sideways on a phone rather than wrapping into
          four rows that push the list off the screen. */}
      {teams.length > 0 && (
        <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setTeamFilter('')}
            aria-pressed={!teamFilter}
            className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-3.5 text-fine font-medium transition-colors ${
              !teamFilter ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
            }`}
          >
            <Users size={14} strokeWidth={1.8} />
            Tutti
          </button>
          {teams.map((t) => {
            const on = teamFilter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTeamFilter(on ? '' : t.id)}
                aria-pressed={on}
                className="inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-3.5 text-fine font-medium transition-colors"
                style={{
                  backgroundColor: on ? t.color : 'transparent',
                  borderColor: on ? t.color : 'var(--color-rule-paper)',
                  color: on ? '#FDFBFA' : 'var(--color-on-paper)',
                }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: on ? '#FDFBFA' : t.color }}
                />
                {t.name}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : tab === 'calendar' ? (
        <Calendar
          items={calendarItems}
          sources={[
            { key: 'tasks', label: 'Task', color: '#731515' },
            { key: 'events', label: 'Eventi', color: '#A3561A' },
            { key: 'content', label: 'Contenuti', color: '#5B3A8C' },
          ]}
          onItemClick={(item) => {
            if (!item.id.startsWith('task-')) return;
            const t = tasks.find((x) => `task-${x.id}` === item.id);
            if (t) setDetail(t);
          }}
          onDayAdd={(date) => setFormFor({ date })}
          addLabel="Task"
          emptyDayLabel="Nessuna scadenza, nessun evento."
        />
      ) : (
        <div className="flex flex-col gap-7">
          {buckets.length === 0 && done.length === 0 && (
            <EmptyState
              title={scope === 'mine' ? 'Non hai task aperte' : 'Nessuna task aperta'}
              body={
                scope === 'mine'
                  ? 'Niente assegnato a te in questo momento. Passa a "Tutto il team" per vedere il resto.'
                  : 'Quando ne crei una compare qui, raggruppata per quando scade.'
              }
              action={<NewButton label="Nuova task" onClick={() => setFormFor({})} />}
            />
          )}

          {buckets.map(({ bucket, list }) => (
            <section key={bucket}>
              <h3
                className={`mb-2.5 flex items-baseline gap-2 text-subtitle font-medium ${
                  bucket === 'overdue' ? 'text-accent' : ''
                }`}
              >
                {BUCKET_LABEL[bucket]}
                <span className="text-fine font-normal text-on-paper-muted">{list.length}</span>
              </h3>
              <div className="flex flex-col gap-1.5">
                {list.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    teams={teams}
                    members={members}
                    today={today}
                    onToggle={toggle}
                    onOpen={setDetail}
                  />
                ))}
              </div>
            </section>
          ))}

          {done.length > 0 && (
            <section>
              <button
                onClick={() => setDoneOpen((v) => !v)}
                aria-expanded={doneOpen}
                className="flex min-h-[48px] w-full items-baseline gap-2 text-left text-subtitle font-medium"
              >
                Completate
                <span className="text-fine font-normal text-on-paper-muted">{done.length}</span>
                <span className="ml-auto text-fine font-normal text-on-paper-muted">
                  {doneOpen ? 'Nascondi' : 'Mostra'}
                </span>
              </button>
              {doneOpen && (
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {done.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      teams={teams}
                      members={members}
                      today={today}
                      onToggle={toggle}
                      onOpen={setDetail}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <TaskDetail
        task={detail}
        teams={teams}
        members={members}
        onClose={() => setDetail(null)}
        onEdit={(t) => {
          setDetail(null);
          setFormFor({ edit: t });
        }}
        onDelete={remove}
        onToggle={toggle}
      />

      {formFor && (
        <TaskForm
          currentEmail={currentEmail}
          members={members}
          teams={teams}
          editTarget={formFor.edit}
          defaultDate={formFor.date}
          onClose={() => setFormFor(null)}
          onCreated={(t) => {
            localInsertIds.current.add(t.id);
            setTasks((prev) => [t, ...prev]);
          }}
          onUpdated={(t) => setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)))}
        />
      )}
    </div>
  );
}
