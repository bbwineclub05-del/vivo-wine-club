'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, Search, Ticket, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOverlayBackClose } from '@/lib/useMobileOverlay';
import {
  ActionButton,
  EmptyState,
  Field,
  PageHead,
  Sheet,
  TextArea,
  TextInput,
} from '@/components/admin/ui';
import { formatEur } from '@/lib/ledger';

/**
 * Membri.
 *
 * Fino a ieri questa pagina diceva a tutti zero eventi e zero spesa.
 * Non perché fosse vero: l'API chiedeva due colonne che non esistono,
 * la query falliva a ogni caricamento e l'errore veniva solo scritto
 * nei log. Ora i numeri arrivano, e undici account hanno dei biglietti.
 *
 * La distinzione che conta è fra chi ha una membership e chi ha solo
 * fatto un account per comprare un biglietto: i secondi sono
 * "Registrato" e non hanno una tessera. Oggi sono venticinque su
 * quarantacinque.
 */

interface Member {
  id: string;
  email: string;
  name: string;
  city: string | null;
  phone: string | null;
  member_id: string | null;
  member_since: number | null;
  tier: string | null;
  created_at: string;
  last_sign_in: string | null;
  events: string[];
  tickets: number;
  spend: number;
}

const TIERS = ['Member', 'Founder', 'Staff'] as const;
const NO_TIER = 'Registrato';

function tierOf(m: Member) {
  return m.tier?.trim() || NO_TIER;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function TierPill({ tier }: { tier: string }) {
  // Solo "Member" è acceso: è l'unico che risponde alla domanda per cui
  // si apre questa pagina.
  const strong = tier === 'Member';
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-fine ${
        strong ? 'border-accent/35 bg-accent/8 text-accent' : 'border-rule-paper text-on-paper-muted'
      }`}
    >
      {tier}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Scheda
───────────────────────────────────────────── */
function MemberSheet({ member, onClose }: { member: Member | null; onClose: () => void }) {
  useOverlayBackClose(!!member, onClose);
  if (!member) return null;

  return (
    <Sheet open title={member.name} onClose={onClose}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TierPill tier={tierOf(member)} />
        {member.member_id && (
          <span className="text-fine text-on-paper-muted">Tessera {member.member_id}</span>
        )}
      </div>

      <dl className="grid gap-px overflow-hidden rounded-2xl border border-rule-paper bg-rule-paper">
        {[
          { k: 'Email', v: member.email },
          { k: 'Telefono', v: member.phone || '—' },
          { k: 'Città', v: member.city || '—' },
          { k: 'Membro dal', v: member.member_since ? String(member.member_since) : '—' },
          { k: 'Account creato', v: fmtDate(member.created_at) },
          { k: 'Ultimo accesso', v: fmtDate(member.last_sign_in) },
          { k: 'Biglietti pagati', v: String(member.tickets) },
          { k: 'Speso', v: member.spend > 0 ? formatEur(Math.round(member.spend * 100)) : '—' },
        ].map((r) => (
          <div key={r.k} className="flex flex-wrap gap-x-4 gap-y-1 bg-paper px-4 py-3">
            <dt className="min-w-[130px] shrink-0 text-fine text-on-paper-muted">{r.k}</dt>
            <dd className="min-w-0 break-words text-body">{r.v}</dd>
          </div>
        ))}
      </dl>

      {member.events.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-fine font-medium">Eventi</p>
          <div className="flex flex-wrap gap-2">
            {member.events.map((e) => (
              <span
                key={e}
                className="inline-flex items-center rounded-full border border-rule-paper px-3 py-1 text-fine text-on-paper-muted"
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   Scrivi
───────────────────────────────────────────── */
function ComposeSheet({
  recipients,
  token,
  onClose,
  onSent,
}: {
  recipients: { email: string; name: string }[];
  token: string;
  onClose: () => void;
  onSent: (msg: string) => void;
}) {
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    if (!subject.trim() || !text.trim()) {
      setError('Servono oggetto e testo.');
      return;
    }
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/crm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'custom', recipients, subject: subject.trim(), text: text.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Invio non riuscito.');
      onSent(`Mail inviata a ${data.sent ?? recipients.length} persone.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet
      open
      title={`Scrivi a ${recipients.length}`}
      onClose={onClose}
      footer={
        <div className="flex gap-2.5">
          <ActionButton variant="quiet" onClick={onClose} className="flex-1">
            Annulla
          </ActionButton>
          <ActionButton onClick={send} disabled={sending} className="flex-[2]">
            {sending ? 'Invio…' : 'Invia'}
          </ActionButton>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Oggetto">
          <TextInput autoFocus value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Messaggio" hint="— {{name}} diventa il nome di chi legge">
          <TextArea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Ciao {{name}},\n\n…'}
          />
        </Field>
        <p className="text-fine text-on-paper-muted">
          Sono persone con un account sul sito: ricevono comunicazioni che riguardano il loro
          rapporto col club.
        </p>
        {error && <p className="text-fine font-medium text-accent">{error}</p>}
      </div>
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   Membri
───────────────────────────────────────────── */
export default function MemberCRM() {
  const [members, setMembers] = useState<Member[]>([]);
  const [priced, setPriced] = useState({ priced: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');

  const [tier, setTier] = useState<string>('');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<Member | null>(null);
  const [compose, setCompose] = useState(false);

  useOverlayBackClose(compose, () => setCompose(false));

  const load = useCallback(async () => {
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tk = session?.access_token ?? '';
      setToken(tk);
      const res = await fetch('/api/crm/members', { headers: { Authorization: `Bearer ${tk}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Impossibile leggere i membri.');
      setMembers(json.members ?? []);
      setPriced({ priced: json.pricedEvents ?? 0, total: json.totalEvents ?? 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of members) {
      const t = tierOf(m);
      c[t] = (c[t] ?? 0) + 1;
    }
    return c;
  }, [members]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (tier && tierOf(m) !== tier) return false;
      if (q && !`${m.name} ${m.email} ${m.member_id ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [members, tier, query]);

  const recipients = useMemo(() => {
    const seen = new Set<string>();
    const out: { email: string; name: string }[] = [];
    for (const m of visible) {
      const e = m.email.trim().toLowerCase();
      if (!e || !e.includes('@') || seen.has(e)) continue;
      seen.add(e);
      out.push({ email: e, name: m.name });
    }
    return out;
  }, [visible]);

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
        title="Membri"
        subtitle={`${counts.Member ?? 0} con la membership su ${members.length} account registrati.`}
        action={
          <ActionButton onClick={() => setCompose(true)} disabled={recipients.length === 0}>
            <Mail size={17} strokeWidth={1.9} />
            Scrivi a {recipients.length}
          </ActionButton>
        }
      />

      {message && (
        <p className="mb-5 rounded-2xl border border-rule-paper px-4 py-3 text-fine font-medium">
          {message}
        </p>
      )}

      {error ? (
        <EmptyState
          title="Non riesco a leggere i membri"
          body={error}
          action={<ActionButton onClick={load}>Riprova</ActionButton>}
        />
      ) : (
        <>
          <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[{ id: '', label: `Tutti · ${members.length}` }, ...[...TIERS, NO_TIER].map((t) => ({
              id: t,
              label: `${t} · ${counts[t] ?? 0}`,
            }))].map((o) => (
              <button
                key={o.id || 'all'}
                onClick={() => setTier(o.id)}
                aria-pressed={tier === o.id}
                className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full border px-3.5 text-fine font-medium transition-colors ${
                  tier === o.id
                    ? 'border-accent bg-accent text-paper'
                    : 'border-rule-paper text-on-paper'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="mb-5 flex min-w-[220px] items-center gap-2.5 rounded-full border border-rule-paper px-4">
            <Search size={17} strokeWidth={1.8} className="shrink-0 text-on-paper-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca nome, email o tessera"
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
            <EmptyState title="Nessuno corrisponde" body="Prova ad allargare i filtri." />
          ) : (
            <div className="flex flex-col gap-1.5">
              {visible.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setDetail(m)}
                  className="flex min-h-[68px] w-full items-center gap-3 rounded-2xl border border-rule-paper px-3.5 py-3 text-left transition-colors hover:border-accent/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 truncate text-body">{m.name}</span>
                      <TierPill tier={tierOf(m)} />
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 truncate text-fine text-on-paper-muted">
                      {m.email}
                      {m.tickets > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Ticket size={12} strokeWidth={1.9} />
                          {m.tickets} {m.tickets === 1 ? 'biglietto' : 'biglietti'}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <p className="mt-5 text-fine text-on-paper-muted">
            {visible.length} di {members.length}.
            {priced.total > 0 && priced.priced < priced.total && (
              <>
                {' '}
                La spesa è calcolabile solo sugli eventi che hanno un prezzo in anagrafica:{' '}
                {priced.priced} su {priced.total}. Per gli altri risulta zero anche se il biglietto
                è stato pagato.
              </>
            )}
          </p>
        </>
      )}

      <MemberSheet member={detail} onClose={() => setDetail(null)} />

      {compose && (
        <ComposeSheet
          recipients={recipients}
          token={token}
          onClose={() => setCompose(false)}
          onSent={(m) => {
            setMessage(m);
            setCompose(false);
          }}
        />
      )}
    </div>
  );
}
