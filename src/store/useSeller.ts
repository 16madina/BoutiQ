import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { deviceStorage, uid } from '@/store/persist';
import type {
  SellerDetails,
  SellerProduct,
  SellerStore,
  Space,
  StoreDraft,
} from '@/types/seller';

const EMPTY_DETAILS: SellerDetails = { fullName: '', phone: '', whatsapp: '', sellerType: 'individual' };

export const EMPTY_DRAFT: StoreDraft = {
  name: '',
  slug: '',
  slugEdited: false,
  city: '',
  country: "Côte d'Ivoire",
  description: '',
  details: EMPTY_DETAILS,
  collections: ['Nouveautés'],
};

export type VerificationRequirement = 'identity' | 'idDocument' | 'logo' | 'product';

/** Éléments requis avant l'envoi en vérification. */
export function computeMissing(
  store: SellerStore | null,
  details: SellerDetails | null,
  products: SellerProduct[],
): VerificationRequirement[] {
  const missing: VerificationRequirement[] = [];
  if (!details?.fullName || !details.phone) missing.push('identity');
  if (!details?.idDocument) missing.push('idDocument');
  if (!store?.logo) missing.push('logo');
  if (!products.some((p) => p.status === 'published')) missing.push('product');
  return missing;
}

interface SellerState {
  space: Space;
  draft: StoreDraft;
  store: SellerStore | null;
  details: SellerDetails | null;
  products: SellerProduct[];
  storeViews: number;

  setSpace: (space: Space) => void;
  updateDraft: (patch: Partial<StoreDraft>) => void;
  updateDraftDetails: (patch: Partial<SellerDetails>) => void;
  resetDraft: () => void;
  createStoreFromDraft: () => SellerStore;

  updateStore: (patch: Partial<Omit<SellerStore, 'id' | 'status' | 'createdAt'>>) => void;
  updateDetails: (patch: Partial<SellerDetails>) => void;

  saveProduct: (product: Omit<SellerProduct, 'id' | 'storeId' | 'createdAt'> & { id?: string }) => SellerProduct;
  deleteProduct: (id: string) => void;

  missingForVerification: () => VerificationRequirement[];
  submitForReview: () => VerificationRequirement[];
  /** Démo uniquement : simule la décision de l'équipe de modération. */
  demoReview: (decision: 'verified' | 'rejected') => void;
  recordStoreView: () => void;
}

export const useSeller = create<SellerState>()(
  persist(
    (set, get) => ({
      space: 'buyer',
      draft: EMPTY_DRAFT,
      store: null,
      details: null,
      products: [],
      storeViews: 0,

      setSpace: (space) => set({ space }),
      updateDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      updateDraftDetails: (patch) => set((s) => ({ draft: { ...s.draft, details: { ...s.draft.details, ...patch } } })),
      resetDraft: () => set({ draft: EMPTY_DRAFT }),

      createStoreFromDraft: () => {
        const d = get().draft;
        const store: SellerStore = {
          id: uid('store'),
          slug: d.slug,
          name: d.name.trim(),
          description: d.description.trim(),
          city: d.city,
          country: d.country,
          categoryId: d.categoryId ?? 'mode',
          logo: d.logo,
          banner: d.banner,
          collections: d.collections.filter(Boolean).map((name) => ({ id: uid('col'), name })),
          status: 'draft',
          createdAt: new Date().toISOString(),
        };
        set({ store, details: d.details, draft: EMPTY_DRAFT, space: 'seller' });
        return store;
      },

      updateStore: (patch) => set((s) => (s.store ? { store: { ...s.store, ...patch } } : s)),
      updateDetails: (patch) => set((s) => ({ details: { ...(s.details ?? EMPTY_DETAILS), ...patch } })),

      saveProduct: (input) => {
        const store = get().store;
        if (!store) throw new Error('Aucune boutique');
        const existing = input.id ? get().products.find((p) => p.id === input.id) : undefined;
        const product: SellerProduct = existing
          ? { ...existing, ...input, id: existing.id }
          : { ...input, id: uid('prd'), storeId: store.id, createdAt: new Date().toISOString() };
        set((s) => ({
          products: existing ? s.products.map((p) => (p.id === product.id ? product : p)) : [product, ...s.products],
        }));
        return product;
      },

      deleteProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

      missingForVerification: () => {
        const { store, details, products } = get();
        return computeMissing(store, details, products);
      },

      submitForReview: () => {
        const missing = get().missingForVerification();
        if (missing.length === 0) {
          set((s) => (s.store ? { store: { ...s.store, status: 'pending_review', submittedAt: new Date().toISOString(), rejectionReason: undefined } } : s));
        }
        return missing;
      },

      demoReview: (decision) =>
        set((s) =>
          s.store
            ? {
                store: {
                  ...s.store,
                  status: decision,
                  rejectionReason: decision === 'rejected' ? 'La photo de la pièce d’identité est illisible.' : undefined,
                },
              }
            : s,
        ),

      recordStoreView: () => set((s) => ({ storeViews: s.storeViews + 1 })),
    }),
    { name: 'mymarket-seller', storage: deviceStorage },
  ),
);

/** Attend la relecture du stockage local avant de décider d'une redirection. */
export function useSellerHydrated() {
  const [hydrated, setHydrated] = useState(useSeller.persist.hasHydrated());
  useEffect(() => {
    const unsub = useSeller.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useSeller.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}

export const REQUIREMENT_LABELS: Record<VerificationRequirement, string> = {
  identity: 'Nom et téléphone du vendeur',
  idDocument: 'Photo de la pièce d’identité',
  logo: 'Logo de la boutique',
  product: 'Au moins un produit publié',
};
