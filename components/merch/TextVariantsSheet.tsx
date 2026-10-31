'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Plus, Trash2, Type } from 'lucide-react';
import { ActionButton, EmptyState, Field, Sheet, TextInput } from '@/components/admin/ui';
import { ImageUploader } from '@/components/merch/ImageUploader';
import type {
  Product,
  ProductCombination,
  ProductTextVariant,
  ProductVariant,
} from '@/components/merch/types';

/**
 * Le scritte personalizzabili, e le foto di ogni accoppiata
 * scritta + colore.
 *
 * È la parte più intricata del merch: una variante testo esiste da
 * sola, ma può avere una foto diversa per ciascun colore. Qui le
 * combinazioni stanno dentro la variante a cui appartengono, non in
 * una terza lista da incrociare a mente.
 */

function ComboRow({
  productId,
  textVariantId,
  colore,
  fotoIniziali,
  token,
}: {
  productId: string;
  textVariantId: string;
  colore: ProductVariant;
  fotoIniziali: string[];
  token: string;
}) {
  const [foto, setFoto] = useState<string[]>(fotoIniziali);
  const [salvando, setSalvando] = useState(false);
  const [salvato, setSalvato] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    setSalvando(true);
    setSalvato(false);
    setErrore('');
    try {
      const res = await fetch(`/api/merch/products/${productId}/variant-combinations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          text_variant_id: textVariantId,
          color_variant_id: colore.id,
          images: foto,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrore(data.error ?? `Errore ${res.status}`);
        return;
      }
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2500);
    } catch {
      setErrore('Errore di rete.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-rule-paper p-3.5">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="h-4 w-4 shrink-0 rounded-full border border-rule-paper"
          style={{ background: colore.color_hex }}
        />
        <span className="flex-1 truncate text-fine">{colore.display_name || colore.color_name}</span>
        {salvando && <Loader2 size={14} className="animate-spin text-accent/60" />}
        {salvato && !salvando && (
          <span className="inline-flex items-center gap-1 text-fine text-accent">
            <Check size={13} strokeWidth={2.4} /> salvato
          </span>
        )}
      </div>

      <ImageUploader images={foto} onChange={setFoto} token={token} label="Foto di questa combinazione" />

      {errore && <p className="text-fine text-accent">{errore}</p>}

      <ActionButton variant="quiet" onClick={salva} disabled={salvando} className="w-full">
        Salva questa combinazione
      </ActionButton>
    </div>
  );
}

function TextVariantRow({
  textVariant,
  productId,
  token,
  colori,
  combinazioni,
  aperta,
  onApri,
  onSalvata,
  onEliminata,
}: {
  textVariant: ProductTextVariant | null;
  productId: string;
  token: string;
  colori: ProductVariant[];
  combinazioni: ProductCombination[];
  aperta: boolean;
  onApri: () => void;
  onSalvata: (tv: ProductTextVariant) => void;
  onEliminata: (id: string) => void;
}) {
  const nuova = !textVariant;

  const [scritta, setScritta] = useState(textVariant?.text_label ?? '');
  const [foto, setFoto] = useState<string[]>(textVariant?.images ?? []);
  const [salvando, setSalvando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [conferma, setConferma] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    if (!scritta.trim()) {
      setErrore('La scritta è obbligatoria.');
      return;
    }
    setErrore('');
    setSalvando(true);
    try {
      const res = await fetch(
        nuova
          ? `/api/merch/products/${productId}/text-variants`
          : `/api/merch/products/${productId}/text-variants/${textVariant!.id}`,
        {
          method: nuova ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text_label: scritta.trim(), images: foto }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setErrore(data.error ?? 'Non sono riuscito a salvare.');
        return;
      }
      onSalvata(data.textVariant);
    } catch {
      setErrore('Errore di rete.');
    } finally {
      setSalvando(false);
    }
  }

  async function elimina() {
    if (!conferma) {
      setConferma(true);
      return;
    }
    setEliminando(true);
    try {
      await fetch(`/api/merch/products/${productId}/text-variants/${textVariant!.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onEliminata(textVariant!.id);
    } finally {
      setEliminando(false);
      setConferma(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-rule-paper">
      {!nuova && (
        <button
          type="button"
          onClick={onApri}
          aria-expanded={aperta}
          className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-paper-soft"
        >
          <Type size={16} strokeWidth={1.8} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1 truncate text-body">{textVariant!.text_label}</span>
          <span className="shrink-0 text-fine text-on-paper-muted">{textVariant!.images.length} foto</span>
          <span className="shrink-0 text-accent" style={{ transform: aperta ? 'rotate(45deg)' : undefined }}>
            +
          </span>
        </button>
      )}

      {aperta && (
        <div className={`flex flex-col gap-4 px-4 py-4 ${nuova ? '' : 'border-t border-rule-paper bg-paper-soft'}`}>
          <Field label="Scritta" hint="appare come opzione sulla pagina prodotto">
            <TextInput
              value={scritta}
              onChange={(e) => setScritta(e.target.value)}
              placeholder="es. Vivo, Amore, Salute…"
            />
          </Field>

          <ImageUploader images={foto} onChange={setFoto} token={token} />

          {!nuova && colori.length > 0 && (
            <div>
              <p className="text-fine font-medium text-on-paper">Foto per colore</p>
              <p className="mt-1 text-fine text-on-paper-muted">
                Quella che il cliente vede quando sceglie questa scritta e quel colore.
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                {colori.map((cv) => (
                  <ComboRow
                    key={cv.id}
                    productId={productId}
                    textVariantId={textVariant!.id}
                    colore={cv}
                    fotoIniziali={combinazioni.find((c) => c.color_variant_id === cv.id)?.images ?? []}
                    token={token}
                  />
                ))}
              </div>
            </div>
          )}

          {errore && <p className="text-fine text-accent">{errore}</p>}

          <div className="flex flex-wrap gap-2.5">
            {!nuova && (
              <button
                type="button"
                onClick={elimina}
                onBlur={() => setConferma(false)}
                disabled={eliminando}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-accent/40 px-4 text-fine font-medium text-accent transition-colors hover:bg-accent/5 disabled:opacity-45"
              >
                {eliminando ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} strokeWidth={1.8} />}
                {conferma ? 'Tocca ancora per eliminare' : 'Elimina'}
              </button>
            )}
            <ActionButton variant="quiet" onClick={onApri} className="flex-1">
              Annulla
            </ActionButton>
            <ActionButton onClick={salva} disabled={salvando} className="flex-1">
              {salvando && <Loader2 size={15} className="animate-spin" />}
              {nuova ? 'Crea' : 'Salva'}
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}

export function TextVariantsSheet({
  product,
  token,
  onClose,
}: {
  product: Product;
  token: string;
  onClose: () => void;
}) {
  const [scritte, setScritte] = useState<ProductTextVariant[]>([]);
  const [colori, setColori] = useState<ProductVariant[]>([]);
  const [combinazioni, setCombinazioni] = useState<ProductCombination[]>([]);
  const [caricando, setCaricando] = useState(true);
  const [apertaId, setApertaId] = useState<string | 'nuova' | null>(null);

  useEffect(() => {
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`/api/merch/products/${product.id}/text-variants`, { headers: h }).then((r) => r.json()),
      fetch(`/api/merch/products/${product.id}/variants`, { headers: h }).then((r) => r.json()),
      fetch(`/api/merch/products/${product.id}/variant-combinations`, { headers: h })
        .then((r) => r.json())
        .catch(() => ({ combinations: [] })),
    ])
      .then(([tv, v, comb]) => {
        setScritte(tv.textVariants ?? []);
        setColori(v.variants ?? []);
        setCombinazioni(comb.combinations ?? []);
      })
      .finally(() => setCaricando(false));
  }, [product.id, token]);

  function salvata(tv: ProductTextVariant) {
    setScritte((prev) =>
      prev.some((x) => x.id === tv.id) ? prev.map((x) => (x.id === tv.id ? tv : x)) : [...prev, tv],
    );
    setApertaId(null);
  }

  return (
    <Sheet
      open
      title={`Scritte · ${product.title}`}
      onClose={onClose}
      footer={
        <ActionButton
          variant="quiet"
          onClick={() => setApertaId('nuova')}
          disabled={apertaId === 'nuova'}
          className="w-full"
        >
          <Plus size={16} strokeWidth={2} />
          Nuova scritta
        </ActionButton>
      }
    >
      {caricando ? (
        <div className="flex justify-center py-10">
          <Loader2 size={22} className="animate-spin text-accent/50" />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {scritte.length === 0 && apertaId !== 'nuova' && (
            <EmptyState
              title="Nessuna scritta"
              body="Servono ai capi personalizzabili: il cliente sceglie quale vuole sul capo."
            />
          )}

          {scritte.map((tv) => (
            <TextVariantRow
              key={tv.id}
              textVariant={tv}
              productId={product.id}
              token={token}
              colori={colori}
              combinazioni={combinazioni.filter((c) => c.text_variant_id === tv.id)}
              aperta={apertaId === tv.id}
              onApri={() => setApertaId((id) => (id === tv.id ? null : tv.id))}
              onSalvata={salvata}
              onEliminata={(id) => setScritte((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}

          {apertaId === 'nuova' && (
            <TextVariantRow
              textVariant={null}
              productId={product.id}
              token={token}
              colori={[]}
              combinazioni={[]}
              aperta
              onApri={() => setApertaId(null)}
              onSalvata={salvata}
              onEliminata={() => undefined}
            />
          )}
        </div>
      )}
    </Sheet>
  );
}
