/**
 * Favoris et boutiques suivies : gardés sur l'appareil ET dans le compte Supabase.
 * - Favoris : table `favorites` (clé produit, démo comprise).
 * - Abonnements : table `store_follows`, uniquement pour les vraies boutiques (Supabase) ;
 *   les boutiques de démonstration restent suivies sur l'appareil.
 * Les erreurs réseau sont silencieuses : l'état local reste la référence et sera renvoyé.
 */
import { getStore } from '@/api/catalog';
import { remoteStores, syncRemoteCatalog } from '@/api/remoteCatalog';
import { currentUser, ensureSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { useShop } from '@/store/useShop';

let started = false;

async function syncFavorite(key: string, on: boolean) {
  if (!supabase) return;
  const user = await ensureSession();
  if (on) await supabase.from('favorites').upsert({ user_id: user.id, product_key: key.slice(0, 80) });
  else await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_key', key);
}

async function syncFollow(storeKey: string, on: boolean) {
  if (!supabase) return;
  const remoteId = getStore(storeKey)?.remoteId;
  if (!remoteId) return; // boutique de démonstration
  const user = await ensureSession();
  if (on) await supabase.from('store_follows').upsert({ user_id: user.id, store_id: remoteId });
  else await supabase.from('store_follows').delete().eq('user_id', user.id).eq('store_id', remoteId);
  syncRemoteCatalog(); // nombre d'abonnés à jour
}

/** Écoute les changements locaux et les envoie au compte. */
export function startShopSync() {
  if (started || !supabase) return;
  started = true;
  useShop.subscribe((s, prev) => {
    if (s.favorites !== prev.favorites) {
      for (const k of Object.keys(s.favorites)) if (!prev.favorites[k]) syncFavorite(k, true).catch(() => {});
      for (const k of Object.keys(prev.favorites)) if (!s.favorites[k]) syncFavorite(k, false).catch(() => {});
    }
    if (s.followedStores !== prev.followedStores) {
      for (const k of Object.keys(s.followedStores)) if (!prev.followedStores[k]) syncFollow(k, true).catch(() => {});
      for (const k of Object.keys(prev.followedStores)) if (!s.followedStores[k]) syncFollow(k, false).catch(() => {});
    }
  });
}

/** Relit favoris et abonnements du compte (sans créer de compte s'il n'y en a pas). */
export async function pullShopData() {
  if (!supabase) return;
  const user = await currentUser();
  if (!user) return;
  const [fav, follows] = await Promise.all([
    supabase.from('favorites').select('product_key').eq('user_id', user.id),
    supabase.from('store_follows').select('store_id').eq('user_id', user.id),
  ]);
  const slugs = (follows.data ?? [])
    .map((f) => remoteStores().find((s) => s.remoteId === f.store_id)?.id)
    .filter((s): s is string => !!s);
  useShop.getState().mergeRemote({ favorites: (fav.data ?? []).map((f) => f.product_key), followedStores: slugs });
}
