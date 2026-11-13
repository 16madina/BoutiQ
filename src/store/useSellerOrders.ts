import { create } from 'zustand';

import { fetchStoreOrders, type Order } from '@/api/account';
import { useSeller } from '@/store/useSeller';

/** Commandes à traiter (en attente de confirmation) : pastille de l'onglet et rappel de l'Accueil. */
export const useSellerOrders = create<{ pending: number; setFrom: (orders: Order[]) => void; refresh: () => Promise<void> }>((set) => ({
  pending: 0,
  setFrom: (orders) => set({ pending: orders.filter((o) => o.status === 'pending').length }),
  refresh: async () => {
    const remoteId = useSeller.getState().store?.remoteId;
    if (!remoteId) return set({ pending: 0 });
    try {
      const orders = await fetchStoreOrders(remoteId);
      set({ pending: orders.filter((o) => o.status === 'pending').length });
    } catch {
      // hors ligne : on garde le dernier chiffre connu
    }
  },
}));
