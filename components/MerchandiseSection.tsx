'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  sizes: string[];
  images: string[];
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const image             = product.images[0] ?? '';

  const handleAdd = () => {
    addItem({ id: product.id, name: product.title, price: product.price, icon: '', image });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="group glass-card hover:border-[#C9A84C]/35 transition-all duration-500 hover:shadow-[0_0_35px_rgba(201,168,76,0.08)] flex flex-col overflow-hidden"
    >
      {/* Image / placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-[#1a0808] to-[#350A0A] overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            loading="lazy"
            className="object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20 group-hover:opacity-35 group-hover:scale-110 transition-all duration-700">
            🍷
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3
          className="text-base font-medium text-[#F5EEE6] mb-2 group-hover:text-[#C9A84C] transition-colors duration-300"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {product.title}
        </h3>
        <p
          className="text-sm text-[#C4B5A0] leading-relaxed mb-5 flex-1"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {product.description}
        </p>

        <div className="flex items-center justify-between">
          <span
            className="text-xl font-semibold text-[#C9A84C]"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            €{product.price}
          </span>
          <motion.button
            onClick={handleAdd}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-2 px-4 py-2.5 text-[10px] tracking-[0.25em] transition-all duration-300 ${
              added
                ? 'bg-[#2d5a2d] border border-[#4a9a4a] text-green-300'
                : 'bg-[#731515]/20 border border-[#731515]/50 text-[#F5EEE6] hover:bg-[#731515] hover:border-[#731515]'
            }`}
          >
            <AnimatePresence mode="wait">
              {added ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Check size={12} /> ADDED
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <ShoppingBag size={12} /> ADD
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// Skeleton card during loading
function SkeletonCard() {
  return (
    <div className="glass-card flex flex-col overflow-hidden animate-pulse">
      <div className="h-48 bg-white/5" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/8 rounded w-full" />
        <div className="h-3 bg-white/8 rounded w-2/3" />
      </div>
    </div>
  );
}

export default function MerchandiseSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/api/merch/products/public')
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => {/* silently fail */})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="boutique" className="py-32 bg-[#0d0306] relative overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-64 bg-[#5b1a14]/8 rounded-full blur-[100px]" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-14"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-4">
            EXCLUSIVE SELECTION
          </div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#F5EEE6] leading-none section-title"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            BOUTIQUE
          </h2>
          <p
            className="mt-6 text-lg text-[#C4B5A0] font-light italic max-w-md"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Accessories, experiences and apparel for true wine lovers
          </p>
        </motion.div>

        {/* Products grid */}
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
              : products.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))
            }
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
