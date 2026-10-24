'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fieldClass } from '@/components/admin/ui';

/**
 * Quanti pezzi ci sono, taglia per taglia.
 *
 * Si usa in due posti — dentro il prodotto senza colori e dentro ogni
 * variante colore — e in entrambi la riga è la stessa: un numero, lo
 * stato (esaurito, scorte basse) e un salva che si accende solo se il
 * numero è cambiato davvero.
 */
export function StockSection({
  productId,
  sizes,
  token,
  variantId = null,
}: {
  productId: string;
  sizes: string[];
  token: string;
  variantId?: string | null;
}) {
  const [giacenze, setGiacenze] = useState<Record<string, number | ''>>({});
  const [salvato, setSalvato] = useState<Record<string, number>>({});
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    fetch(`/api/merch/stock?product_id=${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, number | ''> = {};
        const base: Record<string, number> = {};
        for (const row of d.stock ?? []) {
          const key = `${row.variant_id ?? ''}|${row.size ?? ''}`;
          map[key] = row.quantity;
          base[key] = row.quantity;
        }
        setGiacenze(map);
        setSalvato(base);
      })
      .finally(() => setPronto(true));
  }, [productId, token]);

  async function salva(vId: string | null, size: string | null, qty: number | '') {
    if (qty === '') return;
    const key = `${vId ?? ''}|${size ?? ''}`;
    setSalvando((p) => ({ ...p, [key]: true }));
    try {
      await fetch('/api/merch/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: productId, variant_id: vId, size, quantity: qty }),
      });
      setSalvato((p) => ({ ...p, [key]: qty as number }));
    } finally {
      setSalvando((p) => ({ ...p, [key]: false }));
    }
  }

  if (!pronto) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 size={18} className="animate-spin text-accent/50" />
      </div>
    );
  }

  const righe = sizes.length > 0
    ? sizes.map((s) => ({ label: s, size: s as string | null }))
    : [{ label: 'Quantità', size: null as string | null }];

  return (
    <div className="flex flex-col gap-2">
      {righe.map(({ label, size }) => {
        const key = `${variantId ?? ''}|${size ?? ''}`;
        const qty = giacenze[key] ?? '';
        const busy = salvando[key] ?? false;
        const cambiato = qty !== '' && qty !== salvato[key];
        const esaurito = qty === 0;
        const basse = typeof qty === 'number' && qty > 0 && qty <= 3;

        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-fine text-on-paper-muted">{label}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={qty}
              placeholder="—"
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setGiacenze((p) => ({ ...p, [key]: Number.isNaN(v) || v < 0 ? '' : v }));
              }}
              className={`${fieldClass} w-24 py-2.5 text-center ${
                esaurito ? 'border-accent/60 text-accent' : basse ? 'border-amber-500/60 text-amber-700' : ''
              }`}
            />
            <span className="flex-1 text-fine text-on-paper-muted">
              {esaurito ? 'Esaurito' : basse ? 'Scorte basse' : ''}
            </span>
            <button
              type="button"
              disabled={busy || !cambiato}
              onClick={() => salva(variantId, size, qty)}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-fine font-medium text-paper transition-colors hover:bg-accent-lift disabled:opacity-35"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : 'Salva'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
