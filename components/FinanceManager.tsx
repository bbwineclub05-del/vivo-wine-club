'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Minus,
  Pencil,
  Plus,
  Trash2,
  Wallet,
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
import {
  ENTRY_LABEL,
  checkBooks,
  formatEur,
  toCents,
  toEntry,
  type Entry,
  type EntryType,
} from '@/lib/ledger';

/**
 * Finance.
 *
 * Il modello è quello di Tricount, portato su un gruppo di due membri:
 * il club e la persona. Ogni riga dice chi ha mosso i soldi, e i saldi
 * sono sempre la somma delle righe — mai un numero salvato da qualche
 * parte, mai un pulsante "ricalcola".
 *
 * Due schermate. "Chi deve cosa" risponde alla domanda che ci si fa
 * davvero: a chi devo dei soldi e quanto. "Movimenti" è il registro.
 * I rimborsi non si scrivono a mano: si fa Rimborsa sul saldo di
 * qualcuno e la riga nasce da sé, con l'importo giusto.
 *
 * In fondo c'è una riga che ricalcola i libri da zero e dice se
 * tornano. Non è decorazione: è il posto dove un errore si vede subito
 * invece che in un foglio Excel sei mesi dopo.
 */

interface RawRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  entry_type: EntryType | null;
  member_email: string | null;
  budget_category: string | null;
  notes: string | null;
  registered_by_name: string | null;
  created_at: string;
}

interface Member {
  name: string;
  email: string;
}

interface Category {
  id: string;
  name: string;
  type: 'revenue' | 'cost' | 'both';
}

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1].slice(0, 3).toLowerCase()} ${y}`;
}

/** Centesimi come si scrivono in un campo importo: "15000" → "150,00". */
function centsToInput(cents: number) {
  return `${Math.floor(Math.abs(cents) / 100)},${String(Math.abs(cents) % 100).padStart(2, '0')}`;
}

const SIGN: Record<EntryType, '+' | '−'> = {
  expense: '−',
  income: '+',
  reimbursement: '−',
  contribution: '+',
};

/* ─────────────────────────────────────────────
   Nuovo movimento
───────────────────────────────────────────── */
function EntryForm({
  token,
  members,
  categories,
  preset,
  editTarget,
  onClose,
  onSaved,
}: {
  token: string;
  members: Member[];
  categories: Category[];
  /** Precompilato da "Rimborsa" o "Registra versamento". */
  preset?: { entry_type: EntryType; member_email: string; amount: string; description: string };
  editTarget?: RawRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const settlement = preset?.entry_type === 'reimbursement' || preset?.entry_type === 'contribution';

  const [type, setType] = useState<EntryType>(
    preset?.entry_type ?? editTarget?.entry_type ?? 'expense',
  );
  const [amount, setAmount] = useState(
    preset?.amount ?? (editTarget ? centsToInput(toCents(editTarget.amount) ?? 0) : ''),
  );
  const [description, setDescription] = useState(
    preset?.description ?? editTarget?.description ?? '',
  );
  const [memberEmail, setMemberEmail] = useState(
    preset?.member_email ?? editTarget?.member_email ?? '',
  );
  const [date, setDate] = useState(editTarget?.date?.slice(0, 10) ?? today());
  const [category, setCategory] = useState(editTarget?.budget_category ?? '');
  const [notes, setNotes] = useState(editTarget?.notes ?? '');
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cents = toCents(amount);
  const valid = cents !== null && cents > 0 && description.trim().length > 0;

  const usable = useMemo(
    () =>
      categories.filter((c) =>
        type === 'income' || type === 'contribution'
          ? c.type !== 'cost'
          : c.type !== 'revenue',
      ),
    [categories, type],
  );

  async function submit() {
    if (!valid) {
      setError(cents === null || cents <= 0 ? 'Inserisci un importo.' : 'Serve una causale.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload = {
        entry_type: type,
        amount,
        description: description.trim(),
        member_email: memberEmail || null,
        date,
        category: category || null,
        notes: notes.trim() || null,
      };
      const res = await fetch(
        editTarget ? `/api/finance/entries/${editTarget.id}` : '/api/finance/entries',
        {
          method: editTarget ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore.');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSaving(false);
    }
  }

  const title = editTarget
    ? 'Modifica movimento'
    : settlement
      ? preset!.entry_type === 'reimbursement'
        ? 'Rimborso'
        : 'Versamento'
      : 'Nuovo movimento';

  return (
    <Sheet
      open
      title={title}
      onClose={onClose}
      footer={
        <div className="flex gap-2.5">
          <ActionButton variant="quiet" onClick={onClose} className="flex-1">
            Annulla
          </ActionButton>
          <ActionButton onClick={submit} disabled={saving || !valid} className="flex-[2]">
            {saving ? 'Salvo…' : 'Salva'}
          </ActionButton>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Spesa o entrata. Rimborsi e versamenti nascono dai saldi, non
            da qui, così la scelta resta fra due cose invece che quattro. */}
        {!settlement && !editTarget && (
          <div className="flex rounded-2xl border border-rule-paper p-1">
            {(
              [
                { id: 'expense', label: 'Spesa', Icon: ArrowUpRight },
                { id: 'income', label: 'Entrata', Icon: ArrowDownLeft },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setType(o.id)}
                aria-pressed={type === o.id}
                className={`inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl text-fine font-medium transition-colors ${
                  type === o.id ? 'bg-accent text-paper' : 'text-on-paper-muted'
                }`}
              >
                <o.Icon size={16} strokeWidth={1.9} />
                {o.label}
              </button>
            ))}
          </div>
        )}

        {/* L'importo, grande. È la prima cosa che si scrive. */}
        <div>
          <label className="mb-2 block text-fine font-medium">Importo</label>
          <div className="flex items-center gap-2 rounded-2xl border border-rule-paper px-4 focus-within:border-accent/50">
            <span className="ds-display text-[28px] leading-none text-on-paper-muted">€</span>
            <input
              autoFocus={!editTarget}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="ds-display min-h-[64px] w-full bg-transparent text-[28px] leading-none tracking-[-0.02em] placeholder:text-on-paper-muted/40 focus:outline-none [font-size:28px]"
            />
          </div>
        </div>

        <Field label="Causale">
          <TextInput
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'income' ? 'Incasso porta, vendita merch…' : 'Fotografo, vino, stampe…'}
          />
        </Field>

        {/* Chi ha mosso i soldi: la domanda che fa tutta la differenza
            fra una spesa del club e un anticipo da rimborsare. */}
        {!settlement && (
          <Field
            label={type === 'income' ? 'Chi ha incassato' : 'Chi ha pagato'}
            hint={
              memberEmail
                ? type === 'income'
                  ? '(dovrà versarli al club)'
                  : '(il club glieli dovrà)'
                : '(dal conto del club)'
            }
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMemberEmail('')}
                aria-pressed={!memberEmail}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 text-fine font-medium transition-colors ${
                  !memberEmail
                    ? 'border-accent bg-accent text-paper'
                    : 'border-rule-paper text-on-paper'
                }`}
              >
                <Wallet size={15} strokeWidth={1.8} />
                Il club
              </button>
              {members.map((m) => {
                const on = memberEmail === m.email;
                return (
                  <button
                    key={m.email}
                    type="button"
                    onClick={() => setMemberEmail(m.email)}
                    aria-pressed={on}
                    className={`inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-fine font-medium transition-colors ${
                      on ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {/* Tutto il resto ha un valore sensato e sta sotto una riga sola. */}
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex min-h-[44px] items-center gap-2 text-left text-fine font-medium text-accent"
        >
          {showMore ? <Minus size={15} strokeWidth={2} /> : <Plus size={15} strokeWidth={2} />}
          {showMore ? 'Meno dettagli' : `Altro: data, categoria, note`}
        </button>

        {showMore && (
          <div className="flex flex-col gap-5">
            <Field label="Data">
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Categoria" hint="(opzionale)">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Nessuna</option>
                {usable.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Note" hint="(opzionale)">
              <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        )}

        {!showMore && (
          <p className="text-fine text-on-paper-muted">
            Data: {fmtDate(date)}
            {category ? ` · ${category}` : ''}
          </p>
        )}

        {error && <p className="text-fine font-medium text-accent">{error}</p>}
      </div>
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   Dettaglio di un movimento
───────────────────────────────────────────── */
function EntryDetail({
  row,
  members,
  isAdmin,
  token,
  onClose,
  onEdit,
  onChanged,
}: {
  row: RawRow | null;
  members: Member[];
  isAdmin: boolean;
  token: string;
  onClose: () => void;
  onEdit: (r: RawRow) => void;
  onChanged: () => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useOverlayBackClose(!!row, onClose);

  if (!row) return null;
  const type = row.entry_type ?? 'expense';
  const who = members.find((m) => m.email === row.member_email);
  const confirming = confirmId === row.id;

  async function remove() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/finance/entries/${row!.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Errore.');
      }
      onChanged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      title="Movimento"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2.5">
          <ActionButton variant="quiet" onClick={() => onEdit(row)} className="flex-1">
            <Pencil size={16} strokeWidth={1.8} />
            Modifica
          </ActionButton>
          {isAdmin && (
            <ActionButton
              variant="danger"
              onClick={() => (confirming ? remove() : setConfirmId(row.id))}
              disabled={busy}
            >
              <Trash2 size={16} strokeWidth={1.8} />
              {confirming ? 'Confermi?' : 'Elimina'}
            </ActionButton>
          )}
        </div>
      }
    >
      <p className="ds-display text-[32px] leading-none tracking-[-0.02em]">
        {SIGN[type]}
        {formatEur(toCents(row.amount) ?? 0).replace('−', '')}
      </p>
      <p className="mt-2 text-subtitle">{row.description}</p>

      <dl className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-rule-paper bg-rule-paper">
        {[
          { k: 'Tipo', v: ENTRY_LABEL[type] },
          {
            k: type === 'income' ? 'Incassato da' : type === 'expense' ? 'Pagato da' : 'Persona',
            v: who?.name ?? 'Il club',
          },
          { k: 'Data', v: fmtDate(row.date) },
          { k: 'Categoria', v: row.budget_category || '—' },
          { k: 'Registrato da', v: row.registered_by_name || '—' },
        ].map((r) => (
          <div key={r.k} className="flex flex-wrap gap-x-4 gap-y-1 bg-paper px-4 py-3">
            <dt className="min-w-[120px] shrink-0 text-fine text-on-paper-muted">{r.k}</dt>
            <dd className="min-w-0 break-words text-body">{r.v}</dd>
          </div>
        ))}
      </dl>

      {row.notes && (
        <p className="mt-5 whitespace-pre-wrap text-body text-on-paper-muted">{row.notes}</p>
      )}

      {!isAdmin && (
        <p className="mt-5 text-fine text-on-paper-muted">
          Solo il board può eliminare un movimento. Per correggerlo usa Modifica.
        </p>
      )}

      {error && <p className="mt-4 text-fine font-medium text-accent">{error}</p>}
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   Finance
───────────────────────────────────────────── */
export default function FinanceManager({ isAdmin = false }: { isAdmin?: boolean }) {
  const [rows, setRows] = useState<RawRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  const [tab, setTab] = useState<'saldi' | 'movimenti'>('saldi');
  const [detail, setDetail] = useState<RawRow | null>(null);
  const [form, setForm] = useState<
    | {
        preset?: { entry_type: EntryType; member_email: string; amount: string; description: string };
        editTarget?: RawRow | null;
      }
    | null
  >(null);

  useOverlayBackClose(!!form, () => setForm(null));

  const tokenRef = useRef('');

  const load = useCallback(async () => {
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tk = session?.access_token ?? '';
      tokenRef.current = tk;
      setToken(tk);

      const res = await fetch('/api/finance/entries', { headers: { Authorization: `Bearer ${tk}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Impossibile leggere il registro.');
      setRows(json.entries ?? []);
      setMembers(json.members ?? []);
      setCategories(json.categories ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Tutto si ricalcola da qui, ogni volta ── */
  // Niente righe scartate. Quelle scritte dal sito in produzione hanno
  // ancora solo le colonne vecchie: il tipo e la persona si leggono da
  // lì, invece di far sparire il movimento dal registro.
  const emailByName = useMemo(
    () => new Map(members.map((m) => [m.name.trim().toLowerCase(), m.email])),
    [members],
  );

  const entries = useMemo<Entry[]>(
    () => rows.map((r) => toEntry(r, emailByName)),
    [rows, emailByName],
  );

  const { ok, drift, balances } = useMemo(() => checkBooks(entries), [entries]);

  /* Una riga senza tipo non sa dire cosa ha fatto ai soldi, quindi i
     saldi la saltano — ma l'elenco la mostra lo stesso. Finché nessuno
     lo dice, in registro c'è una spesa che la cassa non ha pagato. */
  const senzaTipo = useMemo(() => rows.filter((r) => !r.entry_type).length, [rows]);

  const nameOf = useCallback(
    (email: string) => members.find((m) => m.email === email)?.name ?? email,
    [members],
  );

  const creditors = useMemo(
    () =>
      Object.entries(balances.members)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]),
    [balances],
  );

  const debtors = useMemo(
    () =>
      Object.entries(balances.members)
        .filter(([, v]) => v < 0)
        .sort((a, b) => a[1] - b[1]),
    [balances],
  );

  /* ── Movimenti raggruppati per mese ── */
  const byMonth = useMemo(() => {
    const map: Record<string, RawRow[]> = {};
    for (const r of rows) {
      const k = r.date.slice(0, 7);
      (map[k] ??= []).push(r);
    }
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([k, list]) => ({
        key: k,
        label: `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`,
        list: list.sort((a, b) => b.date.localeCompare(a.date)),
      }));
  }, [rows]);

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
        title="Finance"
        subtitle="La cassa del club e i conti fra noi."
        action={
          <ActionButton onClick={() => setForm({})}>
            <Plus size={17} strokeWidth={2} />
            Movimento
          </ActionButton>
        }
      />

      {error && (
        <EmptyState
          title="Non riesco a leggere il registro"
          body={error}
          action={<ActionButton onClick={load}>Riprova</ActionButton>}
        />
      )}

      {!error && (
        <>
          {/* ── I tre numeri ── */}
          <div className="mb-6 grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-2xl border border-rule-paper p-4">
              <p className="text-fine text-on-paper-muted">Cassa del club</p>
              <p className="ds-display mt-1.5 text-[26px] leading-none tracking-[-0.02em]">
                {formatEur(balances.clubCash)}
              </p>
            </div>
            <div className="rounded-2xl border border-rule-paper p-4">
              <p className="text-fine text-on-paper-muted">Da rimborsare</p>
              <p className="ds-display mt-1.5 text-[26px] leading-none tracking-[-0.02em] text-accent">
                {formatEur(balances.owedToMembers)}
              </p>
            </div>
            <div className="rounded-2xl border border-rule-paper p-4">
              <p className="text-fine text-on-paper-muted">Da incassare</p>
              <p className="ds-display mt-1.5 text-[26px] leading-none tracking-[-0.02em]">
                {formatEur(balances.owedByMembers)}
              </p>
            </div>
          </div>

          <div className="mb-6 flex rounded-full border border-rule-paper p-1 lg:w-fit">
            {(
              [
                { id: 'saldi', label: 'Chi deve cosa' },
                { id: 'movimenti', label: `Movimenti · ${rows.length}` },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={`min-h-[46px] flex-1 rounded-full px-4 text-fine font-medium transition-colors lg:flex-none lg:px-8 ${
                  tab === t.id ? 'bg-accent text-paper' : 'text-on-paper-muted'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Chi deve cosa ── */}
          {tab === 'saldi' && (
            <div className="flex flex-col gap-8">
              <section>
                <h3 className="mb-3 text-subtitle font-medium">Il club deve</h3>
                {creditors.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-rule-paper px-5 py-8 text-center text-body text-on-paper-muted">
                    Nessuno ha anticipato soldi non ancora rimborsati.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {creditors.map(([email, cents]) => (
                      <div
                        key={email}
                        className="flex flex-wrap items-center gap-3 rounded-2xl border border-rule-paper p-3.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body">{nameOf(email)}</p>
                          <p className="ds-display mt-0.5 text-[22px] leading-none tracking-[-0.02em] text-accent">
                            {formatEur(cents)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            onClick={() =>
                              setForm({
                                preset: {
                                  entry_type: 'reimbursement',
                                  member_email: email,
                                  amount: centsToInput(cents),
                                  description: `Rimborso a ${nameOf(email)}`,
                                },
                              })
                            }
                          >
                            <Check size={16} strokeWidth={2} />
                            Rimborsa
                          </ActionButton>
                          {/* Anche chi è in credito può consegnare contanti
                              del club: senza questo, quei soldi non
                              avrebbero modo di rientrare in cassa. */}
                          <ActionButton
                            variant="quiet"
                            onClick={() =>
                              setForm({
                                preset: {
                                  entry_type: 'contribution',
                                  member_email: email,
                                  amount: '',
                                  description: `Versamento di ${nameOf(email)}`,
                                },
                              })
                            }
                          >
                            Ha versato
                          </ActionButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-subtitle font-medium">Deve al club</h3>
                {debtors.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-rule-paper px-5 py-8 text-center text-body text-on-paper-muted">
                    Nessuno tiene soldi del club.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {debtors.map(([email, cents]) => (
                      <div
                        key={email}
                        className="flex flex-wrap items-center gap-3 rounded-2xl border border-rule-paper p-3.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body">{nameOf(email)}</p>
                          <p className="ds-display mt-0.5 text-[22px] leading-none tracking-[-0.02em]">
                            {formatEur(-cents)}
                          </p>
                        </div>
                        <ActionButton
                          variant="quiet"
                          onClick={() =>
                            setForm({
                              preset: {
                                entry_type: 'contribution',
                                member_email: email,
                                amount: centsToInput(cents),
                                description: `Versamento di ${nameOf(email)}`,
                              },
                            })
                          }
                        >
                          <Check size={16} strokeWidth={2} />
                          Ha versato
                        </ActionButton>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── La verifica ── */}
              <section
                className={`rounded-2xl border p-4 ${
                  ok ? 'border-rule-paper' : 'border-accent bg-accent/5'
                }`}
              >
                <p className="text-fine font-medium">
                  {ok ? 'I conti tornano' : 'I conti non tornano'}
                </p>
                <p className="mt-1.5 text-fine text-on-paper-muted">
                  Cassa {formatEur(balances.clubCash)} − debiti netti{' '}
                  {formatEur(balances.owedToMembers - balances.owedByMembers)} = entrate{' '}
                  {formatEur(balances.totalIncome)} − uscite {formatEur(balances.totalExpense)}
                </p>
                {!ok && (
                  <p className="mt-2 text-fine font-medium text-accent">
                    Scarto: {formatEur(drift)}. C&apos;è una riga che non quadra.
                  </p>
                )}
                {senzaTipo > 0 && (
                  <p className="mt-2 text-fine font-medium text-accent">
                    {senzaTipo === 1
                      ? 'Un movimento non dice se è una spesa, un’entrata o un rimborso, e resta fuori da questi conti.'
                      : `${senzaTipo} movimenti non dicono se sono spese, entrate o rimborsi, e restano fuori da questi conti.`}{' '}
                    Aprili da Movimenti e salvali col tipo giusto.
                  </p>
                )}
              </section>
            </div>
          )}

          {/* ── Movimenti ── */}
          {tab === 'movimenti' && (
            <div className="flex flex-col gap-7">
              {byMonth.length === 0 && (
                <EmptyState
                  title="Nessun movimento"
                  body="Registra la prima spesa o entrata."
                  action={
                    <ActionButton onClick={() => setForm({})}>
                      <Plus size={17} strokeWidth={2} />
                      Movimento
                    </ActionButton>
                  }
                />
              )}
              {byMonth.length > 0 && (
                <p className="-mt-1 text-fine text-on-paper-muted">
                  Tocca un movimento per correggerlo o eliminarlo.
                </p>
              )}
              {byMonth.map((m) => (
                <section key={m.key}>
                  <h3 className="mb-2.5 flex items-baseline gap-2 text-subtitle font-medium">
                    {m.label}
                    <span className="text-fine font-normal text-on-paper-muted">
                      {m.list.length}
                    </span>
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {m.list.map((r) => {
                      const t = r.entry_type ?? 'expense';
                      const positive = t === 'income' || t === 'contribution';
                      return (
                        <button
                          key={r.id}
                          onClick={() => setDetail(r)}
                          className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-rule-paper px-3.5 text-left transition-colors hover:border-accent/40"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body">{r.description}</span>
                            <span className="mt-0.5 block truncate text-fine text-on-paper-muted">
                              {fmtDate(r.date)} ·{' '}
                              {r.member_email ? nameOf(r.member_email) : 'Il club'}
                              {t === 'reimbursement' || t === 'contribution'
                                ? ` · ${ENTRY_LABEL[t]}`
                                : ''}
                            </span>
                          </span>
                          <span
                            className={`ds-display shrink-0 text-[17px] tracking-[-0.01em] ${
                              positive ? 'text-on-paper' : 'text-accent'
                            }`}
                          >
                            {SIGN[t]}
                            {formatEur(toCents(r.amount) ?? 0).replace('−', '')}
                          </span>
                          {/* La freccina dice che la riga si apre: senza,
                              non si capiva che un movimento si può
                              correggere o cancellare. */}
                          <ChevronRight
                            size={17}
                            strokeWidth={1.8}
                            className="-mr-1 shrink-0 text-on-paper-muted"
                          />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <EntryDetail
        row={detail}
        members={members}
        isAdmin={isAdmin}
        token={token}
        onClose={() => setDetail(null)}
        onEdit={(r) => {
          setDetail(null);
          setForm({ editTarget: r });
        }}
        onChanged={load}
      />

      {form && (
        <EntryForm
          token={token}
          members={members}
          categories={categories}
          preset={form.preset}
          editTarget={form.editTarget}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            setDetail(null);
            load();
          }}
        />
      )}
    </div>
  );
}
