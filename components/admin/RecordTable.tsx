'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  Clock,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOverlayBackClose } from '@/lib/useMobileOverlay';
import {
  ActionButton,
  EmptyState,
  Field,
  PageHead,
  Select,
  Sheet,
  TextArea,
  TextInput,
} from '@/components/admin/ui';
import { STAGES, STAGE_LABEL, isDue, todayISO, type Record_, type Stage } from '@/lib/crm';

/**
 * La rubrica, una per tutte.
 *
 * Sponsor, cantine, produttori di Bordeaux e influencer erano quattro
 * componenti da ventimila byte l'uno che facevano la stessa cosa in
 * quattro modi diversi — e nessuno dei quattro rispondeva alla domanda
 * per cui esiste un CRM: *a chi devo ancora dare retta.*
 *
 * Qui la struttura è quella dei CRM veri. Ogni riga è un rapporto, non
 * un indirizzo: ha uno stato (da contattare, contattato, in trattativa,
 * attivo, chiuso), qualcuno del team che se ne occupa, e una data in cui
 * va ripresa in mano. Il primo filtro è "Da fare", perché è l'unica
 * cosa che si guarda davvero al mattino.
 *
 * Su un telefono è un elenco di schede, su un computer una tabella
 * ordinabile. Lo stesso componente: cambia solo quanto spazio c'è.
 */

export interface ColumnDef<T> {
  key: string;
  label: string;
  value: (r: T) => string;
  /** Su desktop occupa più spazio. */
  wide?: boolean;
  /** Nascosta sotto i 1280px, per non stringere le altre. */
  secondary?: boolean;
}

export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'date' | 'textarea' | 'number';
  hint?: string;
  placeholder?: string;
}

export interface ResourceDef<T extends Record_> {
  /** Titolo della sezione, es. "Cantine". */
  label: string;
  /** Come si chiama una riga, es. "contatto". */
  singular: string;
  subtitle: string;
  /** Base REST: GET/POST qui, PATCH/DELETE su `${endpoint}/${id}`. */
  endpoint: string;
  /** La chiave dell'array nella risposta GET. */
  listKey: string;
  title: (r: T) => string;
  secondary: (r: T) => string;
  /** Dove sta l'indirizzo, se c'è. */
  email?: (r: T) => string | null;
  columns: ColumnDef<T>[];
  fields: FieldDef[];
  /**
   * Tiene solo alcune righe di quelle che l'endpoint restituisce.
   *
   * Serve quando più elenchi condividono la stessa tabella: le
   * candidature stanno tutte in `collaboration_applications` e si
   * distinguono per il tipo, ma restano quattro elenchi diversi da
   * guardare. Filtrare qui evita di infilare parametri nell'indirizzo,
   * che poi si porterebbero dietro anche le chiamate di modifica.
   */
  filter?: (r: T) => boolean;
  /**
   * Se si possono aggiungere righe a mano.
   *
   * Le candidature arrivano dal sito: un pulsante "Nuovo" lì dentro
   * creerebbe una riga a metà, senza tipo né consenso registrato.
   */
  canCreate?: boolean;
  /**
   * Una rubrica con stato, responsabile e data di richiamo.
   *
   * Non tutte ne hanno bisogno: una lista di persone raccolte per un
   * evento è un elenco, non una trattativa. Dove la tabella non ha
   * quelle colonne va messo `false`, altrimenti l'interfaccia
   * mostrerebbe uno stato che l'API scarta in silenzio — e un comando
   * che finge di funzionare è peggio di un comando che non c'è.
   */
  pipeline?: boolean;
}

type SortDir = 'asc' | 'desc';

function fmtDate(v: string | null | undefined) {
  if (!v) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return v;
}

/* ─────────────────────────────────────────────
   Pastiglia dello stato
───────────────────────────────────────────── */
function StagePill({ stage }: { stage?: Stage | null }) {
  const s = stage ?? 'new';
  // Un solo colore acceso, per "attivo". Se ogni stato avesse il suo,
  // una tabella di quaranta righe diventerebbe un arcobaleno e nessuno
  // noterebbe più niente.
  const strong = s === 'active';
  const quiet = s === 'lost';
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-fine ${
        strong
          ? 'border-accent/35 bg-accent/8 text-accent'
          : quiet
            ? 'border-rule-paper bg-paper-soft text-on-paper-muted/70'
            : 'border-rule-paper text-on-paper-muted'
      }`}
    >
      {STAGE_LABEL[s]}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Dettaglio e modifica
───────────────────────────────────────────── */
function RecordSheet<T extends Record_>({
  resource,
  record,
  members,
  token,
  onClose,
  onSaved,
  onDeleted,
}: {
  resource: ResourceDef<T>;
  /** `'new'` apre il modulo vuoto. */
  record: T | 'new';
  members: { name: string; email: string }[];
  token: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const isNew = record === 'new';
  const current = isNew ? null : (record as T);

  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    for (const f of resource.fields) {
      const v = current?.[f.key];
      d[f.key] = v == null ? '' : String(v);
    }
    d.stage = (current?.stage as string) ?? 'new';
    d.owner_email = (current?.owner_email as string) ?? '';
    d.next_action_at = (current?.next_action_at as string)?.slice(0, 10) ?? '';
    return d;
  });

  const [editing, setEditing] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');

  function set(k: string, v: string) {
    setDraft((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = { ...draft };
      if (resource.pipeline === false) {
        delete body.stage;
        delete body.owner_email;
        delete body.next_action_at;
      }
      // Una data vuota è `null`, non stringa vuota: Postgres rifiuta
      // '' su una colonna date.
      if (!body.next_action_at) body.next_action_at = null;
      if (!body.owner_email) body.owner_email = null;

      const res = await fetch(isNew ? resource.endpoint : `${resource.endpoint}/${current!.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Errore.');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSaving(false);
    }
  }

  /** Cambiare stato è l'azione più frequente: un tocco, salva da sé. */
  async function setStage(stage: Stage) {
    set('stage', stage);
    if (isNew) return;
    await fetch(`${resource.endpoint}/${current!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ stage }),
    });
    onSaved();
  }

  async function remove() {
    setSaving(true);
    try {
      const res = await fetch(`${resource.endpoint}/${current!.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Errore.');
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
      setSaving(false);
    }
  }

  return (
    <Sheet
      open
      title={isNew ? `Nuovo ${resource.singular}` : resource.title(current!)}
      onClose={onClose}
      footer={
        editing ? (
          <div className="flex gap-2.5">
            <ActionButton
              variant="quiet"
              onClick={() => (isNew ? onClose() : setEditing(false))}
              className="flex-1"
            >
              Annulla
            </ActionButton>
            <ActionButton onClick={save} disabled={saving} className="flex-[2]">
              {saving ? 'Salvo…' : 'Salva'}
            </ActionButton>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            <ActionButton onClick={() => setEditing(true)} className="flex-1">
              <Pencil size={16} strokeWidth={1.8} />
              Modifica
            </ActionButton>
            <ActionButton variant="danger" onClick={() => (confirm ? remove() : setConfirm(true))}>
              <Trash2 size={16} strokeWidth={1.8} />
              {confirm ? 'Confermi?' : 'Elimina'}
            </ActionButton>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-5">
        {/* Lo stato, sempre in cima e sempre a un tocco. */}
        {resource.pipeline !== false && (
        <>
        <div>
          <p className="mb-2 text-fine font-medium">A che punto siamo</p>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => {
              const on = (draft.stage || 'new') === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStage(s.id)}
                  aria-pressed={on}
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-fine font-medium transition-colors ${
                    on ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Se ne occupa">
            <Select value={draft.owner_email} onChange={(e) => set('owner_email', e.target.value)}>
              <option value="">Nessuno</option>
              {members.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Da riprendere il" hint="— opzionale">
            <TextInput
              type="date"
              value={draft.next_action_at}
              onChange={(e) => set('next_action_at', e.target.value)}
            />
          </Field>
        </div>
        </>
        )}

        {resource.pipeline !== false && <hr className="border-rule-paper" />}

        {editing ? (
          resource.fields.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              {f.type === 'textarea' ? (
                <TextArea
                  rows={4}
                  value={draft[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              ) : (
                <TextInput
                  type={f.type === 'number' ? 'text' : (f.type ?? 'text')}
                  inputMode={f.type === 'number' ? 'numeric' : undefined}
                  value={draft[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              )}
            </Field>
          ))
        ) : (
          <dl className="grid gap-px overflow-hidden rounded-2xl border border-rule-paper bg-rule-paper">
            {resource.fields.map((f) => (
              <div key={f.key} className="flex flex-wrap gap-x-4 gap-y-1 bg-paper px-4 py-3">
                <dt className="min-w-[110px] shrink-0 text-fine text-on-paper-muted">{f.label}</dt>
                <dd className="min-w-0 whitespace-pre-wrap break-words text-body">
                  {draft[f.key]?.trim() || '—'}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {error && <p className="text-fine font-medium text-accent">{error}</p>}
      </div>
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   La rubrica
───────────────────────────────────────────── */
export function RecordTable<T extends Record_>({ resource }: { resource: ResourceDef<T> }) {
  const [rows, setRows] = useState<T[]>([]);
  const [members, setMembers] = useState<{ name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<Stage | '' | 'due'>('');
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: '', dir: 'asc' });
  const [open, setOpen] = useState<T | 'new' | null>(null);

  useOverlayBackClose(!!open, () => setOpen(null));

  const load = useCallback(async () => {
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tk = session?.access_token ?? '';
      setToken(tk);
      const [res, mRes] = await Promise.all([
        fetch(resource.endpoint, { headers: { Authorization: `Bearer ${tk}` } }),
        fetch('/api/team/members', { headers: { Authorization: `Bearer ${tk}` } }),
      ]);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Impossibile leggere la rubrica.');
      setRows(json[resource.listKey] ?? []);
      if (mRes.ok) {
        const m = await mRes.json().catch(() => ({}));
        if (Array.isArray(m.members)) setMembers(m.members);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, [resource.endpoint, resource.listKey]);

  useEffect(() => {
    load();
  }, [load]);

  const today = todayISO();

  const counts = useMemo(() => {
    const c: Record<string, number> = { due: 0 };
    for (const r of rows.filter((x) => !resource.filter || resource.filter(x))) {
      const s = (r.stage as string) ?? 'new';
      c[s] = (c[s] ?? 0) + 1;
      if (isDue(r, today)) c.due += 1;
    }
    return c;
  }, [rows, today]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (resource.filter && !resource.filter(r)) return false;
      if (stage === 'due' && !isDue(r, today)) return false;
      if (stage && stage !== 'due' && ((r.stage as string) ?? 'new') !== stage) return false;
      if (!q) return true;
      const hay = [resource.title(r), resource.secondary(r), ...resource.columns.map((c) => c.value(r))]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });

    if (sort.key) {
      const col = resource.columns.find((c) => c.key === sort.key);
      if (col) {
        out = [...out].sort((a, b) => {
          const va = col.value(a) ?? '';
          const vb = col.value(b) ?? '';
          return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        });
      }
    }
    return out;
  }, [rows, query, stage, sort, today, resource]);

  const emails = useMemo(() => {
    if (!resource.email) return [];
    const seen = new Set<string>();
    const out: { email: string; name: string }[] = [];
    for (const r of visible) {
      const e = (resource.email(r) ?? '').trim().toLowerCase();
      if (!e || !e.includes('@') || seen.has(e)) continue;
      seen.add(e);
      out.push({ email: e, name: resource.title(r) });
    }
    return out;
  }, [visible, resource]);

  function toggleSort(key: string) {
    setSort((p) => (p.key === key ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHead
        title={resource.label}
        subtitle={resource.subtitle}
        action={
          resource.canCreate === false ? undefined : (
            <ActionButton onClick={() => setOpen('new')}>
              <Plus size={17} strokeWidth={2} />
              Nuovo
            </ActionButton>
          )
        }
      />

      {error ? (
        <EmptyState
          title="Non riesco a leggere la rubrica"
          body={error}
          action={<ActionButton onClick={load}>Riprova</ActionButton>}
        />
      ) : (
        <>
          {/* Stati. "Da fare" per primo: è la domanda del mattino. */}
          {resource.pipeline !== false && (
          <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setStage(stage === 'due' ? '' : 'due')}
              aria-pressed={stage === 'due'}
              className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-fine font-medium transition-colors ${
                stage === 'due'
                  ? 'border-accent bg-accent text-paper'
                  : 'border-rule-paper text-on-paper'
              }`}
            >
              <Clock size={14} strokeWidth={1.9} />
              Da fare {counts.due > 0 && `· ${counts.due}`}
            </button>
            <button
              onClick={() => setStage('')}
              aria-pressed={stage === ''}
              className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full border px-3.5 text-fine font-medium transition-colors ${
                stage === '' ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
              }`}
            >
              Tutti · {rows.length}
            </button>
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStage(stage === s.id ? '' : s.id)}
                aria-pressed={stage === s.id}
                className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full border px-3.5 text-fine font-medium transition-colors ${
                  stage === s.id
                    ? 'border-accent bg-accent text-paper'
                    : 'border-rule-paper text-on-paper'
                }`}
              >
                {s.label} · {counts[s.id] ?? 0}
              </button>
            ))}
          </div>
          )}

          <div className="mb-5 flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="flex min-w-[220px] flex-1 items-center gap-2.5 rounded-full border border-rule-paper px-4">
              <Search size={17} strokeWidth={1.8} className="shrink-0 text-on-paper-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca"
                className="min-h-[48px] w-full bg-transparent text-body placeholder:text-on-paper-muted/60 focus:outline-none [font-size:16px]"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Pulisci"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-paper-soft"
                >
                  <X size={15} strokeWidth={2} />
                </button>
              )}
            </div>

            {resource.email && emails.length > 0 && (
              <a
                href={`mailto:?bcc=${encodeURIComponent(emails.map((e) => e.email).join(','))}`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-rule-paper px-4 text-fine font-medium transition-colors hover:border-accent/40"
              >
                <Mail size={16} strokeWidth={1.8} />
                Scrivi ai {emails.length} visibili
              </a>
            )}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title="Niente qui"
              body={
                query || stage
                  ? 'Prova ad allargare i filtri.'
                  : resource.canCreate === false
                    ? `Nessuna ${resource.singular} ancora: arrivano dal sito.`
                    : `Aggiungi il primo ${resource.singular}.`
              }
              action={
                query || stage || resource.canCreate === false ? undefined : (
                  <ActionButton onClick={() => setOpen('new')}>
                    <Plus size={17} strokeWidth={2} />
                    Nuovo
                  </ActionButton>
                )
              }
            />
          ) : (
            <>
              {/* Telefono: schede. */}
              <div className="flex flex-col gap-1.5 lg:hidden">
                {visible.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setOpen(r)}
                    className="flex min-h-[72px] w-full flex-col items-start gap-1.5 rounded-2xl border border-rule-paper px-3.5 py-3 text-left transition-colors hover:border-accent/40"
                  >
                    <span className="flex w-full items-start justify-between gap-3">
                      <span className="min-w-0 truncate text-body">{resource.title(r)}</span>
                      {resource.pipeline !== false && <StagePill stage={r.stage as Stage} />}
                    </span>
                    <span className="min-w-0 truncate text-fine text-on-paper-muted">
                      {resource.secondary(r) || '—'}
                    </span>
                    {resource.pipeline !== false && isDue(r, today) && (
                      <span className="inline-flex items-center gap-1.5 text-fine font-medium text-accent">
                        <Clock size={12} strokeWidth={2} />
                        Da riprendere · {fmtDate(r.next_action_at)}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Computer: tabella, senza scorrimento orizzontale. */}
              <div className="hidden overflow-hidden rounded-2xl border border-rule-paper lg:block">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-rule-paper bg-paper-soft/60">
                      {resource.columns.map((c) => (
                        <th
                          key={c.key}
                          className={`px-4 py-3 text-left text-fine font-medium ${
                            c.wide ? 'w-[30%]' : ''
                          } ${c.secondary ? 'hidden xl:table-cell' : ''}`}
                        >
                          <button
                            onClick={() => toggleSort(c.key)}
                            className="inline-flex items-center gap-1.5 hover:text-accent"
                          >
                            {c.label}
                            <ArrowUpDown
                              size={12}
                              strokeWidth={2}
                              className={sort.key === c.key ? 'text-accent' : 'text-on-paper-muted/40'}
                            />
                          </button>
                        </th>
                      ))}
                      {resource.pipeline !== false && (
                        <th className="w-[140px] px-4 py-3 text-left text-fine font-medium">Stato</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setOpen(r)}
                        className="cursor-pointer border-b border-rule-paper/60 transition-colors last:border-0 hover:bg-paper-soft/60"
                      >
                        {resource.columns.map((c) => (
                          <td
                            key={c.key}
                            className={`truncate px-4 py-3 text-body ${
                              c.secondary ? 'hidden xl:table-cell' : ''
                            }`}
                          >
                            {c.value(r) || <span className="text-on-paper-muted/50">—</span>}
                          </td>
                        ))}
                        {resource.pipeline !== false && (
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-2">
                              <StagePill stage={r.stage as Stage} />
                              {isDue(r, today) && (
                                <Clock size={13} strokeWidth={2} className="shrink-0 text-accent" />
                              )}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-fine text-on-paper-muted">
                {visible.length} di{' '}
                {resource.filter ? rows.filter(resource.filter).length : rows.length}
                {resource.pipeline !== false &&
                  counts.due > 0 &&
                  ` · ${counts.due} da riprendere in mano`}
              </p>
            </>
          )}
        </>
      )}

      {open && (
        <RecordSheet
          resource={resource}
          record={open}
          members={members}
          token={token}
          onClose={() => setOpen(null)}
          onSaved={() => {
            setOpen(null);
            load();
          }}
          onDeleted={() => {
            setOpen(null);
            load();
          }}
        />
      )}
    </div>
  );
}

export { StagePill, Check };
