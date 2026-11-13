/**
 * Couche d'accès au catalogue.
 * Les produits et boutiques viennent de Supabase (boutiques réelles) et de la boutique
 * créée sur l'appareil, complétés par le catalogue de démonstration tant que DEMO_DATA
 * est actif (voir plus bas). Sans lui, la démo ne sert qu'aux exemples de modèles de vitrine.
 */
import { remoteProducts, remoteStore, remoteStores } from '@/api/remoteCatalog';
import { getSellerPublicProducts, getSellerPublicStore, isSellerStoreVerified } from '@/api/sellerCatalog';
import { CATEGORIES, DEMO_CATALOG, STORES } from '@/data/demo';
import { DEMO_STOCK, STOREFRONT_EXTRA_PRODUCTS } from '@/data/storefronts';
import { supabaseEnabled } from '@/lib/supabase';
import { useSeller } from '@/store/useSeller';
import type { Category, Page, Product, ProductQuery, Store } from '@/types';
import { discountPercent, normalize } from '@/utils/format';

export const PAGE_SIZE = 10;

/**
 * Catalogue de démonstration (affiches, offres, boutiques et produits d'exemple) affiché
 * avec les vraies boutiques. Il garde l'accueil rempli tant que le vrai catalogue est petit.
 * Pour le retirer le jour du lancement : EXPO_PUBLIC_DEMO_CATALOG=0 dans .env.local.
 */
export const DEMO_DATA = !supabaseEnabled || process.env.EXPO_PUBLIC_DEMO_CATALOG !== '0';

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

/** Boutique d'exemple (aperçu « Voir » des modèles de vitrine). */
export const isDemoStore = (id?: string) => !!id && storeById.has(id);

/** Suffixe des séries répétées du catalogue de démo (« robe-wax-2 »). */
const SERIES_SUFFIX = /-[23]$/;

/** Identifiant du produit d'origine, sans le numéro de série. */
export function baseKey(id: string): string {
  return id.replace(SERIES_SUFFIX, '');
}
const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getStore(id: string): Store | undefined {
  return storeById.get(id) ?? getSellerPublicStore(id) ?? remoteStore(id);
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

const DEMO_PRODUCT_IDS = new Set([...DEMO_WITH_STOCK, ...STOREFRONT_EXTRA_PRODUCTS].map((p) => p.id));

/** Produit d'exemple (visible dans l'aperçu des modèles, jamais commandable avec le vrai catalogue). */
export const isDemoProduct = (id: string) => !DEMO_DATA && DEMO_PRODUCT_IDS.has(id);

function catalogFor(q: ProductQuery): Product[] {
  const sellerProducts = getSellerPublicProducts();
  // La boutique du vendeur connecté est lue sur l'appareil (source à jour) :
  // sa copie Supabase est écartée pour ne jamais afficher un produit deux fois.
  const ownSlug = useSeller.getState().store?.slug;
  const remote = ownSlug ? remoteProducts().filter((p) => p.storeId !== ownSlug) : remoteProducts();
  // Vitrine : les produits d'exemple n'existent que sur les boutiques d'exemple.
  if (q.storefront) return [...remote, ...sellerProducts, ...(DEMO_DATA || isDemoStore(q.storeId) ? STOREFRONT_CATALOG : [])];
  // Produits réels (Supabase) : dans les flux généraux seulement si la boutique est vérifiée.
  const remoteVisible = remote.filter((p) => p.salesEnabled);
  const ownVisible =
    sellerProducts.length > 0 && (isSellerStoreVerified() || (q.storeId != null && sellerProducts.some((p) => p.storeId === q.storeId)));
  return [...remoteVisible, ...(ownVisible ? sellerProducts : []), ...(DEMO_DATA ? DEMO_WITH_STOCK : [])];
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
    getSellerPublicProducts().find((p) => p.id === id) ??
    remoteProducts().find((p) => p.id === id)
  );
}

export function peekProducts(ids: string[]): Product[] {
  const set = new Set(ids);
  const demo = DEMO_DATA ? [...STOREFRONT_EXTRA_PRODUCTS, ...DEMO_WITH_STOCK] : [];
  return [...remoteProducts(), ...getSellerPublicProducts(), ...demo].filter((p) => set.has(p.id));
}

/** Produits visibles dans les flux généraux, triés (lecture synchrone : accueil, affiches, offres). */
export function feedProducts(q: ProductQuery = {}): Product[] {
  return sortProducts(
    catalogFor(q).filter((p) => !SERIES_SUFFIX.test(p.id) && matches(p, q)),
    q.sort,
  );
}

/** Lecture synchrone des produits d'une vitrine (sections Nouveautés, Promotions…). */
export function storefrontProducts(q: ProductQuery): Product[] {
  return sortProducts(
    catalogFor({ ...q, storefront: true }).filter((p) => matches(p, q)),
    q.sort,
  );
}

/**
 * Articles proches d'un produit : même catégorie, prix voisin (± 35 %), les plus proches d'abord.
 * `samePrice` dit si la liste ne contient que des prix voisins (sinon elle est complétée
 * par d'autres articles de la catégorie).
 */
export function similarProducts(product: Product, limit = 10): { items: Product[]; samePrice: boolean } {
  const pool = feedProducts({ categoryId: product.categoryId }).filter((p) => p.id !== product.id && baseKey(p.id) !== baseKey(product.id));
  const gap = (p: Product) => Math.abs(p.price - product.price);
  const near = pool.filter((p) => gap(p) <= product.price * 0.35).sort((a, b) => gap(a) - gap(b));
  if (near.length >= 3) return { items: near.slice(0, limit), samePrice: true };
  return { items: [...pool].sort((a, b) => gap(a) - gap(b)).slice(0, limit), samePrice: false };
}

/** Autres articles de la même boutique. */
export function moreFromStore(product: Product, limit = 10): Product[] {
  return storefrontProducts({ storeId: product.storeId })
    .filter((p) => p.id !== product.id && baseKey(p.id) !== baseKey(product.id))
    .slice(0, limit);
}

export function searchStores(query: string): Store[] {
  const needle = normalize(query);
  if (!needle) return [];
  const own = getSellerPublicStore(useSeller.getState().store?.slug ?? '');
  return [...(own ? [own] : []), ...remoteStores().filter((s) => s.id !== own?.id), ...(DEMO_DATA ? STORES : [])].filter((s) =>
    normalize(`${s.name} ${s.city} ${s.description}`).includes(needle),
  );
}

export function searchCategories(query: string): Category[] {
  const needle = normalize(query);
  if (!needle) return [];
  return CATEGORIES.filter((c) => normalize(c.name).includes(needle));
}

/** Nombre d'articles visibles dans les flux (boutiques vérifiées, sa propre boutique vérifiée). */
export function countProducts(q: ProductQuery): number {
  // Sans les séries répétées du catalogue de démonstration : chaque article compte une fois.
  return catalogFor(q).filter((p) => !SERIES_SUFFIX.test(p.id) && matches(p, q)).length;
}
