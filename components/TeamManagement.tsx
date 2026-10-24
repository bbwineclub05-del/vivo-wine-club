'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ADMIN_EMAILS, SUPER_ADMIN_EMAIL } from '@/lib/admins';
import { PERMISSION_KEYS, type PermissionKey } from '@/lib/access';
import {
  ActionButton, EmptyState, Field, NewButton, PageHead, Select, Sheet, StatusPill, TextInput,
} from '@/components/admin/ui';

/**
 * Chi fa parte del club, e cosa vede.
 *
 * Due cose non erano vere, prima.
 *
 * La prima: gli interruttori elencavano sezioni che non esistono più —
 * News, Media, Pipeline — e non nominavano Finance, PED, Membership,
 * Sconti. Quelle restavano aperte a chiunque, perché una chiave che
 * nessuno ha mai scritto vale "permesso". Ora c'è un interruttore per
 * ogni voce del menù, dodici, e spegnerlo fa sparire la voce: non si
 * vede più, invece di vedersi e sbattere la porta dopo il clic.
 *
 * La seconda: "elimina" non eliminava. Toglieva la riga e lasciava
 * l'account con la sua password, e alla ricarica successiva la
 * sincronizzazione automatica rimetteva la persona nell'elenco. Ora se
 * ne vanno riga, profilo, foto e credenziali.
 */

interface Member {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'collaborator';
  permissions: Record<string, boolean> | null;
  active: boolean;
  email_confirmed: boolean;
  last_sign_in: string | null;
}

/** Un interruttore per ogni posto in cui si può entrare. */
const FEATURES: { key: PermissionKey; label: string; hint: string }[] = [
  { key: 'events',     label: 'Eventi',     hint: 'Date, biglietti, liste' },
  { key: 'merch',      label: 'Merch',      hint: 'Prodotti e ordini' },
  { key: 'tasks',      label: 'Task',       hint: 'Cosa deve fare il team' },
  { key: 'ped',        label: 'PED',        hint: 'Piano editoriale' },
  { key: 'membership', label: 'Membership', hint: 'Tessere e candidature' },
  { key: 'finance',    label: 'Finance',    hint: 'Transazioni, bilancio, preventivi' },
  { key: 'documents',  label: 'Documenti',  hint: 'Archivio del club' },
  { key: 'crm',        label: 'CRM',        hint: 'Rubrica e invii' },
  { key: 'site',       label: 'Sito',       hint: 'News, media, mappa cantine' },
  { key: 'offers',     label: 'Sconti',     hint: 'Codici e upsell' },
  { key: 'analytics',  label: 'Analytics',  hint: 'I numeri del club' },
  { key: 'scanner',    label: 'Scanner',    hint: 'Timbrare i biglietti in porta' },
];

const ROLE_LABEL: Record<Member['role'], string> = {
  admin: 'Board',
  staff: 'Staff',
  collaborator: 'Collaboratore',
};

/** Assente vuol dire mai configurato, e mai configurato vuol dire acceso. */
function isOn(m: Member, key: PermissionKey): boolean {
  if (m.role === 'admin') return true; // il board vede tutto per definizione
  return m.permissions?.[key] !== false;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function Monogram({ name }: { name: string }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/10 text-fine font-medium text-accent">
      {initials(name)}
    </span>
  );
}

function Switch({ on, onChange, disabled, label }: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200 ${
        on ? 'bg-accent' : 'bg-paper-soft border border-rule-paper'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <span
        className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-paper shadow-sm transition-all duration-200 ${
          on ? 'left-[25px]' : 'left-[3px] border border-rule-paper'
        }`}
      />
    </button>
  );
}

/* ── Il pannello di una persona ─────────────────────────────────── */

function PersonSheet({
  member, token, onClose, onSaved, onRemoved,
}: {
  member: Member;
  token: string;
  onClose: () => void;
  onSaved: (m: Member) => void;
  onRemoved: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Member>(member);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');

  const protected_ = draft.email === SUPER_ADMIN_EMAIL;

  async function patch(changes: Record<string, unknown>, next: Member) {
    setSaving(true);
    setError('');
    const previous = draft;
    setDraft(next); // la risposta è immediata, l'errore rimette com'era
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(changes),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Salvataggio fallito.');
      onSaved(next);
    } catch (e) {
      setDraft(previous);
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: PermissionKey, value: boolean) {
    // Si scrivono tutte e dodici, non solo quella toccata: così la
    // riga smette di dipendere da quali chiavi esistevano quel giorno.
    const permissions = Object.fromEntries(
      PERMISSION_KEYS.map((k) => [k, k === key ? value : isOn(draft, k)]),
    );
    patch({ permissions }, { ...draft, permissions });
  }

  async function remove() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Eliminazione fallita.');
      onRemoved(member.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open title={draft.name} onClose={onClose}>
      <p className="-mt-1 mb-5 text-fine text-on-paper-muted">{draft.email}</p>

      {error && <p className="mb-4 text-fine font-medium text-accent">{error}</p>}

      {/* ── Dentro o fuori ── */}
      <div className="flex items-center gap-4 rounded-2xl border border-rule-paper p-4">
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium">Accesso al pannello</p>
          <p className="mt-1 text-fine text-on-paper-muted">
            {draft.active ? 'Può entrare nell’area riservata.' : 'Non entra: per lei l’area non si apre.'}
          </p>
        </div>
        <Switch
          label="Accesso al pannello"
          on={draft.active}
          disabled={saving || protected_}
          onChange={(v) => patch({ active: v }, { ...draft, active: v })}
        />
      </div>

      {/* ── Ruolo ── */}
      {draft.role !== 'collaborator' && (
        <div className="mt-4">
          <Field label="Ruolo" hint={draft.role === 'admin' ? 'il board vede tutto' : undefined}>
            <Select
              value={draft.role}
              disabled={saving || protected_}
              onChange={(e) => {
                const role = e.target.value as 'admin' | 'staff';
                patch({ role }, { ...draft, role });
              }}
            >
              <option value="staff">Staff</option>
              <option value="admin">Board</option>
            </Select>
          </Field>
        </div>
      )}

      {/* ── Cosa vede ── */}
      <p className="mb-1 mt-6 text-body font-medium">Cosa vede</p>
      <p className="mb-3 text-fine text-on-paper-muted">
        {draft.role === 'admin'
          ? 'Il board apre tutto: per limitare qualcuno, mettilo in Staff.'
          : 'Quello che spegni qui sparisce dal suo menù.'}
      </p>

      <div className="divide-y divide-rule-paper">
        {FEATURES.map((f) => (
          <div key={f.key} className="flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-body">{f.label}</p>
              <p className="mt-0.5 truncate text-fine text-on-paper-muted">{f.hint}</p>
            </div>
            <Switch
              label={f.label}
              on={isOn(draft, f.key)}
              disabled={saving || draft.role === 'admin' || !draft.active}
              onChange={(v) => toggle(f.key, v)}
            />
          </div>
        ))}
      </div>

      {/* ── Via dal club ── */}
      {!protected_ && (
        <div className="mt-7 rounded-2xl border border-accent/30 p-4">
          <p className="text-body font-medium">Elimina dal club</p>
          <p className="mt-1.5 text-fine text-on-paper-muted">
            Spariscono accesso, profilo, foto e credenziali. Restano i movimenti di cassa e i
            biglietti: la storia del club non si riscrive. Non si torna indietro.
          </p>

          {!confirming ? (
            <ActionButton
              variant="danger"
              className="mt-3"
              onClick={() => { setConfirming(true); setTyped(''); }}
            >
              <Trash2 size={15} />
              Elimina {draft.name.split(' ')[0]}
            </ActionButton>
          ) : (
            <div className="mt-3">
              <Field label={`Scrivi ${draft.name.split(' ')[0]} per confermare`}>
                <TextInput
                  value={typed}
                  autoFocus
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={draft.name.split(' ')[0]}
                />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionButton
                  variant="danger"
                  onClick={remove}
                  disabled={saving || typed.trim().toLowerCase() !== draft.name.split(' ')[0].toLowerCase()}
                >
                  {saving ? 'Elimino…' : 'Elimina davvero'}
                </ActionButton>
                <ActionButton variant="quiet" onClick={() => setConfirming(false)}>
                  Annulla
                </ActionButton>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

/* ── Invito ─────────────────────────────────────────────────────── */

function InviteSheet({ token, onClose, onAdded }: {
  token: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Invito fallito.');
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open title="Invita una persona" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nome e cognome">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <Field label="Email">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Ruolo">
          <Select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'staff')}>
            <option value="staff">Staff</option>
            <option value="admin">Board</option>
          </Select>
        </Field>
        <p className="text-fine text-on-paper-muted">
          Riceve una mail per scegliere la password. Entra con tutte le sezioni accese: quelle che
          non le servono si spengono dopo.
        </p>
        {error && <p className="text-fine font-medium text-accent">{error}</p>}
        <ActionButton type="submit" disabled={saving}>
          {saving ? 'Invio…' : 'Manda l’invito'}
        </ActionButton>
      </form>
    </Sheet>
  );
}

/* ── Elenco ─────────────────────────────────────────────────────── */

export default function TeamManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tk = session?.access_token ?? '';
      setToken(tk);
      const res = await fetch('/api/team', { headers: { Authorization: `Bearer ${tk}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Impossibile leggere il team.');
      setMembers(data.members ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const order = { admin: 0, staff: 1, collaborator: 2 } as const;
    return members
      .filter((m) => !q || `${m.name} ${m.email}`.toLowerCase().includes(q))
      .sort((a, b) =>
        a.active === b.active
          ? order[a.role] - order[b.role] || a.name.localeCompare(b.name)
          : a.active ? -1 : 1,
      );
  }, [members, query]);

  const open = members.find((m) => m.id === openId) ?? null;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <PageHead
        title="Team"
        subtitle="Chi entra nel pannello e cosa vede. Quello che spegni qui sparisce dal suo menù."
        action={<NewButton label="Invita" onClick={() => setInviting(true)} />}
      />

      {error ? (
        <EmptyState
          title="Non riesco a leggere il team"
          body={error}
          action={<ActionButton onClick={load}>Riprova</ActionButton>}
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2.5 rounded-full border border-rule-paper px-4">
            <Search size={17} strokeWidth={1.8} className="shrink-0 text-on-paper-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca nome o email"
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

          {visible.length === 0 ? (
            <EmptyState title="Nessuno" body="Prova con un altro nome." />
          ) : (
            <div className="flex flex-col gap-1.5">
              {visible.map((m) => {
                const off = FEATURES.filter((f) => !isOn(m, f.key)).length;
                return (
                  <button
                    key={m.id}
                    onClick={() => setOpenId(m.id)}
                    className="flex items-center gap-3.5 rounded-2xl border border-rule-paper px-3.5 py-3 text-left transition-colors hover:border-accent/40"
                  >
                    <Monogram name={m.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body">{m.name}</p>
                      <p className="mt-0.5 truncate text-fine text-on-paper-muted">{m.email}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusPill tone={m.active ? (m.role === 'admin' ? 'good' : 'neutral') : 'off'}>
                        {m.active ? ROLE_LABEL[m.role] : 'Spento'}
                      </StatusPill>
                      {m.active && off > 0 && (
                        <span className="text-fine text-on-paper-muted">
                          {off} {off === 1 ? 'sezione spenta' : 'sezioni spente'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <p className="mt-5 text-fine text-on-paper-muted">
            Il board ({ADMIN_EMAILS.length} persone) apre tutto per definizione. Il super admin non
            si può spegnere né eliminare: è il pavimento sotto il sistema dei permessi.
          </p>
        </>
      )}

      {open && (
        <PersonSheet
          member={open}
          token={token}
          onClose={() => setOpenId(null)}
          onSaved={(next) => setMembers((list) => list.map((m) => (m.id === next.id ? next : m)))}
          onRemoved={(id) => {
            setMembers((list) => list.filter((m) => m.id !== id));
            setOpenId(null);
          }}
        />
      )}

      {inviting && (
        <InviteSheet
          token={token}
          onClose={() => setInviting(false)}
          onAdded={() => { setInviting(false); load(); }}
        />
      )}
    </>
  );
}
