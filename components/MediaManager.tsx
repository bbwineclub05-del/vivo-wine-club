'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { EmptyState, PageHead } from '@/components/admin/ui';
import PhotoUploader from '@/components/admin/PhotoUploader';
import { PARTNERS } from '@/lib/partners';

/**
 * Le foto delle gallerie del sito.
 *
 * Era una schermata con cinque tipi di destinazione, due menù a tendina
 * incatenati, i campi della scheda cantina mescolati alle foto e un
 * caricamento che da telefono falliva quasi sempre. La scheda cantina
 * adesso sta dove ha senso — dentro Cantine — e qui resta una cosa
 * sola: scegli la galleria, aggiungi foto.
 *
 * Il caricamento vero è in PhotoUploader, che rimpicciolisce le
 * immagini nel browser prima di spedirle: è lì che stava il bug.
 */

interface Galleria {
  id: string;
  nome: string;
  /** La cartella nello spazio immagini. */
  folder: string;
  dove: string;
}

const FISSE: Galleria[] = [
  { id: 'wine-party', nome: 'Wine Party', folder: 'wine-party', dove: 'Pagina Wine Party' },
  { id: 'wine-lounge', nome: 'Wine Lounge', folder: 'wine-lounge', dove: 'Pagina Wine Lounge' },
  { id: 'winery-visit', nome: 'Winery Visit', folder: 'winery-visit', dove: 'Pagina Winery Visit' },
];

export default function MediaManager() {
  const [token, setToken] = useState('');
  const [aperta, setAperta] = useState<Galleria>(FISSE[0]);
  const [query, setQuery] = useState('');
  const [conteggi, setConteggi] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setToken(session?.access_token ?? ''));
  }, []);

  const gallerie = useMemo<Galleria[]>(
    () => [
      ...FISSE,
      ...PARTNERS.map((p: { slug: string; name: string }) => ({
        id: `partner-${p.slug}`,
        nome: p.name,
        folder: `partners/${p.slug}`,
        dove: 'Pagina del partner',
      })),
    ],
    [],
  );

  const visibili = useMemo(() => {
    const q = query.trim().toLowerCase();
    return gallerie.filter((g) => !q || g.nome.toLowerCase().includes(q));
  }, [gallerie, query]);

  const segnaConteggio = useCallback(
    (n: number) => setConteggi((c) => ({ ...c, [aperta.id]: n })),
    [aperta.id],
  );

  return (
    <>
      <PageHead
        title="Media"
        subtitle="Le foto delle gallerie pubbliche. Quelle delle cantine stanno dentro Cantine, sulla scheda di ciascuna."
      />

      <div className="mb-4 flex items-center gap-2.5 rounded-full border border-rule-paper px-4">
        <Search size={17} strokeWidth={1.8} className="shrink-0 text-on-paper-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca galleria"
          className="min-h-[48px] w-full bg-transparent text-body placeholder:text-on-paper-muted/60 focus:outline-none [font-size:16px]"
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Pulisci" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-paper-soft">
            <X size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      {visibili.length === 0 ? (
        <EmptyState title="Nessuna galleria" body="Prova con un altro nome." />
      ) : (
        <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibili.map((g) => {
            const on = aperta.id === g.id;
            const n = conteggi[g.id];
            return (
              <button
                key={g.id}
                onClick={() => setAperta(g)}
                aria-pressed={on}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-fine font-medium transition-colors ${
                  on ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
                }`}
              >
                {g.nome}
                {on && typeof n === 'number' && (
                  <span className="ds-numeric text-[11px] opacity-70">{n}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-rule-paper p-5">
        <p className="mb-1 text-body font-medium">{aperta.nome}</p>
        <p className="mb-4 text-fine text-on-paper-muted">{aperta.dove}</p>
        {/* `key` rimonta il caricatore cambiando galleria: senza, resterebbero
            in vista le foto di quella precedente mentre arrivano le nuove. */}
        <PhotoUploader key={aperta.id} folder={aperta.folder} token={token} onChanged={segnaConteggio} />
      </div>
    </>
  );
}
