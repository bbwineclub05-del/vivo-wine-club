'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, total, clearCart } = useCart();
  const reducedMotion = useReducedMotion();
  const d = (n: number) => (reducedMotion ? 0 : n);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError]     = useState('');
  const [discountCode, setDiscountCode]       = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError]     = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);
  const [globalShipping, setGlobalShipping]   = useState(0);

  useEffect(() => {
    fetch('/api/merch/settings')
      .then(r => r.json())
      .then(d => { if (typeof d?.shipping_cost === 'number') setGlobalShipping(d.shipping_cost); })
      .catch(() => {});
  }, []);

  // Effective shipping = max per-product override across items, falling back to global
  const effectiveShipping = items.length === 0 ? 0 : Math.max(
    0,
    ...items.map(item => item.shippingCost != null ? item.shippingCost : globalShipping),
  );

  const handleClose    = useCallback(() => setIsOpen(false), [setIsOpen]);
  const handleBoutique = useCallback(() => {
    setIsOpen(false);
    document.querySelector('#boutique')?.scrollIntoView({ behavior: 'smooth' });
  }, [setIsOpen]);

  const handleApplyCode = useCallback(async () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) return;
    setDiscountError('');
    setDiscountLoading(true);
    // Validate by attempting a dry-run checkout (we just peek at the code validity)
    const res  = await fetch('/api/checkout', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ items, discountCode: code, validateOnly: true }),
    });
    const data = await res.json();
    setDiscountLoading(false);
    if (!res.ok) {
      setDiscountError(data.error ?? 'Invalid code.');
      setDiscountApplied(false);
    } else {
      setDiscountApplied(true);
      setDiscountError('');
    }
  }, [discountCode, items]);

  const handleCheckout = useCallback(async () => {
    setCheckoutError('');
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          discountCode: discountApplied ? discountCode.trim().toUpperCase() : undefined,
          shippingCost: effectiveShipping > 0 ? effectiveShipping : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Checkout failed');
      setCheckoutLoading(false);
    }
  }, [items, discountCode, discountApplied, effectiveShipping]);

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
            className="fixed right-0 z-[70] bg-white border-l border-[#e8d5d5] flex flex-col" style={{ top: 64, height: 'calc(100dvh - 64px)', width: 'min(100vw, 448px)' }}
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
                        key={item.name}
                        layout={!reducedMotion}
                        initial={{ opacity: 0, x: reducedMotion ? 0 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: reducedMotion ? 0 : -20, height: 0 }}
                        transition={{ duration: d(0.3) }}
                        className="flex gap-4 p-4 glass-card"
                      >
                        {/* Product thumbnail */}
                        <div className="w-[60px] h-[60px] rounded-lg overflow-hidden shrink-0 bg-[#f5eded] relative flex items-center justify-center">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="60px"
                            />
                          ) : (
                            <span className="text-2xl">{item.icon}</span>
                          )}
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
                                onClick={() => updateQuantity(item.name, item.quantity - 1)}
                                className="w-6 h-6 flex items-center justify-center border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515] hover:text-[#731515] transition-colors"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="text-sm text-[#1a0505] w-5 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.name, item.quantity + 1)}
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
                                onClick={() => removeItem(item.name)}
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs tracking-[0.25em] text-[#7a4a4a]/70">SUBTOTALE</span>
                    <span className="text-sm text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
                      €{total.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs tracking-[0.25em] text-[#7a4a4a]/70">SPEDIZIONE</span>
                    <span className="text-sm text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
                      {effectiveShipping > 0 ? `€${effectiveShipping.toFixed(2)}` : 'Gratis'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-[#e8d5d5]">
                    <span className="text-xs tracking-[0.3em] text-[#7a4a4a]">TOTALE</span>
                    <span className="text-2xl font-light text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
                      €{(total + effectiveShipping).toFixed(2)}
                    </span>
                  </div>
                </div>
                {/* Discount code */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value);
                        setDiscountApplied(false);
                        setDiscountError('');
                      }}
                      placeholder="Discount code"
                      className="flex-1 bg-white border border-[#e8d5d5] px-3 py-2 text-xs text-[#1a0505] placeholder-[#b09090] focus:outline-none focus:border-[#731515] transition-colors uppercase"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCode}
                      disabled={discountLoading || !discountCode.trim()}
                      className="px-3 py-2 border border-[#731515] text-[#731515] text-[10px] tracking-[0.2em] hover:bg-[#731515] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {discountLoading ? '…' : 'APPLY'}
                    </button>
                  </div>
                  {discountApplied && (
                    <p className="text-[10px] text-green-700" style={{ fontFamily: 'var(--font-nunito)' }}>
                      ✓ Code applied — discount will be shown at checkout.
                    </p>
                  )}
                  {discountError && (
                    <p className="text-[10px] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
                      {discountError}
                    </p>
                  )}
                </div>

                {checkoutError && (
                  <p className="text-xs text-[#731515] text-center" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {checkoutError}
                  </p>
                )}
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="w-full py-4 bg-[#731515] text-white text-[11px] tracking-[0.35em] hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-300"
                >
                  {checkoutLoading ? 'REDIRECTING…' : 'CHECKOUT'}
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
