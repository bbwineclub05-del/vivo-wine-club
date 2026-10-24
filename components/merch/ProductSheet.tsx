'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  ActionButton,
  Field,
  Sheet,
  TextArea,
  TextInput,
  fieldClass,
} from '@/components/admin/ui';
import { StockSection } from '@/components/merch/StockSection';
import { ALL_SIZES, toSlug, type Product } from '@/components/merch/types';

/**
 * La scheda di un prodotto: crearlo o cambiarlo.
 *
 * Le quattro caselle di "additional info" stanno in fondo, dietro una
 * riga che le apre: servono a chi compila la pagina pubblica, non a
 * chi mette in vendita una maglietta di fretta.
 */
export function ProductSheet({
  product,
  token,
  onClose,
  onSaved,
}: {
  product: Product | null;
  token: string;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const modifica = !!product;

  const [titolo, setTitolo] = useState(product?.title ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [descrizione, setDescrizione] = useState(product?.description ?? '');
  const [prezzo, setPrezzo] = useState<string>(product ? String(product.price) : '');
  const [spedizione, setSpedizione] = useState<string>(
    product?.shipping_cost != null ? String(product.shipping_cost) : '',
  );
  const [taglie, setTaglie] = useState<string[]>(product?.sizes ?? []);
  const [visibile, setVisibile] = useState(product?.visible ?? true);
  const [qtaIniziale, setQtaIniziale] = useState<Record<string, number>>({});
  const [dettagli, setDettagli] = useState({
    material: product?.details?.material ?? '',
    dimensions: product?.details?.dimensions ?? '',
    care: product?.details?.care ?? '',
    shipping: product?.details?.shipping ?? '',
  });
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState('');

  function cambiaTitolo(v: string) {
    setTitolo(v);
    if (!modifica && !slug) setSlug(toSlug(v));
  }

  function toggleTaglia(s: string) {
    setTaglie((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    if (!titolo.trim() || !prezzo) {
      setErrore('Titolo e prezzo sono obbligatori.');
      return;
    }
    setErrore('');
    setSalvando(true);

    try {
      const info: Record<string, string> = {};
      for (const [k, v] of Object.entries(dettagli)) if (v.trim()) info[k] = v.trim();

      const body: Record<string, unknown> = {
        title: titolo.trim(),
        description: descrizione,
        price: Number(prezzo),
        sizes: taglie,
        visible: visibile,
        shipping_cost: spedizione !== '' ? Number(spedizione) : null,
        slug: slug.trim() || null,
        details: Object.keys(info).length > 0 ? info : null,
      };

      if (!modifica) {
        const iniziale: Record<string, number> = {};
        if (taglie.length > 0) for (const s of taglie) iniziale[s] = qtaIniziale[s] ?? 0;
        else iniziale._ = qtaIniziale._ ?? 0;
        body.initialStock = iniziale;
      }

      const res = await fetch(
        modifica ? `/api/merch/products/${product!.id}` : '/api/merch/products',
        {
          method: modifica ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setErrore(data.error ?? 'Non sono riuscito a salvare.');
        return;
      }
      onSaved(data.product);
      onClose();
    } catch {
      setErrore('Errore di rete.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Sheet
      open
      title={modifica ? 'Modifica prodotto' : 'Nuovo prodotto'}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <ActionButton variant="quiet" onClick={onClose} className="flex-1">
            Annulla
          </ActionButton>
          {/* `form` invece di annidare un submit dentro ActionButton:
              il modulo sta nel corpo del foglio, il pulsante nel piede. */}
          <button
            type="submit"
            form="prodotto"
            disabled={salvando}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-accent px-5 text-fine font-medium text-paper transition-colors hover:bg-accent-lift disabled:opacity-45"
          >
            {salvando && <Loader2 size={15} className="animate-spin" />}
            {salvando ? 'Salvo…' : modifica ? 'Salva' : 'Crea prodotto'}
          </button>
        </div>
      }
    >
      <form id="prodotto" onSubmit={invia} className="flex flex-col gap-5">
        <Field label="Titolo">
          <TextInput
            required
            value={titolo}
            onChange={(e) => cambiaTitolo(e.target.value)}
            placeholder="es. Classic Tee"
          />
        </Field>

        <Field label="Indirizzo della pagina" hint="/wear-the-club/…">
          <TextInput
            value={slug}
            onChange={(e) => setSlug(toSlug(e.target.value))}
            placeholder="classic-tee"
          />
        </Field>

        <Field label="Descrizione">
          <TextArea
            rows={3}
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            placeholder="Com'è fatto, come sta addosso…"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Prezzo (€)">
            <TextInput
              type="number"
              required
              min="0"
              step="0.01"
              value={prezzo}
              onChange={(e) => setPrezzo(e.target.value)}
              placeholder="35.00"
            />
          </Field>
          <Field label="Spedizione (€)" hint="vuoto = costo globale">
            <TextInput
              type="number"
              min="0"
              step="0.01"
              value={spedizione}
              onChange={(e) => setSpedizione(e.target.value)}
              placeholder="—"
            />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-fine font-medium text-on-paper">
            Taglie
            <span className="ml-2 font-normal text-on-paper-muted">
              {taglie.length === 0 ? 'nessuna: prodotto a taglia unica' : ''}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_SIZES.map((s) => {
              const on = taglie.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleTaglia(s)}
                  aria-pressed={on}
                  className={`min-h-[44px] rounded-full border px-4 text-fine font-medium transition-colors ${
                    on ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {!modifica && (
          <div>
            <p className="mb-2 text-fine font-medium text-on-paper">Pezzi disponibili</p>
            <div className="flex flex-wrap gap-3">
              {(taglie.length > 0 ? taglie : ['_']).map((s) => (
                <label key={s} className="flex items-center gap-2">
                  <span className="w-16 text-fine text-on-paper-muted">
                    {s === '_' ? 'Quantità' : s}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={qtaIniziale[s] ?? 0}
                    onChange={(e) =>
                      setQtaIniziale((p) => ({
                        ...p,
                        [s]: Math.max(0, parseInt(e.target.value, 10) || 0),
                      }))
                    }
                    className={`${fieldClass} w-24 py-2.5 text-center`}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {modifica && !product!.product_variants?.length && (
          <div>
            <p className="mb-2 text-fine font-medium text-on-paper">Disponibilità</p>
            <StockSection productId={product!.id} sizes={taglie} token={token} />
          </div>
        )}

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rule-paper px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-body font-medium">Visibile nello shop</p>
            <p className="mt-0.5 text-fine text-on-paper-muted">
              Spento, il prodotto sparisce dalle pagine pubbliche.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={visibile}
            aria-label="Visibile nello shop"
            onClick={() => setVisibile((v) => !v)}
            className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              visibile ? 'bg-accent' : 'bg-rule-paper'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-paper transition-transform ${visibile ? 'translate-x-5' : ''}`}
            />
          </button>
        </div>

        <details className="group rounded-2xl border border-rule-paper">
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between px-4 text-fine font-medium [&::-webkit-details-marker]:hidden">
            Scheda tecnica sulla pagina prodotto
            <span className="text-accent transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="flex flex-col gap-4 border-t border-rule-paper px-4 py-4">
            <Field label="Tessuto">
              <TextArea
                rows={2}
                value={dettagli.material}
                onChange={(e) => setDettagli((d) => ({ ...d, material: e.target.value }))}
                placeholder="es. 100% cotone organico, jersey 200g/m²"
              />
            </Field>
            <Field label="Misure">
              <TextArea
                rows={2}
                value={dettagli.dimensions}
                onChange={(e) => setDettagli((d) => ({ ...d, dimensions: e.target.value }))}
                placeholder="es. S: petto 96cm, lunghezza 70cm"
              />
            </Field>
            <Field label="Lavaggio">
              <TextArea
                rows={2}
                value={dettagli.care}
                onChange={(e) => setDettagli((d) => ({ ...d, care: e.target.value }))}
                placeholder="es. Lavare a 30°C, non asciugare in asciugatrice"
              />
            </Field>
            <Field label="Spedizione e resi">
              <TextArea
                rows={2}
                value={dettagli.shipping}
                onChange={(e) => setDettagli((d) => ({ ...d, shipping: e.target.value }))}
                placeholder="es. Spedito in 5–7 giorni lavorativi."
              />
            </Field>
          </div>
        </details>

        {errore && (
          <p className="rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-fine text-accent">
            {errore}
          </p>
        )}
      </form>
    </Sheet>
  );
}
