'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export interface CartItem {
  id: string;
  // Stable unique key: "<productId>:<variantId|''>:<size|''>".
  // Used for all cart identity ops (add/remove/update) so two color variants
  // of the same product are always kept as separate rows.
  cartKey: string;
  name: string;         // display label, e.g. "Classic Tee — M — Midnight Blue"
  price: number;
  quantity: number;
  icon: string;
  image: string;        // path under /public, e.g. "/merch/maglietta.png"
  variantId?: string | null;    // product_variants.id if a color variant was selected
  size?: string | null;         // selected size if applicable
  shippingCost?: number | null; // per-product shipping override; null = use global default
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // cartKey is the stable identity: "<productId>:<variantId|''>:<size|''>".
  // Different color variants of the same product have different cartKeys, so
  // they are always kept as separate rows regardless of their display name.
  const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.cartKey === newItem.cartKey);
      if (existing) {
        return prev.map((item) =>
          item.cartKey === newItem.cartKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...newItem, quantity: 1 }];
    });
    setIsOpen(true);
  };

  const removeItem = (cartKey: string) => {
    setItems((prev) => prev.filter((item) => item.cartKey !== cartKey));
  };

  const updateQuantity = (cartKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartKey);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.cartKey === cartKey ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        itemCount,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
