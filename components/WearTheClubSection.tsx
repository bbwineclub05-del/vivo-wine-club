'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const PRODUCTS = [
  {
    id: 201,
    name: 'Classic Tee',
    price: 35,
    icon: '👕',
    gradient: 'from-[#1c0608] via-[#2a0a0e] to-[#380d12]',
    accentLine: 'M8 28 L20 28 M14 20 L14 30',
  },
  {
    id: 202,
    name: 'Club Cap',
    price: 30,
    icon: '🧢',
    gradient: 'from-[#1a0507] via-[#270a0c] to-[#350e11]',
    accentLine: 'M6 26 Q14 18 22 26',
  },
  {
    id: 203,
    name: 'Tote Bag',
    price: 25,
    icon: '👜',
    gradient: 'from-[#1d0609] via-[#2c0b0f] to-[#3a1014]',
    accentLine: 'M10 14 L10 28 L18 28 L18 14 M8 14 L20 14',
  },
  {
    id: 204,
    name: 'Corkscrew',
    price: 20,
    icon: '🔩',
    gradient: 'from-[#190507] via-[#25090c] to-[#320c10]',
    accentLine: 'M14 10 L14 26 M11 13 L17 13',
  },
  {
    id: 205,
    name: 'Wine Bag',
    price: 45,
    icon: '🍶',
    gradient: 'from-[#1b0608] via-[#280b0d] to-[#360f13]',
    accentLine: 'M11 12 L11 28 L17 28 L17 12 Q14 8 11 12',
  },
  {
    id: 206,
    name: 'Club Hoodie',
    price: 65,
    icon: '🧥',
    gradient: 'from-[#1e0709] via-[#2d0c10] to-[#3c1015]',
    accentLine: 'M8 18 L8 28 L20 28 L20 18 Q14 12 8 18',
  },
] as const;

/* ── Placeholder visual for each product ── */
function ProductPlaceholder({ gradient, name }: { gradient: string; name: string }) {
  return (
    <div className={`w-full aspect-square bg-gradient-to-br ${gradient} relative overflow-hidden`}>
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,rgba(201,168,76,0.06),transparent_65%)]" />

      {/* Watermark letter */}
      <div
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
        aria-hidden
      >
        <span
          className="text-[5rem] font-bold text-[#731515]/20 leading-none"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {name[0]}
        </span>
      </div>

      {/* Corner logo mark */}
      <div className="absolute bottom-4 left-4">
        <span className="text-[8px] tracking-[0.35em] text-[#C9A84C]/30 font-light">
          VIVO
        </span>
      </div>
    </div>
  );
}

/* ── Single product card ── */
function ProductCard({
  product,
  index,
}: {
  product: (typeof PRODUCTS)[number];
  index: number;
}) {
  const { addItem, setIsOpen } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({ id: product.id, name: product.name, price: product.price, icon: product.icon });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    // drawer is opened by addItem via CartContext
    void setIsOpen; // consumed via addItem
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.65, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5 }}
      className="group flex flex-col cursor-default"
    >
      {/* Image area */}
      <div className="relative rounded-xl overflow-hidden">
        <ProductPlaceholder gradient={product.gradient} name={product.name} />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-400" />

        {/* ADD button — top right */}
        <div className="absolute top-3 right-3">
          <motion.button
            onClick={handleAdd}
            whileTap={{ scale: 0.9 }}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[#F5EEE6] shadow-lg transition-all duration-300 ${
              added
                ? 'bg-[#2d6e2d]'
                : 'bg-[#731515] hover:bg-[#aa4848]'
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {added ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Check size={13} strokeWidth={2.5} />
                </motion.span>
              ) : (
                <motion.span
                  key="plus"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Plus size={13} strokeWidth={2.5} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-baseline justify-between mt-4 px-0.5">
        <h3
          className="text-sm font-medium text-[#F5EEE6] group-hover:text-[#C9A84C] transition-colors duration-300"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {product.name}
        </h3>
        <span
          className="text-sm text-[#C9A84C] font-light"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          €{product.price}
        </span>
      </div>
    </motion.div>
  );
}

/* ── Section ── */
export default function WearTheClubSection() {
  return (
    <section id="boutique" className="py-28 md:py-32 bg-[#0a0103] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-56 bg-[#731515]/6 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-14"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-4">
            MEMBERS ONLY
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2
                className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#F5EEE6] leading-none section-title"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                WEAR THE CLUB
              </h2>
              <p
                className="mt-4 text-base text-[#C4B5A0] font-light italic"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Limited drops. Iconic pieces.
              </p>
            </div>
          </div>
        </motion.div>

        {/* 3×2 grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
          {PRODUCTS.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
