/**
 * Données d'une vitrine publique : boutique + réglages + modèle + couleurs +
 * collections + produits, puis sections (vedettes, nouveautés, promotions).
 *
 * Sources : boutique créée sur l'appareil, catalogue Supabase, données de démo.
 * Les cinq modèles lisent exactement les mêmes données.
 */
import { getStore, storefrontProducts } from '@/api/catalog';
import { remoteCollections, remoteHeroImages, remoteStorefront } from '@/api/remoteCatalog';
import { displayUri, toPublicProduct, toPublicStore } from '@/api/sellerCatalog';
import { storeUrl } from '@/config/links';
import { DEMO_STOREFRONTS } from '@/data/storefronts';
import { buildPalette, normalizeTemplateId, TEMPLATES, templateForCategory } from '@/storefront/templates';
import { useSeller } from '@/store/useSeller';
import type { CategoryId, Product, Store } from '@/types';
import type { SellerDetails, SellerProduct, SellerStore } from '@/types/seller';
import type {
  HeroImage,
  StorefrontCollection,
  StorefrontPalette,
  StorefrontSettings,
  StorefrontTemplate,
} from '@/types/storefront';
import { discountPercent } from '@/utils/format';
import { photoUrl, productImageUri } from '@/utils/images';

export interface Storefront {
  store: Store;
  settings: StorefrontSettings;
  template: StorefrontTemplate;
  palette: StorefrontPalette;
  /** Photos du diaporama de la bannière (vide = dégradé aux couleurs de la boutique). */
  heroImages: HeroImage[];
  collections: StorefrontCollection[];
  /** Tous les produits publiés de la boutique, du plus récent au plus ancien. */
  products: Product[];
  /** Catégories réellement présentes dans la boutique (filtres). */
  categories: CategoryId[];
  /** Adresse publique partageable. */
  publicUrl: string;
  /** Vrai pour la boutique du vendeur connecté sur cet appareil. */
  isOwn: boolean;
}

/** Catégorie la plus représentée dans la boutique. */
function mainCategory(products: Product[]): CategoryId | undefined {
  const counts = new Map<CategoryId, number>();
  products.forEach((p) => counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function finish(
  store: Store,
  settings: StorefrontSettings,
  heroImages: HeroImage[],
  collections: StorefrontCollection[],
  products: Product[],
  isOwn: boolean,
): Storefront {
  const template = TEMPLATES[settings.template];
  return {
    store,
    settings,
    template,
    palette: buildPalette(settings.accentColor, template.defaultAccent),
    // Pas encore de photo du vendeur : belles photos du modèle, jamais une bannière vide.
    heroImages: heroImages.length ? heroImages : (template.defaultHeroPhotoIds ?? []).map((photoId) => ({ photoId })),
    collections,
    products,
    categories: [...new Set(products.map((p) => p.categoryId))],
    publicUrl: storeUrl(store.slug ?? store.id),
    isOwn,
  };
}

/** Réglages complets d'une boutique du vendeur (valeurs par défaut du modèle recommandé). */
export function resolveOwnSettings(store: SellerStore, details?: SellerDetails | null): StorefrontSettings {
  const template = normalizeTemplateId(store.storefront?.template ?? templateForCategory(store.categoryId));
  return {
    template,
    accentColor: store.storefront?.accentColor ?? TEMPLATES[template].defaultAccent,
    tagline: store.storefront?.tagline || undefined,
    promoMessage: store.storefront?.promoMessage || undefined,
    featuredProductIds: store.storefront?.featuredProductIds ?? [],
    contactPhone: details?.whatsapp || details?.phone || undefined,
  };
}

/**
 * Vitrine de la boutique du vendeur, à partir de données passées en paramètre :
 * l'écran « Personnaliser ma boutique » l'appelle avec ses modifications non
 * enregistrées pour afficher l'aperçu en direct.
 */
export function buildOwnStorefront(store: SellerStore, details: SellerDetails | null | undefined, sellerProducts: SellerProduct[]): Storefront {
  const products = sellerProducts
    .filter((p) => p.status === 'published' && p.photos.length > 0)
    .map((p, i) => toPublicProduct(p, store, i));
  const collections = store.collections
    .map((c) => {
      const items = products.filter((p) => p.collection === c.name);
      return {
        id: c.id,
        name: c.name,
        coverUri: items[0] ? productImageUri(items[0], 360, 1.3) : undefined,
        count: items.length,
      };
    })
    // Une collection vide n'est jamais montrée aux clients.
    .filter((c) => c.count > 0);
  const banners = store.banners?.length ? store.banners : store.banner ? [store.banner] : [];
  return finish(toPublicStore(store), resolveOwnSettings(store, details), banners.map((b) => ({ uri: displayUri(b) })), collections, products, true);
}

export function getStorefront(storeId: string): Storefront | undefined {
  const seller = useSeller.getState();
  const own = seller.store && (seller.store.slug === storeId || seller.store.id === storeId) ? seller.store : null;
  if (own) return buildOwnStorefront(own, seller.details, seller.products);

  const store = getStore(storeId);
  if (!store) return undefined;
  const products = storefrontProducts({ storeId: store.id });

  // Réglages : boutique de démo, sinon boutique réelle (Supabase), sinon modèle par défaut.
  const preset = DEMO_STOREFRONTS[store.id] ?? remoteStorefront(store.id);
  const template = normalizeTemplateId(preset?.template ?? templateForCategory(mainCategory(products)));
  const settings: StorefrontSettings = {
    template,
    accentColor: preset?.accentColor ?? TEMPLATES[template].defaultAccent,
    tagline: preset?.tagline,
    promoMessage: preset?.promoMessage,
    featuredProductIds: preset?.featuredProductIds ?? [],
    contactPhone: preset?.contactPhone,
  };

  const remote = remoteCollections(store.id)
    .map((c) => {
      const items = products.filter((p) => p.collection === c.name);
      return { id: c.id, name: c.name, coverUri: c.coverUri ?? (items[0] ? productImageUri(items[0], 360, 1.3) : undefined), count: items.length };
    })
    .filter((c) => c.count > 0);
  const collections = remote.length
    ? remote
    : (DEMO_STOREFRONTS[store.id]?.collections ?? [])
        .map((c) => ({
          id: c.name,
          name: c.name,
          coverUri: photoUrl(c.coverPhotoId, 360, 1.3),
          productKeys: c.productKeys,
          count: storefrontProducts({ storeId: store.id, productKeys: c.productKeys }).length,
        }))
        .filter((c) => c.count > 0);

  const fallback: HeroImage[] = store.bannerUri ? [{ uri: store.bannerUri }] : store.bannerPhotoId ? [{ photoId: store.bannerPhotoId }] : [];
  const heroImages: HeroImage[] =
    DEMO_STOREFRONTS[store.id]?.heroPhotoIds?.map((photoId) => ({ photoId })) ?? remoteHeroImages(store.id) ?? fallback;

  return finish(store, settings, heroImages, collections, products, false);
}

export interface StorefrontSections {
  featured: Product[];
  newArrivals: Product[];
  /** Uniquement de vraies promotions (ancien prix renseigné par le vendeur). */
  promotions: Product[];
  total: number;
}

/** Sections de la vitrine, calculées à partir des produits de la boutique. */
export function getStorefrontSections(sf: Storefront): StorefrontSections {
  const byId = new Map(sf.products.map((p) => [p.id, p]));
  const featured = sf.settings.featuredProductIds.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  const featuredIds = new Set(featured.map((p) => p.id));
  return {
    featured,
    newArrivals: sf.products.filter((p) => !featuredIds.has(p.id)).slice(0, 8),
    promotions: sf.products
      .filter((p) => discountPercent(p.price, p.oldPrice))
      .sort((a, b) => (discountPercent(b.price, b.oldPrice) ?? 0) - (discountPercent(a.price, a.oldPrice) ?? 0))
      .slice(0, 8),
    total: sf.products.length,
  };
}
