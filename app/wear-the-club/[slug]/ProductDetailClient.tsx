'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Plus, Minus, ShoppingBag, Zap, ArrowLeft } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import type { ProductFull, ProductVariant } from './page';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

// ── Details accordion ─────────────────────────────────────────────────────────

function AccordionItem({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[#e8d5d5]">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span
          className="text-[11px] tracking-[0.35em] text-[#1a0505] group-hover:text-[#731515] transition-colors"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {label}
        </span>
        {open
          ? <Minus size={13} className="text-[#731515]/60 shrink-0" />
          : <Plus  size={13} className="text-[#731515]/60 shrink-0" />
        }
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProductDetailClient({ product }: { product: ProductFull }) {
  const { addItem, setIsOpen: openCart } = useCart();
  const router = useRouter();

  const hasVariants = product.product_variants.length > 0;
  const hasSizes    = product.sizes.length > 0;

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [size,            setSize]            = useState<string>(product.sizes[0] ?? '');
  const [activeImg,       setActiveImg]       = useState(0);
  const [added,           setAdded]           = useState(false);
  const [sizeErr,         setSizeErr]         = useState(false);
  const [colorErr,        setColorErr]        = useState(false);
  const [touchStartX,     setTouchStartX]     = useState<number | null>(null);

  // Images: selected variant → first variant with images → product images
  const displayImages: string[] =
    selectedVariant && selectedVariant.images.length > 0
      ? selectedVariant.images
      : (product.product_variants.find(v => v.images.length > 0)?.images ?? product.images);
  const currentImage = displayImages[activeImg] ?? '';

  function selectVariant(v: ProductVariant) {
    setSelectedVariant(v);
    setActiveImg(0);
    setColorErr(false);
  }

  function getStock(variantId: string | null, sz: string | null): number {
    const entry = product.product_stock?.find(
      s => s.variant_id === variantId && s.size === sz,
    );
    return entry === undefined ? Infinity : entry.quantity;
  }
  function isSoldOut(variantId: string | null, sz: string | null) {
    return getStock(variantId, sz) === 0;
  }

  // Touch swipe to navigate images
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null || displayImages.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      setActiveImg(i =>
        dx < 0
          ? (i + 1) % displayImages.length
          : (i - 1 + displayImages.length) % displayImages.length,
      );
    }
    setTouchStartX(null);
  }

  const validate = useCallback((): boolean => {
    let ok = true;
    if (hasSizes && !size)               { setSizeErr(true);  ok = false; }
    if (hasVariants && !selectedVariant) { setColorErr(true); ok = false; }
    return ok;
  }, [hasSizes, size, hasVariants, selectedVariant]);

  const buildCartItem = useCallback(() => {
    const vid = selectedVariant?.id ?? null;
    const sz  = hasSizes ? size : null;
    const cartKey = `${product.id}:${vid ?? ''}:${sz ?? ''}`;

    const parts = [product.title];
    if (hasSizes    && size)            parts.push(size);
    if (hasVariants && selectedVariant) parts.push(selectedVariant.display_name || selectedVariant.color_name);

    return {
      id:           product.id,
      cartKey,
      name:         parts.join(' — '),
      price:        product.price,
      icon:         '',
      image:        currentImage,
      variantId:    vid,
      size:         sz,
      shippingCost: product.shipping_cost,
    };
  }, [product, size, selectedVariant, hasSizes, hasVariants, currentImage]);

  const handleAddToCart = useCallback(() => {
    if (!validate()) return;
    const vid = selectedVariant?.id ?? null;
    const sz  = hasSizes ? size : null;
    if (isSoldOut(vid, sz)) return;
    addItem(buildCartItem());
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validate, buildCartItem, addItem, selectedVariant, size, hasSizes]);

  const handleBuyNow = useCallback(() => {
    if (!validate()) return;
    const vid = selectedVariant?.id ?? null;
    const sz  = hasSizes ? size : null;
    if (isSoldOut(vid, sz)) return;
    addItem(buildCartItem());
    openCart(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validate, buildCartItem, addItem, openCart, selectedVariant, size, hasSizes]);

  const { details } = product;

  return (
    <div className="pt-6 pb-12 md:pt-10 md:pb-16">

      {/* Breadcrumb — stays padded on all viewports */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mb-6 md:mb-8">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a]/50">
          <Link href="/wear-the-club" className="hover:text-[#731515] transition-colors flex items-center gap-1">
            <ArrowLeft size={11} />
            WEAR THE CLUB
          </Link>
          <span>/</span>
          <span className="text-[#1a0505]/60">{product.title.toUpperCase()}</span>
        </div>
      </div>

      {/* Main layout — no horizontal padding on mobile so image is full-width */}
      <div className="max-w-7xl mx-auto lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-10 xl:gap-16">

          {/* ── Left: image gallery (full-width on mobile) ── */}
          <div className="flex flex-col gap-3">

            {/* Main image */}
            <div
              className="relative aspect-square lg:rounded-2xl overflow-hidden bg-[#f5eded] group"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentImage || 'empty'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  {currentImage ? (
                    <Image
                      src={currentImage}
                      alt={product.title}
                      fill
                      priority
                      quality={90}
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🍷</div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Nav arrows — always visible on mobile, hover-only on desktop */}
              {displayImages.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImg(i => (i - 1 + displayImages.length) % displayImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-9 lg:h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-sm transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={16} className="text-[#731515]" />
                  </button>
                  <button
                    onClick={() => setActiveImg(i => (i + 1) % displayImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-9 lg:h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-sm transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                    aria-label="Next image"
                  >
                    <ChevronRight size={16} className="text-[#731515]" />
                  </button>

                  {/* Dot indicators */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {displayImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        aria-label={`Image ${i + 1}`}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeImg ? 'bg-white' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails — add padding on mobile to align with content below */}
            {displayImages.length > 1 && (
              <div className="flex gap-2 flex-wrap px-4 sm:px-6 lg:px-0">
                {displayImages.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      i === activeImg
                        ? 'border-[#731515] shadow-md'
                        : 'border-transparent hover:border-[#731515]/40'
                    }`}
                  >
                    <Image src={src} alt="" fill quality={90} className="object-cover" sizes="64px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: product info — padded on mobile ── */}
          <div className="flex flex-col px-4 sm:px-6 lg:px-0 pt-6 lg:pt-0">

            {/* Label */}
            <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">VIVO WINE CLUB</div>

            {/* Title */}
            <h1
              className="text-[clamp(1.8rem,4vw,3rem)] font-light text-[#1a0505] leading-tight mb-2"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {product.title}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-5">
              <span
                className="text-2xl font-light text-[#731515]"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                €{product.price}
              </span>
              {product.shipping_cost != null && (
                <span className="text-[11px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {product.shipping_cost > 0 ? `+ €${product.shipping_cost} shipping` : 'Free Shipping'}
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-gradient-to-r from-[#731515]/20 to-transparent mb-5" />

            {/* Description */}
            {product.description && (
              <p
                className="text-sm text-[#7a4a4a] font-light leading-relaxed mb-6"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {product.description}
              </p>
            )}

            {/* Color selector */}
            {hasVariants && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] tracking-[0.35em] text-[#1a0505]">COLOR</span>
                  {selectedVariant && (
                    <span className="text-[11px] text-[#7a4a4a]/70" style={{ fontFamily: 'var(--font-nunito)' }}>
                      {selectedVariant.display_name || selectedVariant.color_name}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.product_variants.map(v => {
                    const active  = selectedVariant?.id === v.id;
                    const light   = isLight(v.color_hex);
                    const soldOut = hasSizes
                      ? product.sizes.every(s => isSoldOut(v.id, s))
                      : isSoldOut(v.id, null);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        title={soldOut ? `${v.display_name || v.color_name} — Sold out` : (v.display_name || v.color_name)}
                        disabled={soldOut}
                        onClick={() => { if (!soldOut) selectVariant(v); }}
                        className={`relative w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                          soldOut    ? 'opacity-35 cursor-not-allowed'
                          : active   ? 'border-[#731515] scale-110 shadow-md'
                          : colorErr ? 'border-red-300 hover:border-[#731515]'
                          : light    ? 'border-[#e8d5d5] hover:border-[#731515]'
                                     : 'border-transparent hover:border-[#731515]'
                        }`}
                        style={{ background: v.color_hex }}
                        aria-label={v.display_name || v.color_name}
                      >
                        {soldOut && (
                          <span className="absolute inset-0 flex items-center justify-center rounded-full overflow-hidden">
                            <span className="block w-full h-px bg-[#731515]/50 rotate-45" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {colorErr && (
                  <p className="text-[10px] text-[#731515] mt-2" style={{ fontFamily: 'var(--font-nunito)' }}>
                    Select a color
                  </p>
                )}
              </div>
            )}

            {/* Size selector */}
            {hasSizes && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] tracking-[0.35em] text-[#1a0505]">SIZE</span>
                  {size && (
                    <span className="text-[11px] text-[#7a4a4a]/70" style={{ fontFamily: 'var(--font-nunito)' }}>
                      {size}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(s => {
                    const soldOut = isSoldOut(selectedVariant?.id ?? null, s);
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={soldOut}
                        onClick={() => { if (!soldOut) { setSize(s); setSizeErr(false); } }}
                        title={soldOut ? 'Sold out' : undefined}
                        className={`relative w-12 h-12 text-[11px] tracking-widest border transition-all duration-150 ${
                          soldOut
                            ? 'border-[#e8d5d5] text-[#c0a0a0]/40 cursor-not-allowed line-through'
                            : size === s
                            ? 'border-[#731515] bg-[#731515] text-white'
                            : sizeErr
                            ? 'border-red-300 text-[#7a4a4a] hover:border-[#731515]'
                            : 'border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515] hover:text-[#731515]'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                {sizeErr && (
                  <p className="text-[10px] text-[#731515] mt-2" style={{ fontFamily: 'var(--font-nunito)' }}>
                    Select a size
                  </p>
                )}
              </div>
            )}

            {/* CTA buttons — full-width on all viewports */}
            <div className="flex flex-col gap-3 mt-auto">
              <motion.button
                onClick={handleAddToCart}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center justify-center gap-2.5 py-4 border text-[11px] tracking-[0.3em] transition-all duration-300 ${
                  added
                    ? 'border-[#2d6e2d] bg-[#2d6e2d] text-white'
                    : 'border-[#731515] text-[#731515] hover:bg-[#731515] hover:text-white'
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {added ? (
                    <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.18 }}>
                      <Check size={14} strokeWidth={2.5} />
                    </motion.span>
                  ) : (
                    <motion.span key="bag" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                      <ShoppingBag size={14} />
                    </motion.span>
                  )}
                </AnimatePresence>
                {added ? 'ADDED TO CART' : 'ADD TO CART'}
              </motion.button>

              <motion.button
                onClick={handleBuyNow}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2.5 py-4 bg-[#731515] text-white text-[11px] tracking-[0.3em] hover:bg-[#5a1010] transition-colors duration-300"
              >
                <Zap size={13} />
                BUY NOW
              </motion.button>
            </div>

            {/* Shipping note */}
            <p className="mt-4 text-[10px] text-[#7a4a4a]/40 text-center" style={{ fontFamily: 'var(--font-nunito)' }}>
              Ships in 5–7 business days
            </p>
          </div>
        </div>
      </div>

      {/* ── Additional Info accordion — always visible ── */}
      <div className="mt-12 lg:mt-14 max-w-2xl lg:mx-auto px-4 sm:px-6 lg:px-10">
        <AccordionItem label="ADDITIONAL INFO">
          <div className="space-y-5">
            <div>
              <p className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">FABRIC</p>
              <p className="text-sm font-light leading-relaxed" style={{ fontFamily: 'var(--font-nunito)', color: details?.material ? '#7a4a4a' : '#b8a0a0' }}>
                {details?.material || 'Details coming soon.'}
              </p>
            </div>
            <div>
              <p className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">DIMENSIONS</p>
              <p className="text-sm font-light leading-relaxed" style={{ fontFamily: 'var(--font-nunito)', color: details?.dimensions ? '#7a4a4a' : '#b8a0a0' }}>
                {details?.dimensions || 'Details coming soon.'}
              </p>
            </div>
            <div>
              <p className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">SHIPPING & RETURNS</p>
              <p className="text-sm font-light leading-relaxed" style={{ fontFamily: 'var(--font-nunito)', color: details?.shipping ? '#7a4a4a' : '#b8a0a0' }}>
                {details?.shipping || 'Ships in 5–7 business days. Contact us for returns.'}
              </p>
            </div>
          </div>
        </AccordionItem>
        <div className="border-t border-[#e8d5d5]" />
      </div>
    </div>
  );
}
