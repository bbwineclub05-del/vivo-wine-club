'use client';

import { useState, useEffect, memo } from 'react';
import { pixel } from '@/lib/pixel';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
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
      <Link href={`/wear-the-club/${product.slug || product.id}`} className="relative rounded-xl overflow-hidden aspect-square bg-[#f5eded] block">

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
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition-opacity opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft size={14} className="text-[#731515]" />
            </button>
            <button
              onClick={e => { e.preventDefault(); setActiveImg(i => (i + 1) % displayImages.length); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition-opacity opacity-0 group-hover:opacity-100"
            >
              <ChevronRight size={14} className="text-[#731515]" />
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
              className={`relative w-10 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                i === activeImg ? 'border-[#731515]' : 'border-transparent hover:border-[#731515]/40'
              }`}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="40px" />
            </button>
          ))}
          {displayImages.length > 5 && (
            <div className="w-10 h-10 rounded-lg bg-[#f5eded] flex items-center justify-center text-[10px] text-[#7a4a4a]/50">
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
            className="text-sm font-medium text-[#1a0505] hover:text-[#731515] transition-colors duration-300"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {product.title}
          </Link>
          <span className="text-sm text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
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
                      ? 'border-[#731515] scale-110 shadow-md'
                      : light
                      ? 'border-[#e8d5d5] hover:border-[#731515]'
                      : 'border-transparent hover:border-[#731515]'
                  }`}
                  style={{ background: v.color_hex }}
                  aria-label={v.color_name}
                />
              );
            })}
            {selectedVariant && (
              <span className="text-[10px] text-[#7a4a4a]/60 ml-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
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
      <div className="rounded-xl aspect-square bg-[#e8d5d5]/50" />
      <div className="mt-4 space-y-2 px-0.5">
        <div className="h-3.5 bg-[#e8d5d5]/60 rounded w-3/4" />
        <div className="h-3 bg-[#e8d5d5]/40 rounded w-full" />
        <div className="h-3 bg-[#e8d5d5]/40 rounded w-2/3" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WearTheClubPage() {
  const t                       = useTranslations('wearTheClub');
  const reducedMotion           = useReducedMotion();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);

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
      <Navbar />
      <main className="min-h-screen pt-16">

        {/* Hero */}
        <div className="relative w-full h-[220px] sm:h-[280px] md:h-[350px]">
          <Image
            src="/events/wine lounge 1.jpg"
            alt="Wear The Club"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#731515]/60" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div className="text-[10px] tracking-[0.5em] text-white/70 mb-4">{t('vivoLabel')}</div>
            <h1
              className="text-[clamp(2rem,5vw,4rem)] font-light text-white leading-tight mb-3"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {t('heading')}
            </h1>
            <p className="text-sm md:text-base text-white/75 font-light italic" style={{ fontFamily: 'var(--font-nunito)' }}>
              {t('subtitle')}
            </p>
          </div>
          <div className="absolute top-6 left-6 md:left-10 z-10">
            <BackButton className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/70 hover:text-white transition-colors duration-300" />
          </div>
        </div>

        {/* Products grid */}
        <section className="relative overflow-hidden pb-28 md:pb-32">
          <div className="fog-right" style={{ top: '10%' }} />
          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <motion.div
              initial={{ scaleX: reducedMotion ? 1 : 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: reducedMotion ? 0 : 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="origin-left w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-14"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : products.map((p, i) => (
                    <ProductCard key={p.id} product={p} index={i} reducedMotion={reducedMotion} />
                  ))
              }
            </div>
            {!loading && (
              <motion.p
                initial={{ opacity: reducedMotion ? 1 : 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: reducedMotion ? 0 : 0.7, delay: reducedMotion ? 0 : 0.4 }}
                className="mt-14 text-center text-xs text-[#7a4a4a]/60 tracking-widest"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {t('shipping')}
              </motion.p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
