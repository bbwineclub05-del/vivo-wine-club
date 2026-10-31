'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ActionButton, EmptyState, PageHead, StatusPill } from '@/components/admin/ui';

/**
 * Chi vuole la bottiglia del mese.
 *
 * Serve a decidere, non ad amministrare: finché non si superano le
 * trenta mani alzate, costruire abbonamenti ricorrenti e spedizioni
 * mensili è lavoro fatto al buio.
 */

interface Interesse {
  id: string;
  email: string;
  full_name: string | null;
  preference: string | null;
  created_at: string;
}

const LABEL: Record<string, string> = { rosso: 'Rossi', bianco: 'Bianchi', misto: 'Misto' };

export default function BottleInterestList() {
  const [list, setList] = useState<Interesse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/bottle-interest?all=1', {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Impossibile leggere l’elenco.');
      setList(j.interests ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const conta = (p: string) => list.filter((i) => (i.preference ?? 'misto') === p).length;

  return (
    <>
      <PageHead
        title="Bottiglia del mese"
        subtitle="Chi ha alzato la mano per il secondo livello di tessera. Nessuno ha ancora pagato niente."
      />

      {error ? (
        <EmptyState title="Non riesco a leggere l’elenco" body={error} action={<ActionButton onClick={load}>Riprova</ActionButton>} />
      ) : list.length === 0 ? (
        <EmptyState
          title="Ancora nessuno"
          body="La proposta compare nell’area del socio, sotto la tessera. Qui arrivano i nomi di chi risponde."
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { l: 'Interessati', v: list.length },
              { l: 'Rossi', v: conta('rosso') },
              { l: 'Bianchi', v: conta('bianco') },
              { l: 'Misto', v: conta('misto') },
            ].map((k) => (
              <div key={k.l} className="rounded-2xl border border-rule-paper p-4">
                <p className="text-fine text-on-paper-muted">{k.l}</p>
                <p className="ds-display mt-2 text-[27px] leading-none tracking-[-0.02em]">{k.v}</p>
              </div>
            ))}
          </div>

          {list.length < 30 && (
            <p className="mb-4 text-fine text-on-paper-muted">
              Sotto le trenta mani alzate conviene aspettare: una spedizione mensile singola costa
              quasi quanto la bottiglia.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            {list.map((i) => (
              <div key={i.id} className="flex items-center gap-3 rounded-2xl border border-rule-paper px-3.5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body">{i.full_name || i.email}</span>
                  <span className="mt-0.5 block truncate text-fine text-on-paper-muted">{i.email}</span>
                </span>
                <StatusPill>{LABEL[i.preference ?? 'misto'] ?? 'Misto'}</StatusPill>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
