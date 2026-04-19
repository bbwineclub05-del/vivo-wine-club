'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const CATEGORIES = ['ALL', 'ACCESSORIES', 'EXPERIENCES', 'APPAREL'] as const;
type Category = (typeof CATEGORIES)[number];

const PRODUCTS = [
  {
    id: 101,
    name: 'Decanter Crystal Premium',
    description: 'Hand-blown crystal decanter, limited numbered edition',
    price: 120,
    category: 'ACCESSORIES',
    icon: '🫗',
    badge: 'LIMITED',
    gradient: 'from-[#1a0808] to-[#350A0A]',
  },
  {
    id: 102,
    name: 'Bordeaux Crystal Set',
    description: 'Set of 4 Riedel crystal glasses, ideal for great Bordeaux wines',
    price: 89,
    category: 'ACCESSORIES',
    icon: '🍷',
    badge: null,
    gradient: 'from-[#100515] to-[#2a1030]',
  },
  {
    id: 103,
    name: 'Membership Gold',
    description: "Annual Gold membership with unlimited access to all club events",
    price: 299,
    category: 'EXPERIENCES',
    icon: '⭐',
    badge: 'BESTSELLER',
    gradient: 'from-[#1a1205] to-[#3a2a10]',
  },
  {
    id: 104,
    name: 'Luxury Wine Journal',
    description: 'Full-leather bound tasting diary, 365 acid-free pages',
    price: 55,
    category: 'ACCESSORIES',
    icon: '📖',
    badge: null,
    gradient: 'from-[#0a1505] to-[#1a2a10]',
  },
  {
    id: 105,
    name: 'Sommelier Kit Pro',
    description: 'Professional set: corkscrew, foil cutter, thermometer, aerator, goutte',
    price: 75,
    category: 'ACCESSORIES',
    icon: '🔧',
    badge: null,
    gradient: 'from-[#05101a] to-[#102030]',
  },
  {
    id: 106,
    name: 'Tote Bag Premium',
    description: 'Heavy canvas wine carrier, holds 6 bottles, gold embroidered logo',
    price: 35,
    category: 'APPAREL',
    icon: '👜',
    badge: null,
    gradient: 'from-[#0a050f] to-[#1a1025]',
  },
  {
    id: 107,
    name: 'Exclusive Gift Box',
    description: 'Curated gift box: selected wine, glass, accessories and quarterly membership',
    price: 185,
    category: 'EXPERIENCES',
    icon: '🎁',
    badge: 'PERFECT GIFT',
    gradient: 'from-[#150a05] to-[#2a1a10]',
  },
  {
    id: 108,
    name: 'T-Shirt Pima Cotton',
    description: 'Unisex 100% Pima cotton t-shirt, gold thread embroidered logo',
    price: 45,
    category: 'APPAREL',
    icon: '👕',
    badge: null,
    gradient: 'from-[#101005] to-[#20201a]',
  },
];

function ProductCard({ product, index }: { product: (typeof PRODUCTS)[0]; index: number }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem({ id: product.id, name: product.name, price: product.price, icon: product.icon });
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
      {/* Image */}
      <div className={`relative h-48 bg-gradient-to-br ${product.gradient} overflow-hidden`}>
        <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-25 group-hover:opacity-45 group-hover:scale-110 transition-all duration-700">
          {product.icon}
        </div>
        {product.badge && (
          <div className="absolute top-3 left-3">
            <span className="text-[8px] tracking-[0.35em] text-[#C9A84C] border border-[#C9A84C]/50 px-2.5 py-1 bg-[#0d0306]/70">
              {product.badge}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3
          className="text-base font-medium text-[#F5EEE6] mb-2 group-hover:text-[#C9A84C] transition-colors duration-300"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {product.name}
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

export default function MerchandiseSection() {
  const [activeCategory, setActiveCategory] = useState<Category>('ALL');

  const filtered =
    activeCategory === 'ALL'
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === activeCategory);

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

        {/* Filter tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap gap-3 mb-10"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[10px] tracking-[0.3em] px-5 py-2.5 border transition-all duration-300 ${
                activeCategory === cat
                  ? 'border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10'
                  : 'border-[#C4B5A0]/20 text-[#C4B5A0] hover:border-[#C4B5A0]/50 hover:text-[#F5EEE6]'
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Products grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
