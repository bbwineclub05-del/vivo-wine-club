'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RecordTable } from '@/components/admin/RecordTable';
import { candidature } from '@/lib/crm-resources';

/**
 * Le candidature di chi vuole lavorare con il club.
 *
 * Quattro elenchi sopra una tabella sola. Il pannello di prima leggeva
 * da due tabelle con due forme diverse e sapeva fare una cosa: segnare
 * una candidatura accettata o rifiutata. Qui ognuna è un rapporto che
 * si segue — a che punto siamo, chi se ne occupa, quando riprenderla
 * in mano — con lo stesso impianto delle rubriche del CRM.
 *
 * Le trentanove richieste di diventare socio non stanno qui: una
 * tessera si compra e non si chiede, quindi non c'è niente da valutare.
 */

const KINDS = ['ambassador', 'company', 'creator', 'staff'] as const;
type Kind = (typeof KINDS)[number];

const LABEL: Record<Kind, string> = {
  ambassador: 'Ambassador',
  company: 'Aziende',
  creator: 'Creator',
  staff: 'Staff',
};

export default function ApplicationsManager({ onChanged }: { onChanged?: () => void }) {
  const [kind, setKind] = useState<Kind>('ambassador');
  const [counts, setCounts] = useState<Record<string, number>>({});

  /**
   * I numeri sulle schede: quante candidature sono arrivate e nessuno
   * ha ancora guardato. Si leggono una volta al montaggio; l'elenco
   * sotto si ricarica da sé quando si cambia qualcosa.
   */
  useEffect(() => {
    let annullato = false;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch('/api/collaboration-applications', {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        });
        if (!res.ok || annullato) return;
        const json = await res.json();
        const c: Record<string, number> = {};
        for (const a of json.applications ?? []) {
          if (a.stage === 'new') c[a.kind] = (c[a.kind] ?? 0) + 1;
        }
        if (annullato) return;
        setCounts(c);
        onChanged?.();
      } catch {
        /* i numeri sono un di più: se non arrivano, l'elenco funziona comunque */
      }
    })();

    return () => {
      annullato = true;
    };
    // `onChanged` dal genitore e' una useCallback stabile.
  }, [onChanged]);

  return (
    <div>
      <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {KINDS.map((k) => {
          const on = kind === k;
          const n = counts[k] ?? 0;
          return (
            <button
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={on}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-fine font-medium transition-colors ${
                on ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
              }`}
            >
              {LABEL[k]}
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

      {/* `key` rimonta la tabella quando si cambia scheda: altrimenti
          resterebbero attivi i filtri dell'elenco precedente. */}
      <RecordTable key={kind} resource={candidature(kind)} />
    </div>
  );
}
