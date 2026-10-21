'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RecordTable } from '@/components/admin/RecordTable';
import { candidature } from '@/lib/crm-resources';
import MembershipManager from '@/components/MembershipManager';
import MembershipArchive from '@/components/MembershipArchive';

/**
 * Soci e candidature, nello stesso posto.
 *
 * Erano due voci di menù separate, ma rispondono alla stessa domanda —
 * chi vuole stare con noi, e a che titolo — e tenerle distanti
 * costringeva a ricordare in quale delle due cercare una persona.
 *
 * Le tessere restano prime perché sono l'unica cosa con una scadenza:
 * le candidature possono aspettare un giorno, un rinnovo no.
 */

const KINDS = ['ambassador', 'company', 'creator', 'staff'] as const;
type Kind = (typeof KINDS)[number];
type Tab = 'tessere' | Kind | 'archivio';

const LABEL: Record<Tab, string> = {
  tessere: 'Tessere',
  archivio: 'Archivio',
  ambassador: 'Ambassador',
  company: 'Aziende',
  creator: 'Creator',
  staff: 'Staff',
};

export default function MembershipHub({ onChanged }: { onChanged?: () => void }) {
  const [tab, setTab] = useState<Tab>('tessere');
  const [counts, setCounts] = useState<Record<string, number>>({});

  /**
   * I numeri sulle schede: le tessere in scadenza e le candidature che
   * nessuno ha ancora guardato. Sono le due cose per cui vale la pena
   * aprire questa sezione, quindi si vedono prima di entrarci.
   */
  useEffect(() => {
    let annullato = false;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers = { Authorization: `Bearer ${session?.access_token ?? ''}` };

        const [appsRes, memRes] = await Promise.all([
          fetch('/api/collaboration-applications', { headers }),
          fetch('/api/memberships', { headers }),
        ]);
        if (annullato) return;

        const c: Record<string, number> = {};

        if (appsRes.ok) {
          const json = await appsRes.json();
          for (const a of json.applications ?? []) {
            if (a.stage === 'new') c[a.kind] = (c[a.kind] ?? 0) + 1;
          }
        }

        if (memRes.ok) {
          const json = await memRes.json();
          const oggi = new Date().toISOString().slice(0, 10);
          c.tessere = (json.memberships ?? []).filter(
            (m: { expires_at: string; cancelled_at: string | null }) => {
              if (m.cancelled_at) return false;
              const giorni = Math.round(
                (new Date(`${m.expires_at}T00:00:00`).getTime() -
                  new Date(`${oggi}T00:00:00`).getTime()) /
                  86_400_000,
              );
              return giorni >= 0 && giorni <= 30;
            },
          ).length;
        }

        if (annullato) return;
        setCounts(c);
        onChanged?.();
      } catch {
        /* i numeri sono un di più: senza, le schede funzionano comunque */
      }
    })();

    return () => {
      annullato = true;
    };
  }, [onChanged]);

  return (
    <div>
      <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(['tessere', ...KINDS, 'archivio'] as Tab[]).map((t) => {
          const on = tab === t;
          const n = counts[t] ?? 0;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-pressed={on}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-fine font-medium transition-colors ${
                on ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
              } ${t === 'tessere' ? 'mr-1' : ''}`}
            >
              {LABEL[t]}
              {n > 0 && (
                <span
                  className={`grid h-5 min-w-[20px] place-items-center rounded-full px-1 text-[11px] ${
                    on ? 'bg-paper/25' : 'bg-accent text-paper'
                  }`}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'tessere' ? (
        <MembershipManager />
      ) : tab === 'archivio' ? (
        <MembershipArchive />
      ) : (
        // `key` rimonta la tabella cambiando scheda: altrimenti
        // resterebbero attivi i filtri dell'elenco precedente.
        <RecordTable key={tab} resource={candidature(tab as Kind)} />
      )}
    </div>
  );
}
