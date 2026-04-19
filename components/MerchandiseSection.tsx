'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const CATEGORIES = ['TUTTI', 'ACCESSORI', 'ESPERIENZE', 'ABBIGLIAMENTO'] as const;
type Category = (typeof CATEGORIES)[number];

const PRODUCTS = [
  {
    id: 101,
    name: 'Decanter Crystal Premium',
    description: 'Decanter in cristallo soffiato a mano, edizione limitata numerata',
    price: 120,
    category: 'ACCESSORI',
    icon: '🫗',
    badge: 'LIMITED',
    gradient: 'from-[#1a0808] to-[#350A0A]',
  },
  {
    id: 102,
    name: 'Set Calici Bordeaux',
    description: 'Set da 4 calici in cristallo Riedel, ideali per i grandi Bordeaux',
    price: 89,
    category: 'ACCESSORI',
    icon: '🍷',
    badge: null,
    gradient: 'from-[#100515] to-[#2a1030]',
  },
  {
    id: 103,
    name: 'Membership Gold',
    description: "Abbonamento annuale Gold con accesso illimitato a tutti gli eventi del club",
    price: 299,
    category: 'ESPERIENZE',
    icon: '⭐',
    badge: 'BESTSELLER',
    gradient: 'from-[#1a1205] to-[#3a2a10]',
  },
  {
    id: 104,
    name: 'Wine Journal Lusso',
    description: 'Diario da degustazione rilegato in pelle piena, 365 pagine acid-free',
    price: 55,
    category: 'ACCESSORI',
    icon: '📖',
    badge: null,
    gradient: 'from-[#0a1505] to-[#1a2a10]',
  },
  {
    id: 105,
    name: 'Sommelier Kit Pro',
    description: 'Set professionale: cavatappi, foil cutter, termometro, aeratore, goutte',
    price: 75,
    category: 'ACCESSORI',
    icon: '🔧',
    badge: null,
    gradient: 'from-[#05101a] to-[#102030]',
  },
  {
    id: 106,
    name: 'Tote Bag Premium',
    description: 'Borsa porta-bottiglie in canvas pesante, 6 bottiglie, logo ricamato in oro',
    price: 35,
    category: 'ABBIGLIAMENTO',
    icon: '👜',
    badge: null,
    gradient: 'from-[#0a050f] to-[#1a1025]',
  },
  {
    id: 107,
    name: 'Gift Box Esclusiva',
    description: 'Box regalo curata: vino selezionato, calice, accessori e membership trimestrale',
    price: 185,
    category: 'ESPERIENZE',
    icon: '🎁',
    badge: 'REGALO PERFETTO',
    gradient: 'from-[#150a05] to-[#2a1a10]',
  },
  {
    id: 108,
    name: 'T-Shirt Pima Cotton',
    description: 'T-shirt unisex in cotone Pima 100%, logo ricamato in filo dorato',
    price: 45,
    category: 'ABBIGLIAMENTO',
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
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          {product.name}
        </h3>
        <p
          className="text-sm text-[#C4B5A0] leading-relaxed mb-5 flex-1"
          style={{ fontFamily: 'var(--font-cormorant)' }}
        >
          {product.description}
        </p>

        <div className="flex items-center justify-between">
          <span
            className="text-xl font-semibold text-[#C9A84C]"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            €{product.price}
          </span>
          <motion.button
            onClick={handleAdd}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-2 px-4 py-2.5 text-[10px] tracking-[0.25em] transition-all duration-300 ${
              added
                ? 'bg-[#2d5a2d] border border-[#4a9a4a] text-green-300'
                : 'bg-[#7B1F1F]/20 border border-[#7B1F1F]/50 text-[#F5EEE6] hover:bg-[#7B1F1F] hover:border-[#7B1F1F]'
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
                  <Check size={12} /> AGGIUNTO
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <ShoppingBag size={12} /> AGGIUNGI
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
  const [activeCategory, setActiveCategory] = useState<Category>('TUTTI');

  const filtered =
    activeCategory === 'TUTTI'
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === activeCategory);

  return (
    <section id="boutique" className="py-32 bg-[#0d0306] relative overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-64 bg-[#4A0E0E]/8 rounded-full blur-[100px]" />

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
            SELEZIONE ESCLUSIVA
          </div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#F5EEE6] leading-none section-title"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            BOUTIQUE
          </h2>
          <p
            className="mt-6 text-lg text-[#C4B5A0] font-light italic max-w-md"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Accessori, esperienze e abbigliamento per i veri amanti del vino
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
