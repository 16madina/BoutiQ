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
}

export interface StoreCollection {
  id: string;
  name: string;
}

export interface SellerStore {
  id: string;
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

export type ProductStatus = 'draft' | 'published';

export interface SellerProduct {
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
  createdAt: string;
}

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
