'use client';

import { useState } from 'react';
import { FilterPills, PageHead } from '@/components/admin/ui';
import { OrdersTab } from '@/components/merch/OrdersTab';
import { ProductSheet } from '@/components/merch/ProductSheet';
import { ProductsTab } from '@/components/merch/ProductsTab';
import { ColorVariantsSheet } from '@/components/merch/ColorVariantsSheet';
import { TextVariantsSheet } from '@/components/merch/TextVariantsSheet';
import type { MerchOrder, Product } from '@/components/merch/types';

/**
 * Il merch con dati inventati, fuori dal login.
 *
 * Serve a guardare le schede a larghezza di telefono senza un
 * account e senza toccare lo shop vero: i prodotti e gli ordini qui
 * sotto non esistono, e il token vuoto fa fallire ogni scrittura.
 * Come le altre anteprime, vive solo in sviluppo.
 */

const PRODOTTI: Product[] = [
  {
    id: 'finto-1',
    title: 'Maglietta di prova',
    description: 'Prodotto finto per l’anteprima.',
    price: 35,
    sizes: ['S', 'M', 'L'],
    colors: ['nero', 'bordeaux'],
    images: [],
    visible: true,
    shipping_cost: null,
    slug: 'maglietta-di-prova',
    details: null,
    stripe_product_id: null,
    stripe_price_id: null,
    sort_order: 0,
    created_at: new Date().toISOString(),
    product_variants: [],
  },
  {
    id: 'finto-2',
    title: 'Cappellino di prova',
    description: '',
    price: 25,
    sizes: [],
    colors: ['panna'],
    images: [],
    visible: false,
    shipping_cost: 5,
    slug: 'cappellino-di-prova',
    details: null,
    stripe_product_id: null,
    stripe_price_id: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
    product_variants: [],
  },
];

const ORDINI: MerchOrder[] = [
  {
    id: 'ordine-finto-1',
    stripe_session_id: null,
    customer_name: 'Mario Rossi',
    customer_email: 'mario@example.com',
    items: [
      { name: 'Maglietta di prova — M', qty: 2, price: 35 },
      { name: 'Cappellino di prova', qty: 1, price: 25 },
    ],
    total: 95,
    status: 'evaso',
    created_at: new Date().toISOString(),
    shipping_line1: 'Via Finta 12',
    shipping_line2: null,
    shipping_city: 'Torino',
    shipping_postal: '10121',
    shipping_state: 'TO',
    shipping_country: 'IT',
    phone: '+39 000 0000000',
    delivery_notes: 'Citofono rotto, chiamare al telefono.',
    carrier: null,
    tracking_code: null,
    tracking_url: null,
    shipped_at: null,
    shipping_notes: null,
  },
  {
    id: 'ordine-finto-2',
    stripe_session_id: null,
    customer_name: 'Giulia Bianchi',
    customer_email: 'giulia@example.com',
    items: [{ name: 'Maglietta di prova — S', qty: 1, price: 35 }],
    total: 35,
    status: 'da_evadere',
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    shipping_line1: null,
    shipping_line2: null,
    shipping_city: null,
    shipping_postal: null,
    shipping_state: null,
    shipping_country: null,
    phone: null,
    delivery_notes: null,
    carrier: null,
    tracking_code: null,
    tracking_url: null,
    shipped_at: null,
    shipping_notes: null,
  },
];

export function MockMerch() {
  const [scheda, setScheda] = useState<'products' | 'orders'>('products');
  const [modifica, setModifica] = useState<Product | null>(null);
  const [aperta, setAperta] = useState(false);
  const [colori, setColori] = useState<Product | null>(null);
  const [scritte, setScritte] = useState<Product | null>(null);

  return (
    <>
      <PageHead title="Merch (finto)" subtitle="Prodotti e ordini inventati, per guardare il layout." />

      <div className="mb-6">
        <FilterPills
          value={scheda}
          onChange={setScheda}
          options={[
            { value: 'products' as const, label: 'Prodotti', count: PRODOTTI.length },
            { value: 'orders' as const, label: 'Ordini', count: ORDINI.length },
          ]}
        />
      </div>

      {scheda === 'products' ? (
        <ProductsTab
          products={PRODOTTI}
          token=""
          shippingCost="7"
          onShippingSaved={() => undefined}
          onEdit={(p) => {
            setModifica(p);
            setAperta(true);
          }}
          onColors={setColori}
          onTexts={setScritte}
          onDeleted={() => undefined}
          onChanged={() => undefined}
        />
      ) : (
        <OrdersTab orders={ORDINI} token="" onUpdated={() => undefined} />
      )}

      {colori && <ColorVariantsSheet product={colori} token="" onClose={() => setColori(null)} />}
      {scritte && <TextVariantsSheet product={scritte} token="" onClose={() => setScritte(null)} />}

      {aperta && (
        <ProductSheet
          product={modifica}
          token=""
          onClose={() => {
            setAperta(false);
            setModifica(null);
          }}
          onSaved={() => undefined}
        />
      )}
    </>
  );
}
