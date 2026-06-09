import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { http } from '../services/api';
import type { Cart } from '../types';
import { useAuth } from './AuthContext';

interface CartContextValue {
  cart: Cart;
  loading: boolean;
  add: (produtoId: number, qty?: number) => Promise<void>;
  update: (itemId: number, qty: number) => Promise<void>;
  remove: (itemId: number) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
}

const EMPTY: Cart = { items: [], total: 0 };
const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart>(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setCart(EMPTY); return; }
    setLoading(true);
    try {
      const c = await http.get<Cart>('/cart');
      setCart(c);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  async function add(produtoId: number, qty: number = 1) {
    const c = await http.post<Cart>('/cart/items', { produto_id: produtoId, quantidade: qty });
    setCart(c);
  }

  async function update(itemId: number, qty: number) {
    const c = await http.put<Cart>(`/cart/items/${itemId}`, { quantidade: qty });
    setCart(c);
  }

  async function remove(itemId: number) {
    const c = await http.delete<Cart>(`/cart/items/${itemId}`);
    setCart(c);
  }

  async function clear() {
    const c = await http.delete<Cart>('/cart');
    setCart(c);
  }

  return (
    <CartContext.Provider value={{ cart, loading, add, update, remove, clear, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
