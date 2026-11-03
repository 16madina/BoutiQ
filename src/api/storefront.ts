/**
 * Données d'une vitrine publique : boutique + réglages + modèle + couleurs +
 * collections + sections (Coups de cœur, Nouveautés, Promotions).
 *
 * Aujourd'hui : données de démo et boutique créée sur l'appareil.
 * Demain : une requête Supabase (stores + storefront_settings + store_collections).
 */
import { getStore, peekProducts, storefrontProducts } from '@/api/catalog';
import { storeUrl } from '@/config/links';
import { DEMO_STOREFRONTS } from '@/data/storefronts';
import { buildPalette, TEMPLATES, templateForCategory } from '@/storefront/templates';
import { useSeller } from '@/store/useSeller';
import type { CategoryId, Product, Store } from '@/types';
import type {
  StorefrontCollection,
  StorefrontPalette,
  StorefrontSettings,
  StorefrontTemplate,
} from '@/types/storefront';
import { photoUrl, productImageUri } from '@/utils/images';

export interface Storefront {
  store: Store;
  settings: StorefrontSettings;
  template: StorefrontTemplate;
  palette: StorefrontPalette;
  collections: StorefrontCollection[];
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

export function getStorefront(storeId: string): Storefront | undefined {
  const store = getStore(storeId);
  if (!store) return undefined;

  const all = storefrontProducts({ storeId: store.id });
  const categories = [...new Set(all.map((p) => p.categoryId))];
  const seller = useSeller.getState();
  const own = seller.store && (seller.store.slug === store.id || seller.store.id === store.id) ? seller.store : null;

  let settings: StorefrontSettings;
  let collections: StorefrontCollection[];

  if (own) {
    const template = own.storefront?.template ?? templateForCategory(own.categoryId);
    settings = {
      template,
      accentColor: own.storefront?.accentColor ?? TEMPLATES[template].defaultAccent,
      tagline: own.storefront?.tagline,
      featuredProductIds: own.storefront?.featuredProductIds ?? [],
      contactPhone: seller.details?.whatsapp || seller.details?.phone || undefined,
    };
    collections = own.collections
      .map((c) => {
        const items = all.filter((p) => p.collection === c.name);
        return {
          id: c.id,
          name: c.name,
          coverUri: items[0] ? productImageUri(items[0], 360, 1.3) : undefined,
          count: items.length,
        };
      })
      .filter((c) => c.count > 0);
  } else {
    const demo = DEMO_STOREFRONTS[store.id];
    const template = demo?.template ?? templateForCategory(mainCategory(all));
    settings = {
      template,
      accentColor: demo?.accentColor ?? TEMPLATES[template].defaultAccent,
      tagline: demo?.tagline,
      featuredProductIds: demo?.featuredProductIds ?? [],
      contactPhone: demo?.contactPhone,
    };
    collections = (demo?.collections ?? [])
      .map((c) => ({
        id: c.name,
        name: c.name,
        coverUri: photoUrl(c.coverPhotoId, 360, 1.3),
        productKeys: c.productKeys,
        count: storefrontProducts({ storeId: store.id, productKeys: c.productKeys }).length,
      }))
      .filter((c) => c.count > 0);
  }

  const template = TEMPLATES[settings.template];
  return {
    store,
    settings,
    template,
    palette: buildPalette(settings.accentColor, template.defaultAccent),
    collections,
    categories,
    publicUrl: storeUrl(store.slug ?? store.id),
    isOwn: !!own,
  };
}

export interface StorefrontSections {
  featured: Product[];
  newArrivals: Product[];
  promotions: Product[];
  total: number;
}

/** Sections de la vitrine, calculées à partir du catalogue de la boutique. */
export function getStorefrontSections(sf: Storefront): StorefrontSections {
  const storeId = sf.store.id;
  const all = storefrontProducts({ storeId });
  const featured = peekProducts(sf.settings.featuredProductIds)
    .filter((p) => p.storeId === storeId)
    .sort((a, b) => sf.settings.featuredProductIds.indexOf(a.id) - sf.settings.featuredProductIds.indexOf(b.id));
  const featuredIds = new Set(featured.map((p) => p.id));
  return {
    featured,
    newArrivals: all.filter((p) => !featuredIds.has(p.id)).slice(0, 8),
    promotions: storefrontProducts({ storeId, onlyPromo: true, sort: 'discount' }).slice(0, 8),
    total: all.length,
  };
}
