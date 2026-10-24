'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { EmptyState, StatusPill, fieldClass } from '@/components/admin/ui';
import { sortStockRows, type AuditRow, type StockRow } from '@/components/merch/types';

/**
 * Tutte le giacenze in una schermata.
 *
 * Era una tabella a quattro colonne larga 640 pixel minimi: su un
 * telefono si leggeva trascinandola di lato. Qui ogni riga è una
 * riga, raggruppata sotto il nome del prodotto, e il numero si
 * salva uscendo dalla casella.
 */

function MotivoLabel(reason: string): string {
  if (reason === 'sale') return 'Vendita';
  if (reason === 'oversell') return 'Venduto oltre scorta';
  return 'A mano';
}

export function StockTab({ token }: { token: string }) {
  const [righe, setRighe] = useState<StockRow[]>([]);
  const [storico, setStorico] = useState<AuditRow[]>([]);
  const [caricando, setCaricando] = useState(true);
  const [valori, setValori] = useState<Record<string, number>>({});
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});

  const caricaStorico = useCallback(
    () =>
      fetch('/api/merch/stock/log', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => setStorico(d.log ?? []))
        .catch(() => {}),
    [token],
  );

  useEffect(() => {
    Promise.all([
      fetch('/api/merch/stock?all=true', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          const rows: StockRow[] = d.stock ?? [];
          setRighe(rows);
          setValori(Object.fromEntries(rows.map((r) => [r.id, r.quantity])));
        })
        .catch(() => {}),
      caricaStorico(),
    ]).finally(() => setCaricando(false));
  }, [token, caricaStorico]);

  async function salva(row: StockRow) {
    const qty = valori[row.id];
    if (qty === undefined || qty === row.quantity) return;
    setSalvando((p) => ({ ...p, [row.id]: true }));
    try {
      const res = await fetch('/api/merch/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          product_id: row.product_id,
          variant_id: row.variant_id,
          size: row.size,
          quantity: qty,
        }),
      });
      if (res.ok) {
        setRighe((prev) => prev.map((s) => (s.id === row.id ? { ...s, quantity: qty } : s)));
        caricaStorico();
      }
    } finally {
      setSalvando((p) => ({ ...p, [row.id]: false }));
    }
  }

  if (caricando) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={24} className="animate-spin text-accent/50" />
      </div>
    );
  }

  const esauriti = righe.filter((s) => s.quantity === 0).length;
  const disponibili = righe.filter((s) => s.quantity > 0).length;

  // Raggruppate per prodotto, nell'ordine in cui si leggono.
  const gruppi: { productId: string; titolo: string; righe: StockRow[] }[] = [];
  for (const row of sortStockRows(righe)) {
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.productId === row.product_id) ultimo.righe.push(row);
    else gruppi.push({ productId: row.product_id, titolo: row.products?.title ?? row.product_id, righe: [row] });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone={esauriti > 0 ? 'warn' : 'neutral'}>{esauriti} esauriti</StatusPill>
        <StatusPill tone="good">{disponibili} disponibili</StatusPill>
      </div>

      {righe.length === 0 ? (
        <EmptyState
          title="Nessuna giacenza"
          body="Imposta i pezzi disponibili dalla scheda di ogni prodotto."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {gruppi.map((g) => (
            <section key={g.productId}>
              <h3 className="ds-display text-[17px] tracking-[-0.02em]">{g.titolo}</h3>

              <ul className="mt-3 overflow-hidden rounded-2xl border border-rule-paper">
                {g.righe.map((row, i) => {
                  const qty = valori[row.id] ?? row.quantity;
                  const busy = salvando[row.id] ?? false;
                  const esaurito = row.quantity === 0;
                  const basse = row.quantity > 0 && row.quantity <= 3;
                  const colore = row.product_variants?.display_name || row.product_variants?.color_name;

                  return (
                    <li
                      key={row.id}
                      className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-rule-paper' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body">
                          {colore ?? 'Unico'}
                          {row.size && <span className="ml-2 text-on-paper-muted">taglia {row.size}</span>}
                        </p>
                        {(esaurito || basse) && (
                          <p className={`mt-0.5 text-fine ${esaurito ? 'text-accent' : 'text-amber-700'}`}>
                            {esaurito ? 'Esaurito' : 'Scorte basse'}
                          </p>
                        )}
                      </div>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        aria-label={`Pezzi di ${g.titolo}${colore ? ` ${colore}` : ''}${row.size ? ` taglia ${row.size}` : ''}`}
                        value={qty}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!Number.isNaN(v) && v >= 0) setValori((p) => ({ ...p, [row.id]: v }));
                        }}
                        onBlur={() => salva(row)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                        className={`${fieldClass} w-20 shrink-0 py-2.5 text-center ${
                          esaurito ? 'border-accent/60' : basse ? 'border-amber-500/60' : ''
                        }`}
                      />
                      {busy && <Loader2 size={15} className="shrink-0 animate-spin text-accent/60" />}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <p className="text-fine text-on-paper-muted">
            Cambia il numero e premi Invio, o tocca fuori: si salva da solo.
          </p>
        </div>
      )}

      {storico.length > 0 && (
        <section>
          <h3 className="ds-display text-[17px] tracking-[-0.02em]">Storico delle modifiche</h3>
          <ul className="mt-3 flex flex-col gap-1.5">
            {storico.map((row) => {
              const delta = row.new_qty - row.old_qty;
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-2xl border border-rule-paper px-3.5 py-2.5 text-fine"
                >
                  <span className="text-on-paper-muted">
                    {new Date(row.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}{' '}
                    {new Date(row.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="ds-numeric">
                    {row.old_qty} → {row.new_qty}
                    <span className={delta > 0 ? ' text-accent' : ''}>{delta > 0 ? ` (+${delta})` : ` (${delta})`}</span>
                  </span>
                  {row.size && <span className="text-on-paper-muted">taglia {row.size}</span>}
                  <span className="text-on-paper-muted">{MotivoLabel(row.reason)}</span>
                  {row.changed_by && <span className="truncate text-on-paper-muted">{row.changed_by}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
