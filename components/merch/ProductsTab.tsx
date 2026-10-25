'use client';

import { useState } from 'react';
import { ChevronRight, Loader2, Package, Pencil } from 'lucide-react';
import { ActionButton, EmptyState, Sheet, fieldClass } from '@/components/admin/ui';
import { colorHex, euro, type Product } from '@/components/merch/types';

/**
 * I prodotti dello shop, uno per scheda.
 *
 * Sotto ogni prodotto c'erano cinque icone da ventinove pixel, una
 * delle quali cancellava: adesso c'è un pulsante solo, e tutto il
 * resto sta nel foglio "Gestisci", dove ogni azione ha un nome e una
 * riga che spiega cosa fa.
 */

function ActionsSheet({
  product,
  token,
  onClose,
  onEdit,
  onColors,
  onTexts,
  onDeleted,
  onChanged,
}: {
  product: Product;
  token: string;
  onClose: () => void;
  onEdit: (p: Product) => void;
  onColors: (p: Product) => void;
  onTexts: (p: Product) => void;
  onDeleted: (id: string) => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [conferma, setConferma] = useState(false);

  async function cambiaVisibilita() {
    setBusy(true);
    await fetch(`/api/merch/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ visible: !product.visible }),
    });
    setBusy(false);
    onChanged();
    onClose();
  }

  async function elimina() {
    if (!conferma) {
      setConferma(true);
      return;
    }
    setBusy(true);
    await fetch(`/api/merch/products/${product.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    onDeleted(product.id);
    setBusy(false);
    onClose();
  }

  const azioni = [
    {
      label: 'Modifica prodotto',
      hint: 'Nome, prezzo, taglie, scheda tecnica',
      run: () => {
        onEdit(product);
        onClose();
      },
    },
    {
      label: 'Colori',
      hint: 'Colori disponibili, foto e pezzi di ciascuno',
      run: () => {
        onColors(product);
        onClose();
      },
    },
    {
      label: 'Scritte',
      hint: 'Testi personalizzabili sul capo',
      run: () => {
        onTexts(product);
        onClose();
      },
    },
    {
      label: product.visible ? 'Nascondi dallo shop' : 'Mostra nello shop',
      hint: product.visible
        ? 'Smette di comparire fra i prodotti in vendita'
        : 'Torna visibile sul sito pubblico',
      run: cambiaVisibilita,
    },
  ];

  return (
    <Sheet open title={product.title} onClose={onClose}>
      <ul className="flex flex-col gap-1">
        {azioni.map((a) => (
          <li key={a.label}>
            <button
              type="button"
              onClick={a.run}
              disabled={busy}
              className="w-full rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-paper-soft disabled:opacity-50"
            >
              <span className="block text-body font-medium">{a.label}</span>
              <span className="mt-0.5 block text-fine text-on-paper-muted">{a.hint}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="my-4 h-px bg-rule-paper" />

      <button
        type="button"
        onClick={elimina}
        onBlur={() => setConferma(false)}
        disabled={busy}
        className="w-full rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-accent/5 disabled:opacity-50"
      >
        <span className="block text-body font-medium text-accent">
          {conferma ? 'Tocca ancora per eliminare' : 'Elimina prodotto'}
        </span>
        {conferma && (
          <span className="mt-0.5 block text-fine text-on-paper-muted">Non si può tornare indietro.</span>
        )}
      </button>
    </Sheet>
  );
}

function ProductCard({ product, onManage }: { product: Product; onManage: (p: Product) => void }) {
  const copertina = (product.product_variants ?? []).flatMap((v) => v.images).find(Boolean) ?? '';

  return (
    // `h-full` + colonna: le schede di una riga finiscono tutte alla
    // stessa altezza e il pulsante si allinea, anche quando una ha le
    // taglie e i colori e quella accanto no.
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-rule-paper">
      {/* La foto sta *sopra* il riquadro, non dentro al flusso.
          Dentro, la sua altezza naturale diventava l'altezza del
          riquadro e il quadrato saltava: ecco perche' alcune schede
          venivano piu' alte di altre pur avendo lo stesso contenuto. */}
      <div className="relative aspect-square shrink-0 overflow-hidden bg-paper-soft">
        {copertina ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={copertina} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-on-paper-muted/40">
            <Package size={30} strokeWidth={1.5} />
          </div>
        )}
        {!product.visible && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-fine font-medium text-on-ink">
            Nascosto
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="min-w-0 text-body font-medium">{product.title}</p>
          <p className="ds-numeric shrink-0 text-body text-accent">{euro(product.price)}</p>
        </div>

        {(product.sizes.length > 0 || product.colors.length > 0) && (
          <p className="mb-4 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-fine text-on-paper-muted">
            {product.sizes.length > 0 && <span>{product.sizes.join(' · ')}</span>}
            {product.colors.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                {product.colors.slice(0, 6).map((c) => (
                  <span
                    key={c}
                    title={c}
                    aria-hidden
                    className="h-3.5 w-3.5 rounded-full border border-rule-paper"
                    style={{ background: colorHex(c) }}
                  />
                ))}
                {product.colors.length} colori
              </span>
            )}
          </p>
        )}

        {/* `mt-auto`: il pulsante va in fondo alla scheda, quindi su
            una riga sono tutti alla stessa altezza. */}
        <ActionButton variant="quiet" onClick={() => onManage(product)} className="mt-auto w-full">
          Gestisci
          <ChevronRight size={16} strokeWidth={1.8} />
        </ActionButton>
      </div>
    </article>
  );
}

export function ProductsTab({
  products,
  token,
  shippingCost,
  onShippingSaved,
  onEdit,
  onColors,
  onTexts,
  onDeleted,
  onChanged,
}: {
  products: Product[];
  token: string;
  shippingCost: string;
  onShippingSaved: (v: string) => void;
  onEdit: (p: Product) => void;
  onColors: (p: Product) => void;
  onTexts: (p: Product) => void;
  onDeleted: (id: string) => void;
  onChanged: () => void;
}) {
  const [azioniSu, setAzioniSu] = useState<Product | null>(null);
  const [modificaSpedizione, setModificaSpedizione] = useState(false);
  const [valore, setValore] = useState(shippingCost);
  const [salvando, setSalvando] = useState(false);

  async function salvaSpedizione() {
    setSalvando(true);
    try {
      await fetch('/api/merch/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shipping_cost: Number(valore) }),
      });
      onShippingSaved(valore);
      setModificaSpedizione(false);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rule-paper px-4 py-3">
        <div>
          <p className="text-fine text-on-paper-muted">Spedizione, quando il prodotto non ne ha una sua</p>
          {!modificaSpedizione && (
            <p className="ds-numeric mt-0.5 text-body font-medium">
              {shippingCost !== '' ? euro(Number(shippingCost)) : '—'}
            </p>
          )}
        </div>

        {modificaSpedizione ? (
          <div className="flex items-center gap-2.5">
            <input
              type="number"
              min="0"
              step="0.01"
              aria-label="Costo di spedizione globale"
              value={valore}
              onChange={(e) => setValore(e.target.value)}
              className={`${fieldClass} w-24 py-2.5 text-center`}
            />
            <ActionButton onClick={salvaSpedizione} disabled={salvando}>
              {salvando && <Loader2 size={15} className="animate-spin" />}
              Salva
            </ActionButton>
            <ActionButton
              variant="quiet"
              onClick={() => {
                setModificaSpedizione(false);
                setValore(shippingCost);
              }}
            >
              Annulla
            </ActionButton>
          </div>
        ) : (
          <ActionButton variant="quiet" onClick={() => setModificaSpedizione(true)}>
            <Pencil size={15} strokeWidth={1.8} />
            Cambia
          </ActionButton>
        )}
      </div>

      {products.length === 0 ? (
        <EmptyState title="Nessun prodotto" body="Creane uno con «Nuovo prodotto» qui sopra." />
      ) : (
        // `auto-rows-fr`: tutte le righe alte uguale, non solo le schede
        // dentro la stessa riga. Senza, una riga con un titolo su due
        // righe diventa piu' alta delle altre, e l'occhio lo legge come
        // un errore.
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onManage={setAzioniSu} />
          ))}
        </div>
      )}

      {azioniSu && (
        <ActionsSheet
          product={azioniSu}
          token={token}
          onClose={() => setAzioniSu(null)}
          onEdit={onEdit}
          onColors={onColors}
          onTexts={onTexts}
          onDeleted={onDeleted}
          onChanged={onChanged}
        />
      )}
    </>
  );
}
