'use client';

import { useState, useCallback, useEffect, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useCart } from '@/contexts/CartContext';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  sizes: string[];
  colors: string[];
  images: string[];
}

// Italian color name → hex for display swatches
const COLOR_HEX: Record<string, string> = {
  nero: '#1a1a1a', bianco: '#f0ede8', bordeaux: '#6b1a2a', verde: '#2d5a27',
  rosso: '#cc2200', blu: '#1a3a6b', grigio: '#7a7a7a', beige: '#d4b896',
  marrone: '#6b3a2a', rosa: '#e8a0b0', arancio: '#e07820', arancione: '#e07820',
  giallo: '#d4b800', viola: '#6b2d6b', azzurro: '#4a9fd4', navy: '#1a2a4a',
  crema: '#f0e8d4', ecru: '#d4c9a8', lilla: '#c8a0d0', turchese: '#20b0c0',
  camel: '#c09060', khaki: '#c0b060', militare: '#4a5a2a', senape: '#d0a030',
  panna: '#f5ede0', silver: '#b0b0b0', oro: '#c9a84c',
};
function colorHex(name: string): string {
  return COLOR_HEX[name.toLowerCase().replace(/\s+/g, '_')] ?? '#aaaaaa';
}

interface ProductCardProps {
  product: Product;
  index: number;
  reducedMotion: boolean | null;
}

const ProductCard = memo(function ProductCard({ product, index, reducedMotion }: ProductCardProps) {
  const { addItem } = useCart();
  const [added,      setAdded]      = useState(false);
  const [size,       setSize]       = useState<string>(product.sizes[0]   ?? '');
  const [color,      setColor]      = useState<string>(product.colors[0]  ?? '');
  const [sizeErr,    setSizeErr]    = useState(false);
  const [colorErr,   setColorErr]   = useState(false);
  const hasSizes  = product.sizes.length  > 0;
  const hasColors = product.colors.length > 0;
  const image     = product.images[0] ?? '';

  const handleAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Validate required selections
    if (hasSizes  && !size)  { setSizeErr(true);  return; }
    if (hasColors && !color) { setColorErr(true);  return; }
    setSizeErr(false); setColorErr(false);

    const parts = [product.title];
    if (hasSizes  && size)  parts.push(size);
    if (hasColors && color) parts.push(color);
    const cartName = parts.join(' — ');

    addItem({ id: product.id, name: cartName, price: product.price, icon: '', image });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }, [addItem, product, size, color, hasSizes, hasColors, image]);

  return (
    <motion.div
      initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reducedMotion ? undefined : { y: -4 }}
      style={{ willChange: 'transform' }}
      className="group flex flex-col cursor-default"
    >
      {/* Image */}
      <div className="relative rounded-xl overflow-hidden aspect-square bg-[#f5eded]">
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            loading="lazy"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">🍷</div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

        {/* ADD button */}
        <div className="absolute top-3 right-3">
          <motion.button
            onClick={handleAdd}
            whileTap={reducedMotion ? undefined : { scale: 0.9 }}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-colors duration-300 ${
              added ? 'bg-[#2d6e2d]' : 'bg-[#731515] hover:bg-[#aa4848]'
            }`}
            aria-label={`Add ${product.title} to cart`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {added ? (
                <motion.span key="check" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                  <Check size={13} strokeWidth={2.5} />
                </motion.span>
              ) : (
                <motion.span key="plus" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                  <Plus size={13} strokeWidth={2.5} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 px-0.5">
        <div className="flex items-baseline justify-between mb-1.5">
          <h3
            className="text-sm font-medium text-[#1a0505] group-hover:text-[#731515] transition-colors duration-300"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {product.title}
          </h3>
          <span className="text-sm text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
            €{product.price}
          </span>
        </div>
        <p className="text-xs text-[#7a4a4a] leading-relaxed mb-3" style={{ fontFamily: 'var(--font-nunito)' }}>
          {product.description}
        </p>

        {/* Size selector */}
        {hasSizes && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setSize(s); setSizeErr(false); }}
                className={`w-10 h-10 text-[10px] tracking-widest border transition-colors duration-150 ${
                  size === s
                    ? 'border-[#731515] bg-[#731515] text-white'
                    : sizeErr
                    ? 'border-red-300 text-[#7a4a4a] hover:border-[#731515]'
                    : 'border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515] hover:text-[#731515]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Color selector */}
        {hasColors && (
          <div className={`mt-2 flex flex-wrap gap-2 ${hasSizes ? '' : ''}`}>
            {product.colors.map((c) => {
              const hex     = colorHex(c);
              const active  = color === c;
              const isLight = ['bianco', 'panna', 'crema', 'ecru'].includes(c.toLowerCase());
              return (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => { setColor(c); setColorErr(false); }}
                  className={`w-7 h-7 rounded-full border-2 transition-all duration-150 ${
                    active
                      ? 'border-[#731515] scale-110 shadow-md'
                      : colorErr
                      ? 'border-red-300 hover:border-[#731515]'
                      : isLight
                      ? 'border-[#e8d5d5] hover:border-[#731515]'
                      : 'border-transparent hover:border-[#731515]'
                  }`}
                  style={{ background: hex }}
                  aria-label={c}
                />
              );
            })}
          </div>
        )}
        {(sizeErr || colorErr) && (
          <p className="text-[10px] text-[#731515] mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
            {sizeErr ? 'Seleziona una taglia' : 'Seleziona un colore'}
          </p>
        )}
      </div>
    </motion.div>
  );
});

// Skeleton card shown during loading
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

export default function WearTheClubPage() {
  const reducedMotion            = useReducedMotion();
  const [products, setProducts]  = useState<Product[]>([]);
  const [loading, setLoading]    = useState(true);

  useEffect(() => {
    fetch('/api/merch/products/public')
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => {/* silently fail — empty list */})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">

        {/* ── HERO IMAGE ── */}
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
            <div className="text-[10px] tracking-[0.5em] text-white/70 mb-4">VIVO WINE CLUB</div>
            <h1
              className="text-[clamp(2rem,5vw,4rem)] font-light text-white leading-tight mb-3"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              WEAR THE CLUB
            </h1>
            <p
              className="text-sm md:text-base text-white/75 font-light italic"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Each piece carries the identity of the club. Wear it, share it, live it.
            </p>
          </div>
          <div className="absolute top-6 left-6 md:left-10 z-10">
            <BackButton className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/70 hover:text-white transition-colors duration-300" />
          </div>
        </div>

        {/* ── PRODUCTS GRID ── */}
        <section className="relative overflow-hidden pb-28 md:pb-32">
          <div className="fog-right" style={{ top: '10%' }} />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">

            {/* Divider */}
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
                : products.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={i}
                      reducedMotion={reducedMotion}
                    />
                  ))
              }
            </div>

            {/* Bottom note */}
            {!loading && (
              <motion.p
                initial={{ opacity: reducedMotion ? 1 : 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: reducedMotion ? 0 : 0.7, delay: reducedMotion ? 0 : 0.4 }}
                className="mt-14 text-center text-xs text-[#7a4a4a]/60 tracking-widest"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                ALL ITEMS SHIP WITHIN 5–7 BUSINESS DAYS · FREE RETURNS
              </motion.p>
            )}
          </div>
        </section>

      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
