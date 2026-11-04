import type { CategoryId } from '@/types';
import type { StorefrontSettings, StorefrontTemplateId } from '@/types/storefront';

/**
 * Cycle de vérification :
 * draft → pending_review → verified (ventes + paiements activés)
 *                       ↘ rejected (le vendeur corrige puis renvoie)
 * Seul un administrateur fait passer une boutique en « verified »
 * (voir supabase/migrations : la colonne n'est pas modifiable par le vendeur).
 */
export type VerificationStatus = 'draft' | 'pending_review' | 'verified' | 'rejected';

export interface LocalImage {
  uri: string;
  width: number;
  height: number;
  /** Chemin dans le stockage Supabase (dossier store-media) une fois la photo envoyée. */
  remotePath?: string;
}

export interface StoreCollection {
  id: string;
  name: string;
  /** Identifiant de la collection dans Supabase. */
  remoteId?: string;
}

export interface SellerStore {
  id: string;
  /** Identifiant de la boutique dans Supabase (créée au premier enregistrement en ligne). */
  remoteId?: string;
  slug: string;
  name: string;
  description: string;
  city: string;
  country: string;
  categoryId: CategoryId;
  logo?: LocalImage;
  /** Photo principale (= première photo du diaporama). */
  banner?: LocalImage;
  /** Photos du diaporama de la bannière (5 au plus). Absent = la bannière seule. */
  banners?: LocalImage[];
  collections: StoreCollection[];
  /** Réglages de la vitrine (« Personnaliser ma boutique »). Absent = modèle proposé selon la catégorie. */
  storefront?: Partial<StorefrontSettings>;
  status: VerificationStatus;
  rejectionReason?: string;
  createdAt: string;
  submittedAt?: string;
}

export type SellerType = 'individual' | 'business';

/** Informations privées du vendeur (jamais affichées publiquement). */
export interface SellerDetails {
  fullName: string;
  phone: string;
  whatsapp: string;
  sellerType: SellerType;
  businessName?: string;
  idDocument?: LocalImage;
}

/** draft = brouillon jamais publié ; published = en vente ; hidden = retiré de la vente par le vendeur. */
export type ProductStatus = 'draft' | 'published' | 'hidden';

/** Variante vendue à part (taille, couleur, contenance…) avec son prix. */
export interface ProductVariant {
  id: string;
  label: string;
  price: number;
  stock: number;
}

/** État de l'enregistrement en ligne (Supabase). */
export interface ProductSync {
  state: 'pending' | 'synced' | 'error';
  /** Message simple à afficher au vendeur. */
  error?: string;
  syncedAt?: string;
}

export interface SellerProduct {
  /** Identifiant UUID, le même sur l'appareil et dans Supabase. */
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  categoryId: CategoryId;
  collectionId?: string;
  photos: LocalImage[];
  stock: number;
  status: ProductStatus;
  sizes?: string[];
  colors?: string[];
  variants?: ProductVariant[];
  /** Informations de livraison propres au produit. */
  deliveryNote?: string;
  sync?: ProductSync;
  createdAt: string;
}

/** Saisie en cours dans « Ajouter un produit » (brouillon gardé sur l'appareil). */
export type ProductForm = Omit<SellerProduct, 'storeId' | 'createdAt' | 'sync'>;

/** Brouillon du parcours de création, sauvegardé à chaque saisie. */
export interface StoreDraft {
  name: string;
  slug: string;
  slugEdited: boolean;
  categoryId?: CategoryId;
  city: string;
  country: string;
  description: string;
  details: SellerDetails;
  logo?: LocalImage;
  banner?: LocalImage;
  /** Facultatives : le vendeur peut les organiser plus tard. */
  collections: string[];
  /** Modèle choisi à l'étape 3 (absent = modèle recommandé pour la catégorie). */
  template?: StorefrontTemplateId;
}

export type Space = 'buyer' | 'seller';
