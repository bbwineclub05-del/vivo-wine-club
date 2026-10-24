'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { ActionButton } from '@/components/admin/ui';
import { resizeImage } from '@/lib/image-resize';

/**
 * Caricare foto, da un telefono, senza sorprese.
 *
 * Tre cose non andavano.
 *
 * La prima: il file partiva com'era uscito dalla fotocamera. Una foto
 * di iPhone pesa fra i tre e i sei megabyte, e la richiesta veniva
 * rifiutata prima ancora di arrivare al server, che accetta quattro
 * megabyte e mezzo. Dal telefono, cioè proprio dove si scattano le
 * foto, il caricamento falliva quasi sempre. Adesso l'immagine viene
 * rimpicciolita qui, nel browser, prima di partire: resta sotto il
 * mezzo megabyte e viaggia anche in 3G.
 *
 * La seconda: gli errori arrivavano con un `alert()` per ogni file —
 * dieci foto sbagliate, dieci finestre da chiudere a mano. Ora ogni
 * foto porta il suo stato addosso.
 *
 * La terza: le immagini che il server non riusciva a convertire
 * venivano salvate comunque con l'estensione sbagliata, e il risultato
 * era un riquadro rotto che nessuno capiva. Qui la conversione avviene
 * prima, e se non riesce la foto non parte.
 */

interface Caricata {
  url: string;
  path: string;
}

interface InCorso {
  nome: string;
  anteprima: string;
  stato: 'attesa' | 'invio' | 'fatto' | 'errore';
  errore?: string;
}

export default function PhotoUploader({
  folder,
  token,
  onChanged,
  onUploaded,
}: {
  /** La cartella dentro lo spazio immagini, es. `wineries/chateau-latour`. */
  folder: string;
  token: string;
  onChanged?: (totale: number) => void;
  /** Riceve l'indirizzo dell'ultima foto caricata: per chi ne vuole una sola. */
  onUploaded?: (url: string) => void;
}) {
  const [foto, setFoto] = useState<Caricata[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [inCorso, setInCorso] = useState<InCorso[]>([]);
  const [daEliminare, setDaEliminare] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const carica = useCallback(async () => {
    try {
      const res = await fetch(`/api/media?folder=${encodeURIComponent(folder)}`);
      const json = await res.json();
      const lista: Caricata[] = json.images ?? [];
      setFoto(lista);
      onChanged?.(lista.length);
    } catch {
      /* l'elenco vuoto è già un messaggio */
    } finally {
      setCaricamento(false);
    }
  }, [folder, onChanged]);

  useEffect(() => { carica(); }, [carica]);

  async function scegli(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = '';
    if (files.length === 0) return;

    const coda: InCorso[] = files.map((f) => ({
      nome: f.name,
      anteprima: URL.createObjectURL(f),
      stato: 'attesa',
    }));
    setInCorso(coda);

    const nuove: Caricata[] = [];
    for (let i = 0; i < files.length; i++) {
      setInCorso((c) => c.map((x, j) => (j === i ? { ...x, stato: 'invio' } : x)));
      try {
        const ridotta = await resizeImage(files[i]);
        const fd = new FormData();
        fd.append('file', ridotta);
        fd.append('folder', folder);

        const res = await fetch('/api/media/upload', {
          method: 'POST',
          body: fd,
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.url) throw new Error(json.error ?? 'Caricamento rifiutato.');

        nuove.push({ url: json.url, path: json.path });
        setInCorso((c) => c.map((x, j) => (j === i ? { ...x, stato: 'fatto' } : x)));
      } catch (err) {
        setInCorso((c) =>
          c.map((x, j) =>
            j === i
              ? { ...x, stato: 'errore', errore: err instanceof Error ? err.message : 'Errore.' }
              : x,
          ),
        );
      }
    }

    if (nuove.length > 0) {
      setFoto((f) => [...nuove, ...f]);
      onChanged?.(foto.length + nuove.length);
      onUploaded?.(nuove[nuove.length - 1].url);
    }

    // Le righe andate a buon fine spariscono da sole; gli errori restano.
    setTimeout(() => {
      setInCorso((c) => {
        c.filter((x) => x.stato === 'fatto').forEach((x) => URL.revokeObjectURL(x.anteprima));
        return c.filter((x) => x.stato === 'errore');
      });
    }, 1200);
  }

  async function elimina(path: string) {
    setDaEliminare(null);
    const prima = foto;
    setFoto((f) => f.filter((x) => x.path !== path));
    try {
      const res = await fetch(`/api/media?path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      onChanged?.(prima.length - 1);
    } catch {
      setFoto(prima); // non è stata tolta davvero: torna com'era
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={scegli}
      />

      <ActionButton onClick={() => inputRef.current?.click()}>
        <ImagePlus size={17} strokeWidth={1.9} />
        Aggiungi foto
      </ActionButton>

      {inCorso.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          {inCorso.map((x, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-rule-paper px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.anteprima} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
              <span className="min-w-0 flex-1 truncate text-fine">{x.nome}</span>
              {x.stato === 'invio' && <Loader2 size={15} className="shrink-0 animate-spin text-accent" />}
              {x.stato === 'attesa' && <span className="shrink-0 text-fine text-on-paper-muted">in coda</span>}
              {x.stato === 'fatto' && <span className="shrink-0 text-fine text-accent">caricata</span>}
              {x.stato === 'errore' && <span className="shrink-0 text-fine text-accent">{x.errore}</span>}
            </div>
          ))}
        </div>
      )}

      {caricamento ? (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-paper-soft" />
          ))}
        </div>
      ) : foto.length === 0 ? (
        <p className="mt-4 text-fine text-on-paper-muted">Nessuna foto, per ora.</p>
      ) : (
        <>
          <p className="mt-5 text-fine text-on-paper-muted">
            {foto.length} {foto.length === 1 ? 'foto' : 'foto'} · si vedono sul sito
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {foto.map((f) => (
              <div key={f.path} className="group relative aspect-square overflow-hidden rounded-xl bg-paper-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                <button
                  onClick={() => setDaEliminare(daEliminare === f.path ? null : f.path)}
                  aria-label="Elimina foto"
                  className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full bg-ink/70 text-on-ink backdrop-blur-sm transition-colors hover:bg-ink"
                >
                  <Trash2 size={14} strokeWidth={1.9} />
                </button>
                {daEliminare === f.path && (
                  <button
                    onClick={() => elimina(f.path)}
                    className="absolute inset-x-0 bottom-0 bg-accent py-2 text-fine font-medium text-paper"
                  >
                    Confermi?
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
