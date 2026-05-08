'use client';

import { useState, useCallback, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Plus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useCart } from '@/contexts/CartContext';

const SIZES = ['S', 'M', 'L', 'XL'] as const;
type Size = (typeof SIZES)[number];

const PRODUCTS = [
  { id: 201, name: 'Classic Tee',    price: 35, icon: '👕', image: '/merch/maglietta.png',      description: 'Soft 100% cotton tee with embroidered club crest.',   hasSize: true  },
  { id: 202, name: 'Club Cap',       price: 30, icon: '🧢', image: '/merch/cappellino.png',     description: 'Structured 6-panel cap with tonal logo.',             hasSize: false },
  { id: 203, name: 'Tote Bag',       price: 25, icon: '👜', image: '/merch/totebag.png',        description: 'Heavy canvas tote — fits two bottles.',               hasSize: false },
  { id: 204, name: 'Corkscrew',      price: 20, icon: '🔩', image: '/merch/cavatappi.png',      description: 'Professional-grade waiter\'s corkscrew.',             hasSize: false },
  { id: 205, name: 'Wine Carrier',   price: 45, icon: '🍶', image: '/merch/portabicchiere.png', description: 'Insulated carrier for up to 4 bottles.',              hasSize: false },
  { id: 206, name: 'Club Hoodie',    price: 65, icon: '🧥', image: '/merch/felpa.png',          description: 'Heavyweight fleece with chest logo.',                 hasSize: true  },
  { id: 207, name: 'Wine Glass',     price: 18, icon: '🍷', image: '/merch/bicchiere.png',      description: 'Crystal-clear glass with engraved club logo.',        hasSize: false },
  { id: 208, name: 'IQOS Case',      price: 22, icon: '📦', image: '/merch/iqos.png',           description: 'Slim protective case with Vivo Wine Club branding.',  hasSize: false },
] as const;

type Product = (typeof PRODUCTS)[number];

interface ProductCardProps {
  product: Product;
  index: number;
  reducedMotion: boolean | null;
}

const ProductCard = memo(function ProductCard({ product, index, reducedMotion }: ProductCardProps) {
  const { addItem } = useCart();
  const [added, setAdded]   = useState(false);
  const [size, setSize]     = useState<Size>('M');
  const [sizeError, setSizeError] = useState(false);

  const handleAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const cartName = product.hasSize ? `${product.name} — ${size}` : product.name;
    addItem({
      id:    product.id,
      name:  cartName,
      price: product.price,
      icon:  product.icon,
      image: product.image,
    });
    setAdded(true);
    setSizeError(false);
    setTimeout(() => setAdded(false), 1800);
  }, [addItem, product, size]);

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
      <div className="relative rounded-xl overflow-hidden aspect-square">
        <Image
          src={product.image}
          alt={product.name}
          fill
          loading="lazy"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

        {/* ADD button */}
        <div className="absolute top-3 right-3">
          <motion.button
            onClick={handleAdd}
            whileTap={reducedMotion ? undefined : { scale: 0.9 }}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg transition-colors duration-300 ${
              added ? 'bg-[#2d6e2d]' : 'bg-[#731515] hover:bg-[#aa4848]'
            }`}
            aria-label={`Add ${product.name} to cart`}
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
            {product.name}
          </h3>
          <span className="text-sm text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
            €{product.price}
          </span>
        </div>
        <p className="text-xs text-[#7a4a4a] leading-relaxed mb-3" style={{ fontFamily: 'var(--font-nunito)' }}>
          {product.description}
        </p>

        {/* Size selector — only for clothing */}
        {product.hasSize && (
          <div className="flex items-center gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setSize(s); setSizeError(false); }}
                className={`w-8 h-8 text-[10px] tracking-widest border transition-colors duration-150 ${
                  size === s
                    ? 'border-[#731515] bg-[#731515] text-white'
                    : 'border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515] hover:text-[#731515]'
                } ${sizeError ? 'border-red-400' : ''}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default function WearTheClubPage() {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">

        {/* ── HERO IMAGE ── */}
        <div className="relative w-full" style={{ height: 350 }}>
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
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/70 hover:text-white transition-colors duration-300 group"
            >
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
              BACK
            </Link>
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
              {PRODUCTS.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  reducedMotion={reducedMotion}
                />
              ))}
            </div>

            {/* Bottom note */}
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
          </div>
        </section>

      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
