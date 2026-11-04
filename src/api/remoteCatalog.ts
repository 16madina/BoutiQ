/**
 * Catalogue réel lu dans Supabase : vitrines publiques, produits publiés, collections.
 * Il s'ajoute aux données de démo (src/data). Les écrans n'appellent pas Supabase
 * directement : ils passent par src/api/catalog.ts et src/api/storefront.ts.
 */
import { create } from 'zustand';

import { storeMediaUrl, supabase } from '@/lib/supabase';
import type { CategoryId, Product, Store } from '@/types';
import { normalizeTemplateId } from '@/storefront/templates';
import type { StorefrontSettings } from '@/types/storefront';

const CATEGORY_IDS: CategoryId[] = ['mode', 'electronique', 'maison', 'beaute', 'alimentation', 'sport'];
const asCategory = (c: string | null | undefined): CategoryId => (CATEGORY_IDS.includes(c as CategoryId) ? (c as CategoryId) : 'mode');

export interface RemoteCollection {
  id: string;
  storeId: string;
  name: string;
  coverUri?: string;
}

interface RemoteCatalogState {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'disabled';
  error?: string;
  stores: Store[];
  products: Product[];
  collections: RemoteCollection[];
  /** Réglages de vitrine, par identifiant de boutique (= adresse publique). */
  storefronts: Record<string, StorefrontSettings>;
  /** Photos du diaporama, par boutique (bannière puis photos supplémentaires). */
  heroImages: Record<string, string[]>;
  syncedAt?: string;
}

export const useRemoteCatalog = create<RemoteCatalogState>(() => ({
  status: 'idle',
  stores: [],
  products: [],
  collections: [],
  storefronts: {},
  heroImages: {},
}));

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase() || 'BQ';
}

/** Charge (ou recharge) le catalogue réel. Sans erreur bloquante : la démo reste affichée. */
export async function syncRemoteCatalog(): Promise<void> {
  if (!supabase) {
    useRemoteCatalog.setState({ status: 'disabled' });
    return;
  }
  useRemoteCatalog.setState({ status: 'loading', error: undefined });
  try {
    const [storesRes, productsRes, collectionsRes] = await Promise.all([
      supabase.from('storefront_public').select('*'),
      supabase
        .from('products')
        .select('*, product_images(path, width, height, position)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('store_collections').select('*').order('position'),
    ]);
    if (storesRes.error) throw storesRes.error;
    if (productsRes.error) throw productsRes.error;
    if (collectionsRes.error) throw collectionsRes.error;

    // Les écrans adressent les boutiques par leur adresse publique (slug).
    const slugById = new Map<string, string>();
    const salesById = new Map<string, boolean>();
    const stores: Store[] = [];
    const storefronts: Record<string, StorefrontSettings> = {};
    const heroImages: Record<string, string[]> = {};

    for (const s of storesRes.data) {
      if (!s.id || !s.slug || !s.name) continue;
      slugById.set(s.id, s.slug);
      salesById.set(s.id, !!s.sales_enabled);
      stores.push({
        id: s.slug,
        slug: s.slug,
        name: s.name,
        city: s.city ?? '',
        country: s.country ?? '',
        description: s.description || 'Nouvelle boutique sur BoutiQ.',
        logoInitials: initials(s.name),
        logoColor: s.accent_color ?? '#B87A3D',
        logoUri: storeMediaUrl(s.logo_path),
        bannerUri: storeMediaUrl(s.banner_path),
        rating: 0,
        reviewsCount: 0,
        followers: s.followers ?? 0,
        verified: !!s.verified,
        salesEnabled: !!s.sales_enabled,
        delivery: 'Livraison à convenir avec le vendeur',
        collections: [],
      });
      heroImages[s.slug] = [s.banner_path, ...(s.hero_paths ?? [])]
        .map((path) => storeMediaUrl(path))
        .filter((u): u is string => !!u);
      storefronts[s.slug] = {
        template: normalizeTemplateId(s.template),
        accentColor: s.accent_color ?? '#B87A3D',
        tagline: s.tagline ?? undefined,
        promoMessage: s.promo_message ?? undefined,
        featuredProductIds: [],
        contactPhone: s.contact_phone ?? undefined,
      };
    }

    const collections: RemoteCollection[] = collectionsRes.data
      .filter((c) => slugById.has(c.store_id))
      .map((c) => ({ id: c.id, storeId: slugById.get(c.store_id)!, name: c.name, coverUri: storeMediaUrl(c.cover_path) }));
    const collectionName = new Map(collections.map((c) => [c.id, c.name]));
    for (const store of stores) store.collections = collections.filter((c) => c.storeId === store.id).map((c) => c.name);

    const products: Product[] = [];
    productsRes.data.forEach((p, i) => {
      const slug = slugById.get(p.store_id);
      if (!slug) return;
      const images = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position);
      const cover = images[0];
      if (!cover) return;
      if (p.featured_position != null) storefronts[slug]?.featuredProductIds.push(p.id);
      products.push({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        oldPrice: p.old_price ?? undefined,
        categoryId: asCategory(p.category),
        storeId: slug,
        collection: p.collection_id ? collectionName.get(p.collection_id) : undefined,
        photoId: '',
        imageUri: storeMediaUrl(cover.path),
        aspect: Math.min(Math.max(cover.height / cover.width, 0.75), 1.45),
        rating: 0,
        reviewsCount: 0,
        createdRank: -2000 + i,
        salesEnabled: salesById.get(p.store_id) ?? false,
        stock: p.stock,
        sizes: p.sizes?.length ? p.sizes : undefined,
        colors: p.colors?.length ? p.colors : undefined,
        variants: Array.isArray(p.variants) && p.variants.length ? (p.variants as unknown as Product['variants']) : undefined,
        deliveryNote: p.delivery_note ?? undefined,
      });
    });

    useRemoteCatalog.setState({
      status: 'ready',
      stores,
      products,
      collections,
      storefronts,
      heroImages,
      syncedAt: new Date().toISOString(),
    });
  } catch (e) {
    useRemoteCatalog.setState({ status: 'error', error: (e as Error).message });
  }
}

/* Lectures synchrones utilisées par la couche catalogue */
export const remoteStore = (id: string) => useRemoteCatalog.getState().stores.find((s) => s.id === id);
export const remoteProducts = () => useRemoteCatalog.getState().products;
export const remoteStores = () => useRemoteCatalog.getState().stores;
export const remoteStorefront = (id: string) => useRemoteCatalog.getState().storefronts[id];
/** Diaporama d'une boutique Supabase ; undefined si la boutique n'en vient pas. */
export function remoteHeroImages(id: string) {
  const list = useRemoteCatalog.getState().heroImages[id];
  return list?.length ? list.map((uri) => ({ uri })) : undefined;
}
export const remoteCollections = (storeId: string) => useRemoteCatalog.getState().collections.filter((c) => c.storeId === storeId);
