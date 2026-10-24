'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { FilterPills, NewButton, PageHead } from '@/components/admin/ui';
import { ColorVariantsSheet } from '@/components/merch/ColorVariantsSheet';
import { OrdersTab } from '@/components/merch/OrdersTab';
import { ProductSheet } from '@/components/merch/ProductSheet';
import { ProductsTab } from '@/components/merch/ProductsTab';
import { StockTab } from '@/components/merch/StockTab';
import { TextVariantsSheet } from '@/components/merch/TextVariantsSheet';
import type { MerchOrder, Product } from '@/components/merch/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/**
 * Il merch: prodotti, ordini, giacenze.
 *
 * Era un file solo da duemilacinquecento righe con diciotto
 * componenti dentro, ognuno con la sua idea di cos'è un pulsante.
 * Qui resta il minimo indispensabile — cosa è caricato, quale scheda
 * si guarda, quale foglio è aperto — e ogni scheda vive nel suo file.
 *
 * I fogli usano `Sheet` come il resto dell'area riservata: una sola
 * implementazione di sfondo, blocco dello scorrimento e tasto
 * indietro, invece di tre copie leggermente diverse.
 */
export default function MerchManager() {
  const [scheda, setScheda] = useState<'products' | 'orders' | 'stock'>('products');
  const [prodotti, setProdotti] = useState<Product[]>([]);
  const [ordini, setOrdini] = useState<MerchOrder[]>([]);
  const [caricando, setCaricando] = useState(true);
  const [token, setToken] = useState('');
  const [spedizione, setSpedizione] = useState('');

  const [modifica, setModifica] = useState<Product | null>(null);
  const [schedaAperta, setSchedaAperta] = useState(false);
  const [colori, setColori] = useState<Product | null>(null);
  const [scritte, setScritte] = useState<Product | null>(null);

  const caricaProdotti = useCallback(async (tk: string) => {
    const res = await fetch('/api/merch/products', { headers: { Authorization: `Bearer ${tk}` } });
    const data = await res.json();
    if (data.products) setProdotti(data.products);
  }, []);

  const caricaOrdini = useCallback(async (tk: string) => {
    const res = await fetch('/api/merch/orders', { headers: { Authorization: `Bearer ${tk}` } });
    const data = await res.json();
    if (data.orders) setOrdini(data.orders);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setCaricando(false);
        return;
      }
      setToken(session.access_token);
      const [, , impostazioni] = await Promise.all([
        caricaProdotti(session.access_token),
        caricaOrdini(session.access_token),
        fetch('/api/merch/settings').then((r) => r.json()),
      ]);
      if (impostazioni?.shipping_cost != null) setSpedizione(String(impostazioni.shipping_cost));
      setCaricando(false);
    });
  }, [caricaProdotti, caricaOrdini]);

  /* Gli ordini arrivano mentre la pagina è aperta: chi sta spedendo
     deve vederli senza ricaricare. */
  useEffect(() => {
    if (!token) return;
    supabase.realtime.setAuth(token);
    const channel = supabase
      .channel('merch_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'merch_orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setOrdini((prev) => [payload.new as MerchOrder, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const u = payload.new as MerchOrder;
          setOrdini((prev) => prev.map((o) => (o.id === u.id ? u : o)));
        } else if (payload.eventType === 'DELETE') {
          const d = payload.old as MerchOrder;
          setOrdini((prev) => prev.filter((o) => o.id !== d.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => caricaProdotti(token))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, () => caricaProdotti(token))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_text_variants' }, () => caricaProdotti(token))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [token, caricaProdotti]);

  function salvato(p: Product) {
    setProdotti((prev) => (prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev]));
  }

  return (
    <>
      <PageHead
        title="Merch"
        subtitle="Prodotti dello shop, ordini ricevuti e giacenze."
        action={
          scheda === 'products' ? (
            <NewButton
              label="Nuovo prodotto"
              onClick={() => {
                setModifica(null);
                setSchedaAperta(true);
              }}
            />
          ) : undefined
        }
      />

      <div className="mb-6">
        <FilterPills
          value={scheda}
          onChange={setScheda}
          options={[
            { value: 'products' as const, label: 'Prodotti', count: prodotti.length },
            { value: 'orders' as const, label: 'Ordini', count: ordini.length },
            { value: 'stock' as const, label: 'Giacenze' },
          ]}
        />
      </div>

      {caricando ? (
        <div className="flex justify-center py-20">
          <Loader2 size={26} className="animate-spin text-accent/50" />
        </div>
      ) : scheda === 'products' ? (
        <ProductsTab
          products={prodotti}
          token={token}
          shippingCost={spedizione}
          onShippingSaved={setSpedizione}
          onEdit={(p) => {
            setModifica(p);
            setSchedaAperta(true);
          }}
          onColors={setColori}
          onTexts={setScritte}
          onDeleted={(id) => setProdotti((prev) => prev.filter((x) => x.id !== id))}
          onChanged={() => token && caricaProdotti(token)}
        />
      ) : scheda === 'orders' ? (
        <OrdersTab
          orders={ordini}
          token={token}
          onUpdated={(u) => setOrdini((prev) => prev.map((o) => (o.id === u.id ? u : o)))}
        />
      ) : (
        <StockTab token={token} />
      )}

      {schedaAperta && (
        <ProductSheet
          product={modifica}
          token={token}
          onClose={() => {
            setSchedaAperta(false);
            setModifica(null);
          }}
          onSaved={salvato}
        />
      )}

      {colori && <ColorVariantsSheet product={colori} token={token} onClose={() => setColori(null)} />}
      {scritte && <TextVariantsSheet product={scritte} token={token} onClose={() => setScritte(null)} />}
    </>
  );
}
