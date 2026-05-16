'use client';

import { useState, useCallback, useEffect, memo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface ProductVariant {
  id:         string;
  color_name: string;
  color_hex:  string;
  images:     string[];
  sort_order: number;
}

interface Product {
  id:               string;
  title:            string;
  description:      string;
  price:            number;
  sizes:            string[];
  images:           string[];
  product_variants: ProductVariant[];
}

// Memoised — only re-renders when its own props change
const ProductCard = memo(function ProductCard({
  product,
  index,
  reducedMotion,
}: {
  product: Product;
  index: number;
  reducedMotion: boolean | null;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const image             = product.images[0] ?? '';

  const handleAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      id:    product.id,
      name:  product.title,
      price: product.price,
      icon:  '',
      image,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }, [addItem, product, image]);

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
      <div className="relative rounded-lg overflow-hidden aspect-square bg-[#f5eded]">
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            loading="lazy"
            className="object-cover transition-transform duration-600 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🍷</div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300" />

        {/* ADD button */}
        <div className="absolute top-2.5 right-2.5">
          <motion.button
            onClick={handleAdd}
            whileTap={reducedMotion ? undefined : { scale: 0.9 }}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[#F5EEE6] shadow-lg transition-colors duration-300 ${
              added ? 'bg-[#2d6e2d]' : 'bg-[#731515] hover:bg-[#aa4848]'
            }`}
            aria-label={`Add ${product.title} to cart`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {added ? (
                <motion.span key="check" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                  <Check size={12} strokeWidth={2.5} />
                </motion.span>
              ) : (
                <motion.span key="plus" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                  <Plus size={12} strokeWidth={2.5} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-baseline justify-between mt-3 px-0.5">
        <h3
          className="text-xs font-medium text-[#1a0505] group-hover:text-[#731515] transition-colors duration-300"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {product.title}
        </h3>
        <span className="text-xs text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
          €{product.price}
        </span>
      </div>
      {/* Variant color dots — only when product has variants */}
      {product.product_variants.length > 0 && (
        <div className="flex gap-1 mt-1.5 px-0.5 items-center">
          {product.product_variants.slice(0, 6).map(v => (
            <span key={v.id} title={v.color_name}
              className="w-3 h-3 rounded-full border border-black/10 shrink-0"
              style={{ background: v.color_hex }} />
          ))}
          {product.product_variants.length > 6 && (
            <span className="text-[9px] text-[#7a4a4a]/40 leading-3">+{product.product_variants.length - 6}</span>
          )}
        </div>
      )}
    </motion.div>
  );
});

// Skeleton placeholder during loading
function SkeletonCard() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="rounded-lg aspect-square bg-[#e8d5d5]/30" />
      <div className="mt-3 flex justify-between px-0.5">
        <div className="h-3 bg-[#e8d5d5]/40 rounded w-1/2" />
        <div className="h-3 bg-[#e8d5d5]/40 rounded w-8" />
      </div>
    </div>
  );
}

export default function WearTheClubSection() {
  const reducedMotion            = useReducedMotion();
  const [products, setProducts]  = useState<Product[]>([]);
  const [loading, setLoading]    = useState(true);

  useEffect(() => {
    fetch('/api/merch/products/public')
      .then((r) => r.json())
      .then((d) => setProducts((d.products ?? []).slice(0, 6)))
      .catch(() => {/* silently fail */})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="boutique" className="py-24 md:py-28 relative overflow-hidden">
      <div className="fog-center" style={{ height: '90%' }} />

      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reducedMotion ? 0 : 0.8 }}
          className="mb-10"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">MEMBERS ONLY</div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#1a0505] leading-none section-title"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            WEAR THE CLUB
          </h2>
          <p className="mt-3 text-base text-[#7a4a4a] font-light italic" style={{ fontFamily: 'var(--font-nunito)' }}>
            Limited drops. Iconic pieces.
          </p>
        </motion.div>

        {/* 3×2 grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : products.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} reducedMotion={reducedMotion} />
              ))
          }
        </div>
      </div>
    </section>
  );
}
