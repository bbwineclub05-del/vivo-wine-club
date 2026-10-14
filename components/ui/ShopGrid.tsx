'use client';

import { useState, useEffect, memo } from 'react';
import { pixel } from '@/lib/pixel';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductVariant {
  id:           string;
  color_name:   string;
  display_name: string | null;
  color_hex:    string;
  images:       string[];
  sort_order:   number;
}

interface StockEntry {
  variant_id: string | null;
  size:       string | null;
  quantity:   number;
}

interface Product {
  id:               string;
  title:            string;
  description:      string;
  price:            number;
  sizes:            string[];
  images:           string[];
  shipping_cost:    number | null;
  slug:             string | null;
  product_variants: ProductVariant[];
  product_stock:    StockEntry[];
}

// ── Product card ──────────────────────────────────────────────────────────────

interface ProductCardProps {
  product:       Product;
  index:         number;
  reducedMotion: boolean | null;
}

const ProductCard = memo(function ProductCard({ product, index, reducedMotion }: ProductCardProps) {
  const hasVariants = product.product_variants.length > 0;

  // Selected state
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImg,       setActiveImg]       = useState(0);

  // Images shown depend on which variant is selected.
  // When none is selected, fall back to the first variant that has images,
  // then to the (legacy) product-level images array.
  const displayImages: string[] = selectedVariant && selectedVariant.images.length > 0
    ? selectedVariant.images
    : (product.product_variants.find(v => v.images.length > 0)?.images ?? product.images);
  const currentImage = displayImages[activeImg] ?? '';

  // When variant changes, reset image index
  function selectVariant(v: ProductVariant) {
    setSelectedVariant(v);
    setActiveImg(0);
  }

  // Light colors need a dark border to be visible
  const isLight = (hex: string) => {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return (r*299 + g*587 + b*114) / 1000 > 180;
  };

  return (
    <motion.div
      initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      style={{ willChange: 'transform' }}
      className="group flex flex-col cursor-default"
    >
      {/* ── Main image + gallery ── */}
      <Link href={`/wear-the-club/${product.slug || product.id}`} className="relative rounded-2xl overflow-hidden aspect-square bg-[var(--color-paper-soft)] block">

        {/* Main image with crossfade on change */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentImage || 'empty'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            {currentImage ? (
              <Image
                src={currentImage}
                alt={product.title}
                fill
                loading="lazy"
                quality={90}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">🍷</div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/8 transition-colors duration-300 pointer-events-none" />

        {/* Gallery nav arrows — only if > 1 image */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={e => { e.preventDefault(); setActiveImg(i => (i - 1 + displayImages.length) % displayImages.length); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-white/85 shadow transition-opacity hover:bg-white md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft size={14} className="text-[var(--color-accent)]" />
            </button>
            <button
              onClick={e => { e.preventDefault(); setActiveImg(i => (i + 1) % displayImages.length); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-white/85 shadow transition-opacity hover:bg-white md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight size={14} className="text-[var(--color-accent)]" />
            </button>
            {/* Dot indicators */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {displayImages.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.preventDefault(); setActiveImg(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeImg ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}
      </Link>

      {/* Thumbnail strip — only when > 1 image */}
      {displayImages.length > 1 && (
        <div className="flex gap-1.5 mt-2">
          {displayImages.slice(0, 5).map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveImg(i)}
              className={`relative w-11 h-11 rounded-xl overflow-hidden border-2 shrink-0 transition-colors ${
                i === activeImg ? 'border-[var(--color-accent)]' : 'border-transparent hover:border-[var(--color-accent)]/40'
              }`}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="40px" />
            </button>
          ))}
          {displayImages.length > 5 && (
            <div className="w-11 h-11 rounded-xl bg-[var(--color-paper-soft)] flex items-center justify-center text-[10px] text-[var(--color-on-paper-muted)]/50">
              +{displayImages.length - 5}
            </div>
          )}
        </div>
      )}

      {/* ── Info ── */}
      <div className={`${displayImages.length > 1 ? 'mt-2' : 'mt-4'} px-0.5`}>
        <div className="flex items-baseline justify-between mb-3">
          <Link
            href={`/wear-the-club/${product.slug || product.id}`}
            className="text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)] transition-colors duration-300"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {product.title}
          </Link>
          <span className="text-sm text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-syne)' }}>
            €{product.price}
          </span>
        </div>
        {/* Variant color swatches — click to preview images */}
        {hasVariants && (
          <div className="flex flex-wrap items-center gap-2">
            {product.product_variants.map((v) => {
              const active = selectedVariant?.id === v.id;
              const light  = isLight(v.color_hex);
              return (
                <button
                  key={v.id}
                  type="button"
                  title={v.color_name}
                  onClick={() => selectVariant(v)}
                  className={`relative w-7 h-7 rounded-full border-2 transition-all duration-150 ${
                    active
                      ? 'border-[var(--color-accent)] scale-110 shadow-md'
                      : light
                      ? 'border-[var(--color-rule-paper)] hover:border-[var(--color-accent)]'
                      : 'border-transparent hover:border-[var(--color-accent)]'
                  }`}
                  style={{ background: v.color_hex }}
                  aria-label={v.color_name}
                />
              );
            })}
            {selectedVariant && (
              <span className="text-[10px] text-[var(--color-on-paper-muted)]/60 ml-0.5" style={{ fontFamily: 'var(--font-geist)' }}>
                {selectedVariant.color_name}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="rounded-2xl aspect-square bg-[var(--color-rule-paper)]/50" />
      <div className="mt-4 space-y-2 px-0.5">
        <div className="h-3.5 bg-[var(--color-rule-paper)]/60 rounded w-3/4" />
        <div className="h-3 bg-[var(--color-rule-paper)]/40 rounded w-full" />
        <div className="h-3 bg-[var(--color-rule-paper)]/40 rounded w-2/3" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * The catalogue. Lifted out of the page unchanged so the page itself can
 * stay a server component and render the shared footer; every line of
 * variant, stock and pixel logic below is the original.
 */
export function ShopGrid() {
  const t = useTranslations('wearTheClub');
  const reducedMotion = useReducedMotion();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pixel.viewContentGroup({ content_name: 'Wear The Club' });
    fetch('/api/merch/products/public')
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} reducedMotion={reducedMotion} />
            ))}
      </div>

      {!loading && products.length > 0 && (
        <p className="mt-14 text-fine text-on-paper-muted">{t('shipping')}</p>
      )}
    </>
  );
}
