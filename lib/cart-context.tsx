"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/data";

export type CartLine = {
  productId: string;
  quantity: number;
  title: string;
  price: number;
  image: string;
  storeName: string;
  /** Set for new carts; missing on older localStorage payloads (resolved at checkout). */
  storeSlug?: string;
};

const STORAGE_KEY = "kulmiscart-cart";

type CartContextValue = {
  lines: CartLine[];
  addItem: (product: Product, qty?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, qty: number) => void;
  clear: () => void;
  totalItems: number;
  subtotal: number;
  isReady: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

/** When a client subtree renders without CartProvider (e.g. some Next.js 16 / Turbopack boundaries). */
const fallbackCartValue: CartContextValue = {
  lines: [],
  addItem: () => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.warn("[kulmiscart] CartProvider missing — add to cart ignored.");
    }
  },
  removeItem: () => {},
  setQuantity: () => {},
  clear: () => {},
  totalItems: 0,
  subtotal: 0,
  isReady: true,
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) setLines(parsed as CartLine[]);
        }
      } catch {
        /* ignore corrupt storage */
      }
      setIsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Drop cart lines whose products no longer exist (e.g. after store data reset). */
  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/marketplace/product-ids");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { ids?: string[] };
        const valid = new Set(data.ids ?? []);
        setLines((prev) => {
          const next = prev.filter((l) => valid.has(l.productId));
          return next.length === prev.length ? prev : next;
        });
      } catch {
        /* offline / transient */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* quota / private mode */
    }
  }, [lines, isReady]);

  const addItem = useCallback((product: Product, qty = 1) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.productId === product.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + qty };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          quantity: qty,
          title: product.title,
          price: product.price,
          image: product.image,
          storeName: product.storeName,
          storeSlug: product.storeSlug,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const setQuantity = useCallback(
    (productId: string, qty: number) => {
      if (qty < 1) {
        setLines((prev) => prev.filter((l) => l.productId !== productId));
        return;
      }
      setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity: qty } : l)));
    },
    [],
  );

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    const totalItems = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    return {
      lines,
      addItem,
      removeItem,
      setQuantity,
      clear,
      totalItems,
      subtotal,
      isReady,
    };
  }, [lines, addItem, removeItem, setQuantity, clear, isReady]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (ctx) return ctx;
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.warn(
      "[kulmiscart] CartProvider missing — using empty cart. Wrap the app with CartProvider (see components/providers.tsx).",
    );
  }
  return fallbackCartValue;
}
