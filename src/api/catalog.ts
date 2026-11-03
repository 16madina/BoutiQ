/**
 * Couche d'accès au catalogue.
 * Aujourd'hui : simulation d'un serveur (latence + pagination) sur les données de démo.
 * Demain : remplacer le corps de ces fonctions par des appels HTTP — les écrans ne changent pas.
 */
import { getSellerPublicProducts, getSellerPublicStore, isSellerStoreVerified } from '@/api/sellerCatalog';
import { CATEGORIES, DEMO_CATALOG, STORES } from '@/data/demo';
import { DEMO_STOCK, STOREFRONT_EXTRA_PRODUCTS } from '@/data/storefronts';
import { useSeller } from '@/store/useSeller';
import type { Category, Page, Product, ProductQuery, Store } from '@/types';
import { discountPercent, normalize } from '@/utils/format';

export const PAGE_SIZE = 10;

/** Passer à `true` pour tester l'affichage des erreurs réseau. */
const SIMULATE_FLAKY_NETWORK = false;

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      const err = new Error('Aborted');
      err.name = 'AbortError';
      reject(err);
    });
  });
}

const storeById = new Map(STORES.map((s) => [s.id, s]));

/** Suffixe des séries répétées du catalogue de démo (« robe-wax-2 »). */
const SERIES_SUFFIX = /-[23]$/;

/** Identifiant du produit d'origine, sans le numéro de série. */
export function baseKey(id: string): string {
  return id.replace(SERIES_SUFFIX, '');
}
const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getStore(id: string): Store | undefined {
  return storeById.get(id) ?? getSellerPublicStore(id);
}

/**
 * Catalogue complet : démo + produits publiés de la boutique créée sur l'appareil.
 * Ces derniers n'apparaissent dans les flux généraux qu'une fois la boutique vérifiée ;
 * ils sont toujours visibles sur la vitrine de la boutique.
 */
/** Produits de démo avec leur stock (les séries répétées gardent le stock du modèle). */
const DEMO_WITH_STOCK: Product[] = DEMO_CATALOG.map((p) => {
  const stock = DEMO_STOCK[baseKey(p.id)];
  return stock == null ? p : { ...p, stock };
});

/** Vitrine : chaque produit de démo une seule fois + produits réservés à la vitrine. */
const STOREFRONT_CATALOG: Product[] = [...STOREFRONT_EXTRA_PRODUCTS, ...DEMO_WITH_STOCK.filter((p) => !SERIES_SUFFIX.test(p.id))];

function catalogFor(q: ProductQuery): Product[] {
  const sellerProducts = getSellerPublicProducts();
  if (q.storefront) return [...sellerProducts, ...STOREFRONT_CATALOG];
  if (sellerProducts.length === 0) return DEMO_WITH_STOCK;
  const visible = isSellerStoreVerified() || (q.storeId != null && sellerProducts.some((p) => p.storeId === q.storeId));
  return visible ? [...sellerProducts, ...DEMO_WITH_STOCK] : DEMO_WITH_STOCK;
}

export function getCategory(id: string): Category | undefined {
  return categoryById.get(id as Category['id']);
}

function matches(p: Product, q: ProductQuery): boolean {
  if (q.categoryId && p.categoryId !== q.categoryId) return false;
  if (q.storeId && p.storeId !== q.storeId) return false;
  if (q.collection && p.collection !== q.collection) return false;
  if (q.onlyPromo && !discountPercent(p.price, p.oldPrice)) return false;
  if (q.priceMin != null && p.price < q.priceMin) return false;
  if (q.priceMax != null && p.price > q.priceMax) return false;
  if (q.inStockOnly && (p.stock ?? 1) <= 0) return false;
  if (q.productKeys && !q.productKeys.includes(baseKey(p.id))) return false;
  if (q.query) {
    const needle = normalize(q.query);
    const store = getStore(p.storeId);
    const cat = categoryById.get(p.categoryId);
    const haystack = normalize(`${p.name} ${p.description} ${store?.name ?? ''} ${cat?.name ?? ''}`);
    if (!needle.split(/\s+/).every((word) => haystack.includes(word))) return false;
  }
  return true;
}

function sortProducts(items: Product[], sort: ProductQuery['sort']): Product[] {
  const copy = [...items];
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return copy.sort((a, b) => b.price - a.price);
    case 'discount':
      return copy.sort(
        (a, b) => (discountPercent(b.price, b.oldPrice) ?? 0) - (discountPercent(a.price, a.oldPrice) ?? 0),
      );
    default:
      return copy.sort((a, b) => a.createdRank - b.createdRank);
  }
}

/** Liste paginée — seule la page demandée est renvoyée à l'interface. */
export async function fetchProducts(
  query: ProductQuery,
  page: number,
  signal?: AbortSignal,
): Promise<Page<Product>> {
  await delay(350 + Math.random() * 450, signal);
  if (SIMULATE_FLAKY_NETWORK && Math.random() < 0.3) {
    throw new Error('Connexion instable. Vérifiez votre réseau.');
  }
  const filtered = sortProducts(catalogFor(query).filter((p) => matches(p, query)), query.sort);
  const start = page * PAGE_SIZE;
  const items = filtered.slice(start, start + PAGE_SIZE);
  return { items, page, hasMore: start + PAGE_SIZE < filtered.length, total: filtered.length };
}

export async function fetchProduct(id: string): Promise<Product | undefined> {
  await delay(120);
  return peekProduct(id);
}

/** Lecture synchrone pour l'affichage instantané d'une fiche déjà vue dans la grille. */
export function peekProduct(id: string): Product | undefined {
  return (
    DEMO_WITH_STOCK.find((p) => p.id === id) ??
    STOREFRONT_EXTRA_PRODUCTS.find((p) => p.id === id) ??
    getSellerPublicProducts().find((p) => p.id === id)
  );
}

export function peekProducts(ids: string[]): Product[] {
  const set = new Set(ids);
  return [...getSellerPublicProducts(), ...STOREFRONT_EXTRA_PRODUCTS, ...DEMO_WITH_STOCK].filter((p) => set.has(p.id));
}

/** Lecture synchrone des produits d'une vitrine (sections Nouveautés, Promotions…). */
export function storefrontProducts(q: ProductQuery): Product[] {
  return sortProducts(
    catalogFor({ ...q, storefront: true }).filter((p) => matches(p, q)),
    q.sort,
  );
}

export function searchStores(query: string): Store[] {
  const needle = normalize(query);
  if (!needle) return [];
  const own = getSellerPublicStore(useSeller.getState().store?.slug ?? '');
  return [...(own ? [own] : []), ...STORES].filter((s) =>
    normalize(`${s.name} ${s.city} ${s.description}`).includes(needle),
  );
}

export function searchCategories(query: string): Category[] {
  const needle = normalize(query);
  if (!needle) return [];
  return CATEGORIES.filter((c) => normalize(c.name).includes(needle));
}

export function countProducts(q: ProductQuery): number {
  return DEMO_CATALOG.filter((p) => matches(p, q)).length;
}
