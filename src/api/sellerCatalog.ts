/**
 * Pont entre la boutique créée sur l'appareil et le catalogue public.
 * Production : ces données viendront des tables Supabase `stores` / `products`.
 */
import { useSeller } from '@/store/useSeller';
import type { Product, Store } from '@/types';
import type { SellerProduct, SellerStore } from '@/types/seller';

export const DELIVERY_DEFAULT = 'Livraison à convenir avec le vendeur';

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase() || 'MM';
}

export function toPublicStore(s: SellerStore): Store {
  return {
    id: s.slug,
    slug: s.slug,
    name: s.name,
    city: s.city,
    country: s.country,
    description: s.description || 'Nouvelle boutique sur BoutiQ.',
    logoInitials: initials(s.name),
    logoColor: '#B87A3D',
    logoUri: s.logo?.uri,
    bannerUri: s.banner?.uri,
    rating: 0,
    reviewsCount: 0,
    followers: 0,
    verified: s.status === 'verified',
    salesEnabled: s.status === 'verified',
    delivery: DELIVERY_DEFAULT,
    collections: s.collections.map((c) => c.name),
  };
}

export function toPublicProduct(p: SellerProduct, store: SellerStore, rank: number): Product {
  const cover = p.photos[0];
  const aspect = cover ? Math.min(Math.max(cover.height / cover.width, 0.75), 1.45) : 1;
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    oldPrice: p.oldPrice,
    categoryId: p.categoryId,
    storeId: store.slug,
    collection: store.collections.find((c) => c.id === p.collectionId)?.name,
    photoId: '',
    imageUri: cover?.uri,
    aspect,
    rating: 0,
    reviewsCount: 0,
    createdRank: -1000 + rank,
    salesEnabled: store.status === 'verified',
  };
}

export function getSellerPublicStore(id: string): Store | undefined {
  const { store } = useSeller.getState();
  return store && (store.slug === id || store.id === id) ? toPublicStore(store) : undefined;
}

/** Produits publiés de la boutique locale, au format catalogue. */
export function getSellerPublicProducts(): Product[] {
  const { store, products } = useSeller.getState();
  if (!store) return [];
  return products
    .filter((p) => p.status === 'published' && p.photos.length > 0)
    .map((p, i) => toPublicProduct(p, store, i));
}

export function isSellerStoreVerified(): boolean {
  return useSeller.getState().store?.status === 'verified';
}
