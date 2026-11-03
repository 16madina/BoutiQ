import { create } from 'zustand';

import type { SortOption } from '@/types';

export interface CartLine {
  productId: string;
  quantity: number;
  size?: string;
}

export interface SearchFilters {
  onlyPromo: boolean;
  priceRange: 'all' | 'lt15' | '15to50' | '50to100' | 'gt100';
  sort: SortOption;
}

export const DEFAULT_FILTERS: SearchFilters = { onlyPromo: false, priceRange: 'all', sort: 'relevance' };

export const PRICE_RANGES: Record<SearchFilters['priceRange'], { label: string; min?: number; max?: number }> = {
  all: { label: 'Tous les prix' },
  lt15: { label: 'Moins de 15 000', max: 15000 },
  '15to50': { label: '15 000 – 50 000', min: 15000, max: 50000 },
  '50to100': { label: '50 000 – 100 000', min: 50000, max: 100000 },
  gt100: { label: 'Plus de 100 000', min: 100000 },
};

interface ShopState {
  favorites: Record<string, true>;
  cart: CartLine[];
  followedStores: Record<string, true>;
  filters: SearchFilters;
  toggleFavorite: (productId: string) => boolean;
  addToCart: (productId: string, size?: string) => void;
  setQuantity: (productId: string, quantity: number, size?: string) => void;
  removeFromCart: (productId: string, size?: string) => void;
  clearCart: () => void;
  toggleFollow: (storeId: string) => void;
  setFilters: (patch: Partial<SearchFilters>) => void;
  resetFilters: () => void;
}

const sameLine = (l: CartLine, productId: string, size?: string) => l.productId === productId && l.size === size;

/**
 * État client (favoris, panier, boutiques suivies, filtres).
 * Démo : en mémoire. Production : persister (MMKV / AsyncStorage) et synchroniser avec le compte.
 */
export const useShop = create<ShopState>((set, get) => ({
  favorites: {},
  cart: [],
  followedStores: {},
  filters: DEFAULT_FILTERS,

  toggleFavorite: (productId) => {
    const isFav = !!get().favorites[productId];
    set((s) => {
      const favorites = { ...s.favorites };
      if (isFav) delete favorites[productId];
      else favorites[productId] = true;
      return { favorites };
    });
    return !isFav;
  },

  addToCart: (productId, size) =>
    set((s) => {
      const existing = s.cart.find((l) => sameLine(l, productId, size));
      if (existing) {
        return { cart: s.cart.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l)) };
      }
      return { cart: [...s.cart, { productId, size, quantity: 1 }] };
    }),

  setQuantity: (productId, quantity, size) =>
    set((s) => ({
      cart:
        quantity <= 0
          ? s.cart.filter((l) => !sameLine(l, productId, size))
          : s.cart.map((l) => (sameLine(l, productId, size) ? { ...l, quantity } : l)),
    })),

  removeFromCart: (productId, size) => set((s) => ({ cart: s.cart.filter((l) => !sameLine(l, productId, size)) })),

  clearCart: () => set({ cart: [] }),

  toggleFollow: (storeId) =>
    set((s) => {
      const followedStores = { ...s.followedStores };
      if (followedStores[storeId]) delete followedStores[storeId];
      else followedStores[storeId] = true;
      return { followedStores };
    }),

  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));

export const useCartCount = () => useShop((s) => s.cart.reduce((sum, l) => sum + l.quantity, 0));
export const useIsFavorite = (productId: string) => useShop((s) => !!s.favorites[productId]);
