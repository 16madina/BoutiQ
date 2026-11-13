import type { CategoryId, Product, Store } from '@/types';

/**
 * Fil d'accueil : une suite de « sections » de formats différents (grille, collections,
 * annonce sponsorisée, boutiques, recommandations, offres, bannière, grille asymétrique).
 * L'ordre et la fréquence viennent des réglages (src/feed/config.ts), pas du code des écrans.
 */

/** Emplacements que les réglages peuvent ordonner, répéter ou désactiver. */
export type SlotKind = 'grid' | 'collections' | 'stores' | 'recommendations' | 'recent' | 'asymmetric' | 'deals' | 'banner';

export interface FeedSlot {
  kind: SlotKind;
  /** Grille : nombre de produits. */
  count?: number;
}

export interface FeedConfig {
  /** Nombre de produits affichés entre deux annonces sponsorisées. */
  adInterval: number;
  /** Nombre maximum d'apparitions d'une même annonce dans un fil. */
  adMaxPerCampaign: number;
  /** Ordre des sections ; il se répète tant qu'il reste des produits à montrer. */
  slots: FeedSlot[];
  /** Formats désactivés. */
  disabled: (SlotKind | 'sponsored')[];
  /** Catégories à mettre en avant en premier dans les collections. */
  featuredCategories: CategoryId[];
}

/** Annonce payée par une boutique pour un produit ou pour sa boutique. */
export interface Campaign {
  id: string;
  kind: 'product' | 'store';
  /** Adresse (slug) de la boutique. */
  storeId: string;
  productId?: string;
  headline: string;
  tagline?: string;
  cta: string;
  /** Annonce d'exemple (catalogue de démonstration) : jamais comptée, jamais en production. */
  demo?: boolean;
}

export interface CollectionCard {
  id: string;
  title: string;
  products: Product[];
  /** Destination de « tout voir ». */
  link: { category?: CategoryId; promo?: boolean };
  showDiscount: boolean;
}

export interface EditorialBanner {
  id: string;
  kicker: string;
  title: string;
  cta: string;
  photoId: string;
  link: { category?: CategoryId; view?: 'stores'; promo?: boolean };
}

export type FeedSection =
  | { type: 'grid'; id: string; title?: string; products: Product[] }
  | { type: 'collections'; id: string; title: string; cards: CollectionCard[] }
  | { type: 'sponsored'; id: string; campaign: Campaign; product?: Product; store: Store; flip: boolean }
  | { type: 'stores'; id: string; title: string; layout: 'carousel' | 'feature' | 'pair'; stores: Store[] }
  | { type: 'rail'; id: string; title: string; subtitle?: string; products: Product[]; link?: { category?: CategoryId; storeId?: string } }
  | { type: 'deals'; id: string; title: string; subtitle?: string; products: Product[] }
  | { type: 'banner'; id: string; banner: EditorialBanner }
  | { type: 'asymmetric'; id: string; products: Product[]; flip: boolean };
