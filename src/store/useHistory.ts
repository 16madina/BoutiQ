import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { deviceStorage } from '@/store/persist';
import type { CategoryId } from '@/types';

interface HistoryState {
  /** Produits consultés, le plus récent en premier. */
  products: string[];
  /** Boutiques consultées, la plus récente en premier. */
  stores: string[];
  /** Nombre de produits consultés par catégorie. */
  categories: Partial<Record<CategoryId, number>>;
  viewProduct: (p: { id: string; categoryId: CategoryId }) => void;
  viewStore: (storeId: string) => void;
  clear: () => void;
}

const front = (list: string[], id: string, max: number) => [id, ...list.filter((x) => x !== id)].slice(0, max);

/**
 * Ce que la personne a regardé, gardé sur son appareil uniquement. Sert aux sections
 * « Pour vous », « Récemment consultés », « Parce que vous avez consulté… ».
 */
export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      products: [],
      stores: [],
      categories: {},
      viewProduct: ({ id, categoryId }) =>
        set((s) => (s.products[0] === id ? s : { products: front(s.products, id, 24), categories: { ...s.categories, [categoryId]: (s.categories[categoryId] ?? 0) + 1 } })),
      viewStore: (storeId) => set((s) => (s.stores[0] === storeId ? s : { stores: front(s.stores, storeId, 8) })),
      clear: () => set({ products: [], stores: [], categories: {} }),
    }),
    { name: 'boutiq-history', storage: deviceStorage },
  ),
);
