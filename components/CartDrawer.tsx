'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, total, clearCart } = useCart();
  const reducedMotion = useReducedMotion();
  const d = (n: number) => (reducedMotion ? 0 : n);

  const handleClose = useCallback(() => setIsOpen(false), [setIsOpen]);
  const handleBoutique = useCallback(() => {
    setIsOpen(false);
    document.querySelector('#boutique')?.scrollIntoView({ behavior: 'smooth' });
  }, [setIsOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: d(0.2) }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: reducedMotion ? '0%' : '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: reducedMotion ? '0%' : '100%' }}
            transition={reducedMotion ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-md bg-white border-l border-[#e8d5d5] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#e8d5d5]">
              <div className="flex items-center gap-3">
                <ShoppingBag size={18} className="text-[#731515]" />
                <span className="text-sm tracking-[0.3em] text-[#1a0505]">CART</span>
                {items.length > 0 && (
                  <span className="text-xs text-[#7a4a4a]">({items.length})</span>
                )}
              </div>
              <button onClick={handleClose} className="text-[#7a4a4a] hover:text-[#731515] transition-colors">
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
                    transition={{ duration: d(0.2) }}
                    className="flex flex-col items-center justify-center h-full text-center gap-4"
                  >
                    <div className="text-6xl opacity-20">🍷</div>
                    <p className="text-[#7a4a4a] text-sm italic" style={{ fontFamily: 'var(--font-nunito)' }}>
                      Your cart is empty
                    </p>
                    <button
                      onClick={handleBoutique}
                      className="mt-2 text-[10px] tracking-[0.3em] text-[#731515] border border-[#731515]/40 px-6 py-3 hover:bg-[#731515]/8 transition-colors"
                    >
                      VISIT THE BOUTIQUE
                    </button>
                  </motion.div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        layout={!reducedMotion}
                        initial={{ opacity: 0, x: reducedMotion ? 0 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: reducedMotion ? 0 : -20, height: 0 }}
                        transition={{ duration: d(0.3) }}
                        className="flex gap-4 p-4 glass-card"
                      >
                        <div className="w-12 h-12 bg-[#731515]/10 flex items-center justify-center text-2xl shrink-0">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm text-[#1a0505] leading-snug mb-2 truncate"
                            style={{ fontFamily: 'var(--font-syne)' }}
                          >
                            {item.name}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-6 h-6 flex items-center justify-center border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515] hover:text-[#731515] transition-colors"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="text-sm text-[#1a0505] w-5 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-6 h-6 flex items-center justify-center border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515] hover:text-[#731515] transition-colors"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
                                €{(item.price * item.quantity).toFixed(2)}
                              </span>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-[#7a4a4a]/50 hover:text-[#aa4848] transition-colors"
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
              <div className="px-8 py-6 border-t border-[#e8d5d5] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs tracking-[0.3em] text-[#7a4a4a]">TOTAL</span>
                  <span className="text-2xl font-light text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
                    €{total.toFixed(2)}
                  </span>
                </div>
                <button className="w-full py-4 bg-[#731515] text-white text-[11px] tracking-[0.35em] hover:bg-[#aa4848] transition-colors duration-300">
                  CHECKOUT
                </button>
                <button
                  onClick={clearCart}
                  className="w-full py-2.5 text-[10px] tracking-[0.3em] text-[#7a4a4a]/50 hover:text-[#7a4a4a] transition-colors"
                >
                  CLEAR CART
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
