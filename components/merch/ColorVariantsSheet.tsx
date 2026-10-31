'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { ActionButton, EmptyState, Field, Sheet, TextInput } from '@/components/admin/ui';
import { ImageUploader } from '@/components/merch/ImageUploader';
import { StockSection } from '@/components/merch/StockSection';
import type { Product, ProductVariant } from '@/components/merch/types';

/**
 * I colori di un prodotto, con le foto e i pezzi di ciascuno.
 *
 * Ogni colore è una riga che si apre: chiusa dice nome, pallino e
 * quante foto ha, aperta è il suo modulo. Così l'elenco resta corto
 * anche su un prodotto con sei colori, e da telefono non si scorre
 * per minuti.
 */

function VariantRow({
  variant,
  productId,
  sizes,
  token,
  aperta,
  onApri,
  onSalvata,
  onEliminata,
}: {
  variant: ProductVariant | null;
  productId: string;
  sizes: string[];
  token: string;
  aperta: boolean;
  onApri: () => void;
  onSalvata: (v: ProductVariant) => void;
  onEliminata: (id: string) => void;
}) {
  const nuova = !variant;

  const [nome, setNome] = useState(variant?.color_name ?? '');
  const [nomeCarrello, setNomeCarrello] = useState(variant?.display_name ?? '');
  const [hex, setHex] = useState(variant?.color_hex ?? '#731515');
  const [foto, setFoto] = useState<string[]>(variant?.images ?? []);
  const [salvando, setSalvando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [conferma, setConferma] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    if (!nome.trim()) {
      setErrore('Il nome del colore è obbligatorio.');
      return;
    }
    setErrore('');
    setSalvando(true);
    try {
      const res = await fetch(
        nuova
          ? `/api/merch/products/${productId}/variants`
          : `/api/merch/products/${productId}/variants/${variant!.id}`,
        {
          method: nuova ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            color_name: nome.trim(),
            display_name: nomeCarrello.trim() || null,
            color_hex: hex,
            images: foto,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setErrore(data.error ?? 'Non sono riuscito a salvare.');
        return;
      }
      onSalvata(data.variant);
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
      await fetch(`/api/merch/products/${productId}/variants/${variant!.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onEliminata(variant!.id);
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
          className="flex w-full min-h-[56px] items-center gap-3 px-4 text-left transition-colors hover:bg-paper-soft"
        >
          <span
            aria-hidden
            className="h-6 w-6 shrink-0 rounded-full border border-rule-paper"
            style={{ background: variant!.color_hex }}
          />
          <span className="min-w-0 flex-1 truncate text-body">
            {variant!.display_name || variant!.color_name}
            {variant!.display_name && variant!.display_name !== variant!.color_name && (
              <span className="ml-1.5 text-fine text-on-paper-muted">({variant!.color_name})</span>
            )}
          </span>
          <span className="shrink-0 text-fine text-on-paper-muted">
            {variant!.images.length} {variant!.images.length === 1 ? 'foto' : 'foto'}
          </span>
          <span className="shrink-0 text-accent transition-transform" style={{ transform: aperta ? 'rotate(45deg)' : undefined }}>
            +
          </span>
        </button>
      )}

      {aperta && (
        <div className={`flex flex-col gap-4 px-4 py-4 ${nuova ? '' : 'border-t border-rule-paper bg-paper-soft'}`}>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Field label="Nome del colore">
                <TextInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Nero, Bordeaux…" />
              </Field>
            </div>
            <label className="shrink-0">
              <span className="mb-2 block text-fine font-medium">Tinta</span>
              <input
                type="color"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                className="h-[52px] w-16 cursor-pointer rounded-2xl border border-rule-paper bg-paper p-1"
              />
            </label>
          </div>

          <Field label="Nome nel carrello" hint="vuoto = come sopra">
            <TextInput
              value={nomeCarrello}
              onChange={(e) => setNomeCarrello(e.target.value)}
              placeholder="es. Midnight Blue"
            />
          </Field>

          <ImageUploader images={foto} onChange={setFoto} token={token} label="Foto di questo colore" />

          {!nuova && (
            <div>
              <p className="mb-2 text-fine font-medium text-on-paper">Disponibilità</p>
              <StockSection productId={productId} sizes={sizes} token={token} variantId={variant!.id} />
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

export function ColorVariantsSheet({
  product,
  token,
  onClose,
}: {
  product: Product;
  token: string;
  onClose: () => void;
}) {
  const [varianti, setVarianti] = useState<ProductVariant[]>([]);
  const [caricando, setCaricando] = useState(true);
  const [apertaId, setApertaId] = useState<string | 'nuova' | null>(null);

  useEffect(() => {
    fetch(`/api/merch/products/${product.id}/variants`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setVarianti(d.variants ?? []))
      .finally(() => setCaricando(false));
  }, [product.id, token]);

  function salvata(v: ProductVariant) {
    setVarianti((prev) => (prev.some((x) => x.id === v.id) ? prev.map((x) => (x.id === v.id ? v : x)) : [...prev, v]));
    setApertaId(null);
  }

  return (
    <Sheet
      open
      title={`Colori · ${product.title}`}
      onClose={onClose}
      footer={
        <ActionButton
          variant="quiet"
          onClick={() => setApertaId('nuova')}
          disabled={apertaId === 'nuova'}
          className="w-full"
        >
          <Plus size={16} strokeWidth={2} />
          Nuovo colore
        </ActionButton>
      }
    >
      {caricando ? (
        <div className="flex justify-center py-10">
          <Loader2 size={22} className="animate-spin text-accent/50" />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {varianti.length === 0 && apertaId !== 'nuova' && (
            <EmptyState title="Nessun colore" body="Aggiungine uno: a ogni colore corrispondono foto e pezzi suoi." />
          )}

          {varianti.map((v) => (
            <VariantRow
              key={v.id}
              variant={v}
              productId={product.id}
              sizes={product.sizes}
              token={token}
              aperta={apertaId === v.id}
              onApri={() => setApertaId((id) => (id === v.id ? null : v.id))}
              onSalvata={salvata}
              onEliminata={(id) => setVarianti((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}

          {apertaId === 'nuova' && (
            <VariantRow
              variant={null}
              productId={product.id}
              sizes={product.sizes}
              token={token}
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
