/**
 * Enregistrement en ligne de la boutique et des produits du vendeur (Supabase).
 *
 * - Le vendeur est connecté automatiquement (connexion anonyme Supabase) ; son numéro
 *   pourra y être rattaché plus tard sans perdre sa boutique.
 * - Les règles RLS garantissent qu'un vendeur n'écrit que dans SA boutique.
 * - Le produit garde le même identifiant sur l'appareil et en ligne : republier
 *   (double appui, réseau coupé) met à jour la même ligne, sans doublon.
 * - Sans réseau, rien n'est perdu : le produit reste sur l'appareil, marqué « à envoyer ».
 */
import { randomUUID } from 'expo-crypto';

import { syncRemoteCatalog } from '@/api/remoteCatalog';
import { resolveOwnSettings } from '@/api/storefront';
import { removeImages, uploadImage } from '@/lib/media';
import { storeMediaUrl, supabase } from '@/lib/supabase';
import { normalizeTemplateId } from '@/storefront/templates';
import { useSeller } from '@/store/useSeller';
import type { CategoryId } from '@/types';
import type { Json } from '@/types/database';
import type { LocalImage, ProductStatus, ProductVariant, SellerProduct, SellerStore } from '@/types/seller';

/* ------------------------------------------------------------------ Erreurs */

export class SyncError extends Error {
  constructor(
    message: string,
    readonly kind: 'offline' | 'not_configured' | 'auth' | 'conflict' | 'invalid' | 'forbidden' | 'unknown',
  ) {
    super(message);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isNetworkError(e: unknown) {
  const msg = String((e as Error)?.message ?? e).toLowerCase();
  return msg.includes('failed to fetch') || msg.includes('network') || msg.includes('fetch failed') || msg.includes('timeout') || msg.includes('load failed');
}

/** Message simple, sans jargon, pour le vendeur. */
export function toSyncError(e: unknown): SyncError {
  if (e instanceof SyncError) return e;
  const err = e as { message?: string; code?: string };
  const msg = err?.message ?? '';
  if (isNetworkError(e)) {
    return new SyncError('Pas de connexion internet. Votre produit est gardé sur votre téléphone : réessayez dès que le réseau revient.', 'offline');
  }
  if (/anonymous sign-ins are disabled|signups not allowed/i.test(msg)) {
    return new SyncError('La connexion en ligne de BoutiQ n’est pas encore activée. Votre produit est gardé sur votre téléphone.', 'auth');
  }
  if (err?.code === '23505' && /slug/i.test(msg)) {
    return new SyncError('L’adresse de votre boutique est déjà utilisée. Changez-la dans « Ma boutique », puis réessayez.', 'conflict');
  }
  if (err?.code === '23514' || err?.code === '22P02') {
    return new SyncError('Une information n’est pas valide (nom, prix ou ancien prix). Vérifiez puis réessayez.', 'invalid');
  }
  if (err?.code === '42501' || /row-level security|permission/i.test(msg)) {
    return new SyncError('Vous ne pouvez modifier que les produits de votre boutique.', 'forbidden');
  }
  return new SyncError('Une erreur est survenue. Réessayez dans un instant.', 'unknown');
}

/** Réessaie automatiquement en cas de coupure réseau (2 nouvelles tentatives). */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isNetworkError(e)) throw e;
      await new Promise((r) => setTimeout(r, 600 * (i + 1) ** 2));
    }
  }
  throw last;
}

/** Les réponses Supabase { data, error } deviennent des exceptions. */
function ok<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

function client() {
  if (!supabase) throw new SyncError('L’enregistrement en ligne n’est pas configuré sur cette version de l’app.', 'not_configured');
  return supabase;
}

/* --------------------------------------------------------------- Connexion */

/** Session du vendeur (connexion anonyme si besoin). */
export async function ensureSession() {
  const sb = client();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user;
  const { data: signIn, error } = await sb.auth.signInAnonymously();
  if (error || !signIn.user) throw error ?? new Error('Connexion impossible');
  return signIn.user;
}

/* ---------------------------------------------------------------- Boutique */

const seller = () => useSeller.getState();

/** Crée la boutique dans Supabase au premier enregistrement (une seule fois). */
export async function ensureRemoteStore(): Promise<string> {
  const { store } = seller();
  if (!store) throw new SyncError('Créez d’abord votre boutique.', 'invalid');
  if (store.remoteId) return store.remoteId;

  const sb = client();
  const user = await ensureSession();
  const existing = ok(await sb.from('stores').select('id').eq('owner_id', user.id).maybeSingle());
  let storeId = existing?.id;
  if (!storeId) {
    const created = ok(
      await sb
        .from('stores')
        .insert({
          slug: store.slug,
          name: store.name.trim(),
          description: store.description.slice(0, 280),
          city: store.city,
          country: store.country,
          category: store.categoryId,
        })
        .select('id')
        .single(),
    );
    storeId = created!.id;
  }
  seller().updateStore({ remoteId: storeId });
  // Réglages de vitrine, collections, logo, bannière : en complément, sans bloquer la publication.
  await syncStoreExtras(storeId).catch(() => {});
  return storeId;
}

async function uploadIfLocal(img: LocalImage | undefined, folder: string, maxSide: number) {
  if (!img || img.remotePath) return img;
  try {
    return await uploadImage(img, folder, maxSide);
  } catch {
    return img; // photo plus disponible sur l'appareil (ex. navigateur rechargé)
  }
}

/** Collections, réglages de vitrine, logo et bannières de la boutique. */
export async function syncStoreExtras(storeId: string) {
  const sb = client();
  const { store, details } = seller();
  if (!store) return;

  // Collections : identifiant en ligne pour chaque collection locale.
  const collections = await syncCollections(storeId, store);

  // Logo, bannière et diaporama.
  const logo = await uploadIfLocal(store.logo, storeId, 600);
  const slides = await Promise.all((store.banners?.length ? store.banners : store.banner ? [store.banner] : []).map((b) => uploadIfLocal(b, storeId, 1800)));
  const banner = slides[0];
  seller().updateStore({ collections, logo, banner, banners: store.banners?.length ? (slides as LocalImage[]) : store.banners });
  const patch: { logo_path?: string; banner_path?: string } = {};
  if (logo?.remotePath) patch.logo_path = logo.remotePath;
  if (banner?.remotePath) patch.banner_path = banner.remotePath;
  if (Object.keys(patch).length) ok(await sb.from('stores').update(patch).eq('id', storeId));

  // Mêmes réglages que la vitrine affichée sur l'appareil (modèle conseillé si rien n'est choisi).
  const sf = resolveOwnSettings(store, details);
  ok(
    await sb.from('storefront_settings').upsert({
      store_id: storeId,
      template: sf.template,
      accent_color: sf.accentColor,
      tagline: sf.tagline?.slice(0, 60) || null,
      promo_message: sf.promoMessage?.slice(0, 80) || null,
      hero_paths: slides.slice(1).map((s) => s?.remotePath).filter((p): p is string => !!p),
    }),
  );

  // Informations privées du vendeur (jamais affichées) : utiles à la vérification.
  if (details && details.fullName.trim().length >= 3 && details.phone) {
    await sb.from('seller_details').upsert({
      store_id: storeId,
      full_name: details.fullName.trim(),
      phone: details.phone,
      whatsapp: details.whatsapp || null,
      seller_type: details.sellerType,
      business_name: details.businessName || null,
    });
  }
}

async function syncCollections(storeId: string, store: SellerStore) {
  const sb = client();
  const result = [];
  for (const [position, c] of store.collections.entries()) {
    if (c.remoteId) {
      result.push(c);
      continue;
    }
    const row = ok(
      await sb.from('store_collections').upsert({ store_id: storeId, name: c.name.slice(0, 24), position }, { onConflict: 'store_id,name' }).select('id').single(),
    );
    result.push({ ...c, remoteId: row!.id });
  }
  return result;
}

/* ---------------------------------------------------------------- Produits */

function productRow(p: SellerProduct, storeId: string, collectionRemoteId: string | undefined) {
  const variants = (p.variants ?? []).filter((v) => v.label.trim());
  return {
    id: p.id,
    store_id: storeId,
    name: p.name.trim(),
    description: p.description.trim().slice(0, 600),
    price: p.price,
    old_price: p.oldPrice && p.oldPrice > p.price ? p.oldPrice : null,
    category: p.categoryId,
    stock: variants.length ? variants.reduce((n, v) => n + v.stock, 0) : p.stock,
    status: p.status,
    collection_id: collectionRemoteId ?? null,
    sizes: p.sizes ?? [],
    colors: p.colors ?? [],
    variants: variants as unknown as Json,
    delivery_note: p.deliveryNote?.trim().slice(0, 160) || null,
  };
}

/**
 * Envoie un produit (création ou modification) : photos compressées puis fiche.
 * Renvoie l'identifiant (il peut changer une seule fois pour les anciens produits locaux).
 */
export async function syncProduct(productId: string): Promise<string> {
  const s = seller();
  let product = s.products.find((p) => p.id === productId);
  if (!product) throw new SyncError('Produit introuvable.', 'invalid');

  // Anciens produits créés avant l'enregistrement en ligne : identifiant UUID.
  if (!UUID.test(product.id)) {
    const newId = randomUUID();
    s.renameProduct(product.id, newId);
    product = { ...product, id: newId };
  }
  const id = product.id;
  s.patchProduct(id, { sync: { state: 'pending' } });

  try {
    const sb = client();
    const storeId = await withRetry(() => ensureRemoteStore());

    // 1. Photos : seules les nouvelles sont envoyées (compressées).
    const photos: LocalImage[] = [];
    for (const ph of product.photos) {
      photos.push(ph.remotePath ? ph : await withRetry(() => uploadImage(ph, `${storeId}/products/${id}`)));
      // Mémorisé tout de suite : une nouvelle tentative ne renverra pas les mêmes photos.
      seller().patchProduct(id, { photos: [...photos, ...product.photos.slice(photos.length)] });
    }

    // 2. Fiche produit (upsert sur l'identifiant : pas de doublon).
    const store = seller().store;
    const collection = store?.collections.find((c) => c.id === product.collectionId);
    await withRetry(async () => ok(await sb.from('products').upsert(productRow({ ...product, photos }, storeId, collection?.remoteId), { onConflict: 'id' })));

    // 3. Photos du produit, dans l'ordre choisi.
    const before = (ok(await sb.from('product_images').select('path').eq('product_id', id)) ?? []).map((r) => r.path);
    await withRetry(async () => ok(await sb.from('product_images').delete().eq('product_id', id)));
    if (photos.length) {
      await withRetry(async () =>
        ok(
          await sb.from('product_images').insert(
            photos.slice(0, 6).map((ph, position) => ({ product_id: id, path: ph.remotePath!, width: ph.width, height: ph.height, position })),
          ),
        ),
      );
    }
    const kept = new Set(photos.map((ph) => ph.remotePath));
    await removeImages(before.filter((path) => !kept.has(path))).catch(() => {});

    seller().patchProduct(id, { photos, sync: { state: 'synced', syncedAt: new Date().toISOString() } });
    syncRemoteCatalog();
    return id;
  } catch (e) {
    const err = toSyncError(e);
    seller().patchProduct(id, { sync: { state: 'error', error: err.message } });
    throw err;
  }
}

/** Masquer / remettre en vente / repasser en brouillon. */
export async function setProductStatus(productId: string, status: ProductStatus) {
  seller().patchProduct(productId, { status });
  return syncProduct(productId);
}

/** Supprime le produit de l'appareil et de Supabase (fiche + photos). */
export async function deleteProductEverywhere(productId: string) {
  const product = seller().products.find((p) => p.id === productId);
  if (!product) return;
  const wasOnline = !!product.sync?.syncedAt || product.photos.some((p) => p.remotePath);
  if (wasOnline && supabase && UUID.test(productId)) {
    try {
      const sb = client();
      await ensureSession();
      ok(await sb.from('products').delete().eq('id', productId));
      await removeImages(product.photos.map((p) => p.remotePath).filter((p): p is string => !!p)).catch(() => {});
    } catch (e) {
      throw toSyncError(e);
    }
  }
  seller().deleteProduct(productId);
  syncRemoteCatalog();
}

/* -------------------------------------------- Relecture depuis Supabase */

type ServerProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  old_price: number | null;
  category: string;
  stock: number;
  status: ProductStatus;
  collection_id: string | null;
  sizes: string[];
  colors: string[];
  variants: Json;
  delivery_note: string | null;
  created_at: string;
  product_images: { path: string; width: number; height: number; position: number }[];
};

/**
 * Relit la boutique et TOUS les produits du vendeur (brouillons et masqués compris)
 * depuis Supabase. Sans session existante, ne fait rien (pas de connexion forcée).
 */
export async function pullSellerData(): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return 0;
  const sb = supabase;

  const remoteStore = ok(await sb.from('stores').select('*').eq('owner_id', user.id).maybeSingle());
  if (!remoteStore) return 0;
  const [collectionsRes, settingsRes, productsRes] = await Promise.all([
    sb.from('store_collections').select('id, name, position').eq('store_id', remoteStore.id).order('position'),
    sb.from('storefront_settings').select('*').eq('store_id', remoteStore.id).maybeSingle(),
    sb
      .from('products')
      .select('*, product_images(path, width, height, position)')
      .eq('store_id', remoteStore.id)
      .order('created_at', { ascending: false }),
  ]);
  const remoteCollections = ok(collectionsRes) ?? [];
  const settings = ok(settingsRes);
  const rows = ok(productsRes) as unknown as ServerProduct[];

  const local = seller().store;
  const collections =
    local?.collections.length || !remoteCollections.length
      ? (local?.collections ?? []).map((c) => ({ ...c, remoteId: c.remoteId ?? remoteCollections.find((r) => r.name === c.name)?.id }))
      : remoteCollections.map((r) => ({ id: r.id, name: r.name, remoteId: r.id }));
  const toImage = (path: string | null, width = 1200, height = 1200): LocalImage | undefined =>
    path ? { uri: storeMediaUrl(path) ?? '', width, height, remotePath: path } : undefined;

  const store: SellerStore = local
    ? { ...local, remoteId: remoteStore.id, collections }
    : {
        id: remoteStore.id,
        remoteId: remoteStore.id,
        slug: remoteStore.slug,
        name: remoteStore.name,
        description: remoteStore.description,
        city: remoteStore.city,
        country: remoteStore.country,
        categoryId: remoteStore.category as CategoryId,
        logo: toImage(remoteStore.logo_path, 600, 600),
        banner: toImage(remoteStore.banner_path, 1800, 900),
        collections,
        storefront: settings
          ? {
              template: normalizeTemplateId(settings.template),
              accentColor: settings.accent_color,
              tagline: settings.tagline ?? undefined,
              promoMessage: settings.promo_message ?? undefined,
            }
          : undefined,
        status: remoteStore.status === 'suspended' ? 'rejected' : remoteStore.status,
        rejectionReason: remoteStore.rejection_reason ?? undefined,
        createdAt: remoteStore.created_at,
      };
  if (local) seller().updateStore({ remoteId: remoteStore.id, collections });

  const products: SellerProduct[] = rows.map((r) => ({
    id: r.id,
    storeId: store.id,
    name: r.name,
    description: r.description,
    price: r.price,
    oldPrice: r.old_price ?? undefined,
    categoryId: r.category as CategoryId,
    collectionId: collections.find((c) => c.remoteId === r.collection_id)?.id,
    photos: [...r.product_images].sort((a, b) => a.position - b.position).map((img) => toImage(img.path, img.width, img.height)!),
    stock: r.stock,
    status: r.status,
    sizes: r.sizes,
    colors: r.colors,
    variants: (Array.isArray(r.variants) ? r.variants : []) as unknown as ProductVariant[],
    deliveryNote: r.delivery_note ?? undefined,
    sync: { state: 'synced', syncedAt: new Date().toISOString() },
    createdAt: r.created_at,
  }));
  seller().hydrateFromServer(local ? null : store, products);
  return products.length;
}
