export type CategoryId = 'mode' | 'electronique' | 'maison' | 'beaute' | 'alimentation' | 'sport';

export interface Category {
  id: CategoryId;
  name: string;
  /** Emoji illustratif (rendu « 3D » comme la maquette) ou icône fine */
  emoji?: string;
  icon?: 'smartphone' | 'sofa';
  coverPhotoId: string;
}

export interface Store {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string;
  logoInitials: string;
  logoColor: string;
  /** Photo Unsplash (boutiques de démo) */
  bannerPhotoId?: string;
  /** Images locales choisies par le vendeur */
  logoUri?: string;
  bannerUri?: string;
  /** Adresse publique unique */
  slug?: string;
  /** Ventes et paiements activés (boutique vérifiée) */
  salesEnabled?: boolean;
  rating: number;
  reviewsCount: number;
  followers: number;
  verified: boolean;
  delivery: string;
  collections: string[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  categoryId: CategoryId;
  storeId: string;
  /** Identifiant de la photo Unsplash (démo) */
  photoId: string;
  /** Photo locale publiée par un vendeur (prioritaire sur photoId) */
  imageUri?: string;
  /** false tant que la boutique n'est pas vérifiée */
  salesEnabled?: boolean;
  /** Collection de la boutique (produits vendeurs) */
  collection?: string;
  /** Ratio hauteur / largeur de l'image dans la grille masonry */
  aspect: number;
  rating: number;
  reviewsCount: number;
  sizes?: string[];
  createdRank: number;
  /** Quantité disponible (absent = en stock). 0 = épuisé. */
  stock?: number;
}

export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'discount';

export interface ProductQuery {
  query?: string;
  categoryId?: CategoryId;
  storeId?: string;
  collection?: string;
  onlyPromo?: boolean;
  priceMin?: number;
  priceMax?: number;
  sort?: SortOption;
  /** Masque les produits épuisés. */
  inStockOnly?: boolean;
  /** Limite aux produits listés (collections des vitrines de démo). */
  productKeys?: string[];
  /**
   * Vitrine d'une boutique : chaque produit une seule fois (sans les séries
   * répétées du catalogue de démo) + produits réservés à la vitrine.
   */
  storefront?: boolean;
}

export interface Page<T> {
  items: T[];
  page: number;
  hasMore: boolean;
  total: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  photoId: string;
  /** Position horizontale du sujet dans la photo (0 = gauche, 1 = droite) */
  focusX: number;
  link: { pathname: '/search'; params: Record<string, string> };
}
