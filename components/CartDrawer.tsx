'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, total, clearCart } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-md bg-[#0d0306] border-l border-[#C9A84C]/20 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#C9A84C]/15">
              <div className="flex items-center gap-3">
                <ShoppingBag size={18} className="text-[#C9A84C]" />
                <span
                  className="text-sm tracking-[0.3em] text-[#F5EEE6]"
                >
                  CARRELLO
                </span>
                {items.length > 0 && (
                  <span className="text-xs text-[#C4B5A0]">({items.length})</span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#C4B5A0] hover:text-[#C9A84C] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <AnimatePresence>
                {items.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full text-center gap-4"
                  >
                    <div className="text-6xl opacity-20">🍷</div>
                    <p className="text-[#C4B5A0] text-sm italic" style={{ fontFamily: 'var(--font-cormorant)' }}>
                      Il tuo carrello è vuoto
                    </p>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        document.querySelector('#boutique')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="mt-2 text-[10px] tracking-[0.3em] text-[#C9A84C] border border-[#C9A84C]/40 px-6 py-3 hover:bg-[#C9A84C]/10 transition-colors"
                    >
                      VISITA LA BOUTIQUE
                    </button>
                  </motion.div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex gap-4 p-4 glass-card"
                      >
                        <div className="w-12 h-12 bg-[#722F37]/20 flex items-center justify-center text-2xl shrink-0">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm text-[#F5EEE6] leading-snug mb-2 truncate"
                            style={{ fontFamily: 'var(--font-playfair)' }}
                          >
                            {item.name}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-6 h-6 flex items-center justify-center border border-[#C9A84C]/30 text-[#C4B5A0] hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="text-sm text-[#F5EEE6] w-5 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-6 h-6 flex items-center justify-center border border-[#C9A84C]/30 text-[#C4B5A0] hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-[#C9A84C]" style={{ fontFamily: 'var(--font-playfair)' }}>
                                €{(item.price * item.quantity).toFixed(2)}
                              </span>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-[#C4B5A0]/50 hover:text-[#722F37] transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-8 py-6 border-t border-[#C9A84C]/15 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs tracking-[0.3em] text-[#C4B5A0]">TOTALE</span>
                  <span
                    className="text-2xl font-light text-[#C9A84C]"
                    style={{ fontFamily: 'var(--font-playfair)' }}
                  >
                    €{total.toFixed(2)}
                  </span>
                </div>
                <button className="w-full py-4 bg-[#722F37] text-[#F5EEE6] text-[11px] tracking-[0.35em] hover:bg-[#8B3A44] transition-colors duration-300">
                  PROCEDI ALL&apos;ACQUISTO
                </button>
                <button
                  onClick={clearCart}
                  className="w-full py-2.5 text-[10px] tracking-[0.3em] text-[#C4B5A0]/50 hover:text-[#C4B5A0] transition-colors"
                >
                  SVUOTA CARRELLO
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
