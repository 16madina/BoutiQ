import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { isDemoProduct } from '@/api/catalog';
import { deviceStorage } from '@/store/persist';

import type { SortOption } from '@/types';

export interface CartLine {
  productId: string;
  quantity: number;
  size?: string;
  /** Variante choisie (« Rouge · M », « 500 ml »…), prix propre. */
  variant?: string;
  /** Couleur choisie parmi celles du produit. */
  color?: string;
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
  /** Codes promo activés par le client, par boutique : repris au moment de commander. */
  promoCodes: Record<string, string>;
  filters: SearchFilters;
  setPromoCode: (storeKey: string, code: string | null) => void;
  toggleFavorite: (productId: string) => boolean;
  addToCart: (productId: string, size?: string, variant?: string, color?: string) => void;
  setQuantity: (productId: string, quantity: number, size?: string, variant?: string, color?: string) => void;
  removeFromCart: (productId: string, size?: string, variant?: string, color?: string) => void;
  /** Retire du panier et des favoris les anciens produits de démonstration. */
  purgeDemo: () => void;
  /** Retire les lignes commandées (les autres restent dans le panier). */
  removeLines: (lines: CartLine[]) => void;
  clearCart: () => void;
  toggleFollow: (storeId: string) => void;
  /** Favoris et abonnements relus depuis le compte (autre appareil). */
  mergeRemote: (patch: { favorites?: string[]; followedStores?: string[] }) => void;
  setFilters: (patch: Partial<SearchFilters>) => void;
  resetFilters: () => void;
}

const sameLine = (l: CartLine, productId: string, size?: string, variant?: string, color?: string) =>
  l.productId === productId && l.size === size && l.variant === variant && l.color === color;

/**
 * État client : favoris, panier, boutiques suivies, filtres.
 * Gardé sur l'appareil ; favoris et abonnements sont aussi enregistrés dans le compte
 * Supabase (voir src/api/shopSync.ts).
 */
export const useShop = create<ShopState>()(
  persist(
    (set, get) => ({
  favorites: {},
  cart: [],
  followedStores: {},
  promoCodes: {},
  filters: DEFAULT_FILTERS,

  setPromoCode: (storeKey, code) =>
    set((s) => {
      const promoCodes = { ...s.promoCodes };
      if (code) promoCodes[storeKey] = code.trim().toUpperCase();
      else delete promoCodes[storeKey];
      return { promoCodes };
    }),

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

  purgeDemo: () =>
    set((s) => {
      const cart = s.cart.filter((l) => !isDemoProduct(l.productId));
      const favorites = Object.fromEntries(Object.entries(s.favorites).filter(([id]) => !isDemoProduct(id))) as Record<string, true>;
      const changed = cart.length !== s.cart.length || Object.keys(favorites).length !== Object.keys(s.favorites).length;
      return changed ? { cart, favorites } : s;
    }),

  addToCart: (productId, size, variant, color) =>
    set((s) => {
      // Les produits d'exemple (aperçu des modèles de vitrine) ne se commandent pas.
      if (isDemoProduct(productId)) return s;
      const existing = s.cart.find((l) => sameLine(l, productId, size, variant, color));
      if (existing) {
        return { cart: s.cart.map((l) => (l === existing ? { ...l, quantity: Math.min(l.quantity + 1, 99) } : l)) };
      }
      return { cart: [...s.cart, { productId, size, variant, color, quantity: 1 }] };
    }),

  setQuantity: (productId, quantity, size, variant, color) =>
    set((s) => ({
      cart:
        quantity <= 0
          ? s.cart.filter((l) => !sameLine(l, productId, size, variant, color))
          : s.cart.map((l) => (sameLine(l, productId, size, variant, color) ? { ...l, quantity: Math.min(quantity, 99) } : l)),
    })),

  removeFromCart: (productId, size, variant, color) => set((s) => ({ cart: s.cart.filter((l) => !sameLine(l, productId, size, variant, color)) })),

  removeLines: (lines) => set((s) => ({ cart: s.cart.filter((l) => !lines.some((o) => sameLine(l, o.productId, o.size, o.variant, o.color))) })),

  clearCart: () => set({ cart: [] }),

  toggleFollow: (storeId) =>
    set((s) => {
      const followedStores = { ...s.followedStores };
      if (followedStores[storeId]) delete followedStores[storeId];
      else followedStores[storeId] = true;
      return { followedStores };
    }),

  mergeRemote: ({ favorites, followedStores }) =>
    set((s) => ({
      favorites: favorites ? { ...s.favorites, ...Object.fromEntries(favorites.map((k) => [k, true as const])) } : s.favorites,
      followedStores: followedStores
        ? { ...s.followedStores, ...Object.fromEntries(followedStores.map((k) => [k, true as const])) }
        : s.followedStores,
    })),

  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
    }),
    {
      name: 'boutiq-shop',
      storage: deviceStorage,
      // Les filtres de recherche repartent à zéro à chaque ouverture.
      partialize: (s) => ({ favorites: s.favorites, cart: s.cart, followedStores: s.followedStores, promoCodes: s.promoCodes }),
    },
  ),
);

export const useCartCount = () => useShop((s) => s.cart.reduce((sum, l) => sum + l.quantity, 0));
export const useIsFavorite = (productId: string) => useShop((s) => !!s.favorites[productId]);
