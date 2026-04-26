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

const PRODUCTS = [
  { id: 201, name: 'Classic Tee',  price: 35, icon: '👕', image: '/events/wine-party10.JPG',  description: 'Soft 100% cotton tee with embroidered club crest.' },
  { id: 202, name: 'Club Cap',     price: 30, icon: '🧢', image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400', description: 'Structured 6-panel cap with tonal logo.' },
  { id: 203, name: 'Tote Bag',     price: 25, icon: '👜', image: '/events/wine-party1.JPG',   description: 'Heavy canvas tote — fits two bottles.' },
  { id: 204, name: 'Corkscrew',    price: 20, icon: '🔩', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400', description: 'Professional-grade waiter\'s corkscrew.' },
  { id: 205, name: 'Wine Bag',     price: 45, icon: '🍶', image: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=400', description: 'Insulated carrier for up to 4 bottles.' },
  { id: 206, name: 'Club Hoodie',  price: 65, icon: '🧥', image: '/events/wine-party11.JPG',  description: 'Heavyweight fleece with chest logo.' },
] as const;

type Product = (typeof PRODUCTS)[number];

interface ProductCardProps {
  product: Product;
  index: number;
  reducedMotion: boolean | null;
}

const ProductCard = memo(function ProductCard({ product, index, reducedMotion }: ProductCardProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({ id: product.id, name: product.name, price: product.price, icon: product.icon });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }, [addItem, product]);

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
        <p className="text-xs text-[#7a4a4a] leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
          {product.description}
        </p>
      </div>
    </motion.div>
  );
});

export default function WearTheClubPage() {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[115px]">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="fog-center" />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 mb-10 group"
            >
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
              BACK
            </Link>

            <motion.div
              initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.8 }}
            >
              <div className="text-[10px] tracking-[0.4em] text-[#731515] mb-4">VIVO WINE CLUB — Good Wine. Good Music. Good People.</div>
              <h1
                className="text-[clamp(3rem,8vw,6rem)] font-light text-[#1a0505] leading-none section-title mb-6"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                WEAR THE CLUB
              </h1>
              <p
                className="text-lg md:text-xl text-[#7a4a4a] font-light italic max-w-lg"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Each piece carries the identity of the club. Wear it, share it, live it.
              </p>
            </motion.div>
          </div>
        </section>

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
