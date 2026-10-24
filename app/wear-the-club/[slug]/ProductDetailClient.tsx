'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Check, ChevronDown, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { pixel } from '@/lib/pixel';
import type {
  ProductFull, ProductTextVariant, ProductVariant,
} from './page';

/**
 * La scheda di un prodotto.
 *
 * Era lunga settecento righe e chiedeva due decisioni per comprare —
 * "aggiungi al carrello" e "compra ora", che facevano quasi la stessa
 * cosa — con il pulsante in mezzo alla pagina: su un telefono, dopo
 * aver scelto taglia e colore, bisognava risalire per trovarlo.
 *
 * Adesso c'è un gesto solo, e il prezzo con il pulsante restano
 * incollati in fondo allo schermo mentre si scorre. Comprare da
 * telefono è il caso normale, non quello difficile.
 */

interface CrossSell {
  id: string;
  title: string;
  price: number;
  images: string[];
  slug: string | null;
  product_variants?: { images: string[] }[];
}

/**
 * La copertina di un prodotto.
 *
 * Molti prodotti non hanno foto proprie: le immagini stanno sulle
 * varianti di colore. Guardando solo `images` le anteprime restavano
 * dei riquadri vuoti.
 */
function copertina(p: CrossSell): string | null {
  return p.images?.[0] ?? p.product_variants?.find((v) => v.images?.length)?.images[0] ?? null;
}

function eur(n: number) {
  return `${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')} €`;
}

export default function ProductDetailClient({ product }: { product: ProductFull }) {
  const t = useTranslations('shop');
  const { addItem, setIsOpen: openCart } = useCart();

  const varianti = product.product_variants ?? [];
  const incisioni = product.product_text_variants ?? [];
  const taglie = product.sizes ?? [];

  const [colore, setColore] = useState<ProductVariant | null>(varianti[0] ?? null);
  const [incisione, setIncisione] = useState<ProductTextVariant | null>(null);
  const [taglia, setTaglia] = useState<string>(taglie[0] ?? '');
  const [foto, setFoto] = useState(0);
  const [aggiunto, setAggiunto] = useState(false);
  const [mancante, setMancante] = useState<'taglia' | 'colore' | null>(null);
  const [dettagliAperti, setDettagliAperti] = useState(false);
  const [altri, setAltri] = useState<CrossSell[]>([]);

  useEffect(() => {
    pixel.viewProduct({ content_name: product.title, value: product.price });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Le immagini: quelle della combinazione scelta, se ci sono ── */
  const combinazioni = useMemo(
    () =>
      new Map(
        (product.product_variant_combinations ?? [])
          .filter((c) => Array.isArray(c.images) && c.images.length > 0)
          .map((c) => [`${c.text_variant_id}:${c.color_variant_id}`, c.images]),
      ),
    [product.product_variant_combinations],
  );

  const immagini = useMemo(() => {
    if (incisione && colore) {
      const comb = combinazioni.get(`${incisione.id}:${colore.id}`);
      if (comb?.length) return comb;
    }
    if (incisione?.images?.length) return incisione.images;
    if (colore?.images?.length) return colore.images;
    return product.images ?? [];
  }, [incisione, colore, combinazioni, product.images]);

  const fotoSicura = Math.min(foto, Math.max(immagini.length - 1, 0));

  /* ── Disponibilità ── */
  const giacenza = useCallback(
    (variantId: string | null, sz: string | null) => {
      const e = product.product_stock?.find((s) => s.variant_id === variantId && s.size === sz);
      return e === undefined ? Infinity : e.quantity;
    },
    [product.product_stock],
  );

  const esaurito = giacenza(colore?.id ?? null, taglie.length ? taglia : null) === 0;

  /* ── Altri prodotti ── */
  useEffect(() => {
    fetch('/api/merch/products/public')
      .then((r) => r.json())
      .then((d) => {
        const tutti: CrossSell[] = d.products ?? [];
        setAltri(tutti.filter((p) => p.id !== product.id).slice(0, 4));
      })
      .catch(() => {});
  }, [product.id]);

  /* ── Comprare ── */
  function aggiungi() {
    if (taglie.length && !taglia) { setMancante('taglia'); return; }
    if (varianti.length && !colore) { setMancante('colore'); return; }
    if (esaurito) return;

    const parti = [product.title];
    if (taglia) parti.push(taglia);
    if (colore) parti.push(colore.display_name || colore.color_name);
    if (incisione) parti.push(`"${incisione.text_label}"`);

    addItem({
      id: product.id,
      cartKey: `${product.id}:${colore?.id ?? ''}:${taglia}:${incisione?.id ?? ''}`,
      name: parti.join(' — '),
      price: product.price,
      icon: '',
      image: immagini[fotoSicura] ?? '',
      variantId: colore?.id ?? null,
      size: taglie.length ? taglia : null,
      shippingCost: product.shipping_cost,
    });
    pixel.addToCart({ content_name: product.title, value: product.price });

    setAggiunto(true);
    setMancante(null);
    // Il carrello si apre da solo: è lì che si paga, e un secondo
    // pulsante "compra ora" diceva la stessa cosa due volte.
    setTimeout(() => { openCart(true); setAggiunto(false); }, 450);
  }

  const dettagli = product.details ?? {};
  const righeDettaglio = [
    ['Materiale', dettagli.material],
    ['Dimensioni', dettagli.dimensions],
    ['Cura', dettagli.care],
    ['Spedizione', dettagli.shipping],
  ].filter(([, v]) => !!v) as [string, string][];

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-[calc(104px+env(safe-area-inset-bottom))] pt-6 lg:px-10 lg:pb-20 lg:pt-10">
      <Link
        href="/wear-the-club"
        className="ds-link group mb-6 inline-flex min-h-[44px] items-center gap-2 text-fine no-underline hover:text-accent"
      >
        <ArrowLeft size={15} strokeWidth={1.9} className="transition-transform group-hover:-translate-x-0.5" />
        {t('backToShop')}
      </Link>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        {/* ── Le foto ── */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-paper-soft">
            {immagini[fotoSicura] && (
              <Image
                src={immagini[fotoSicura]}
                alt={product.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
            )}
          </div>

          {immagini.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {immagini.map((src, i) => (
                <button
                  key={src + i}
                  onClick={() => setFoto(i)}
                  aria-label={`Foto ${i + 1}`}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border transition-colors ${
                    i === fotoSicura ? 'border-accent' : 'border-rule-paper'
                  }`}
                >
                  <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Le scelte ── */}
        <div>
          <h1 className="ds-display text-[clamp(1.8rem,5vw,2.6rem)] leading-[1.05] tracking-[-0.03em]">
            {product.title}
          </h1>

          <p className="ds-numeric mt-3 text-[22px] font-medium">{eur(product.price)}</p>

          {product.description && (
            <p className="mt-5 max-w-[56ch] text-body text-on-paper-muted">{product.description}</p>
          )}

          {varianti.length > 0 && (
            <div className="mt-7">
              <p className="mb-2.5 text-fine font-medium">
                {t('colour')}
                {colore && <span className="ml-2 font-normal text-on-paper-muted">{colore.display_name || colore.color_name}</span>}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {varianti.map((v) => {
                  const fuori = giacenza(v.id, taglie.length ? taglia : null) === 0;
                  return (
                    <button
                      key={v.id}
                      onClick={() => { setColore(v); setFoto(0); setMancante(null); }}
                      aria-label={v.display_name || v.color_name}
                      aria-pressed={colore?.id === v.id}
                      className={`relative h-11 w-11 rounded-full border-2 transition-all ${
                        colore?.id === v.id ? 'border-accent' : 'border-rule-paper'
                      } ${fuori ? 'opacity-35' : ''}`}
                      style={{ backgroundColor: v.color_hex }}
                    />
                  );
                })}
              </div>
              {mancante === 'colore' && <p className="mt-2 text-fine text-accent">{t('pickColour')}</p>}
            </div>
          )}

          {incisioni.length > 0 && (
            <div className="mt-7">
              <p className="mb-2.5 text-fine font-medium">{t('engraving')}</p>
              <div className="flex flex-wrap gap-2">
                {incisioni.map((iv) => (
                  <button
                    key={iv.id}
                    onClick={() => { setIncisione(incisione?.id === iv.id ? null : iv); setFoto(0); }}
                    aria-pressed={incisione?.id === iv.id}
                    className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-fine transition-colors ${
                      incisione?.id === iv.id ? 'border-accent bg-accent text-paper' : 'border-rule-paper'
                    }`}
                  >
                    {iv.text_label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {taglie.length > 0 && (
            <div className="mt-7">
              <p className="mb-2.5 text-fine font-medium">{t('size')}</p>
              <div className="flex flex-wrap gap-2">
                {taglie.map((sz) => {
                  const fuori = giacenza(colore?.id ?? null, sz) === 0;
                  return (
                    <button
                      key={sz}
                      onClick={() => { setTaglia(sz); setMancante(null); }}
                      disabled={fuori}
                      aria-pressed={taglia === sz}
                      className={`inline-flex min-h-[44px] min-w-[52px] items-center justify-center rounded-full border px-4 text-fine font-medium transition-colors ${
                        taglia === sz ? 'border-accent bg-accent text-paper' : 'border-rule-paper'
                      } ${fuori ? 'opacity-35 line-through' : ''}`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
              {mancante === 'taglia' && <p className="mt-2 text-fine text-accent">{t('pickSize')}</p>}
            </div>
          )}

          {/* Il pulsante sul computer: sul telefono sta incollato in fondo. */}
          <button
            onClick={aggiungi}
            disabled={esaurito}
            className="mt-8 hidden min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-accent px-6 text-fine font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-45 lg:inline-flex"
          >
            {aggiunto ? <Check size={18} strokeWidth={2.4} /> : <ShoppingBag size={18} strokeWidth={1.9} />}
            {esaurito ? t('soldOut') : aggiunto ? t('added') : t('addToCart')}
          </button>

          {righeDettaglio.length > 0 && (
            <div className="mt-8 border-t border-rule-paper pt-4">
              <button
                onClick={() => setDettagliAperti((v) => !v)}
                aria-expanded={dettagliAperti}
                className="flex min-h-[48px] w-full items-center justify-between text-left text-body font-medium"
              >
                {t('details')}
                <ChevronDown size={18} className={`transition-transform ${dettagliAperti ? 'rotate-180' : ''}`} />
              </button>
              {dettagliAperti && (
                <dl className="pb-2">
                  {righeDettaglio.map(([k, v]) => (
                    <div key={k} className="flex flex-wrap gap-x-4 gap-y-1 border-t border-rule-paper py-3">
                      <dt className="min-w-[110px] text-fine text-on-paper-muted">{k}</dt>
                      <dd className="min-w-0 flex-1 text-fine">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Altri pezzi ── */}
      {altri.length > 0 && (
        <section className="mt-14">
          <h2 className="ds-display mb-5 text-[22px] leading-none tracking-[-0.02em]">{t('alsoLike')}</h2>
          <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0 [&::-webkit-scrollbar]:hidden">
            {altri.map((p) => (
              <Link
                key={p.id}
                href={`/wear-the-club/${p.slug ?? p.id}`}
                className="w-[150px] shrink-0 snap-start lg:w-auto"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-paper-soft">
                  {copertina(p) && (
                    <Image src={copertina(p)!} alt={p.title} fill sizes="200px" className="object-cover" />
                  )}
                </div>
                <p className="mt-2 truncate text-fine font-medium">{p.title}</p>
                <p className="ds-numeric text-fine text-on-paper-muted">{eur(p.price)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Il prezzo e il pulsante, incollati in fondo sul telefono ── */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-rule-paper bg-paper/95 px-5 py-3 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="ds-numeric text-[19px] font-medium leading-none">{eur(product.price)}</p>
            {taglia && <p className="mt-1 truncate text-fine text-on-paper-muted">{taglia}</p>}
          </div>
          <button
            onClick={aggiungi}
            disabled={esaurito}
            className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-accent px-5 text-fine font-medium text-paper disabled:opacity-45"
          >
            {aggiunto ? <Check size={18} strokeWidth={2.4} /> : <ShoppingBag size={17} strokeWidth={1.9} />}
            {esaurito ? t('soldOut') : aggiunto ? t('added') : t('addToCart')}
          </button>
        </div>
      </div>
    </div>
  );
}
