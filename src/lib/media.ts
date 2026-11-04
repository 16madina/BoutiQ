import { randomUUID } from 'expo-crypto';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';
import type { LocalImage } from '@/types/seller';

/**
 * Photos des vendeurs : compression avant envoi, puis dépôt dans le dossier
 * « store-media/<id de la boutique>/… » (seul le propriétaire peut y écrire, cf. RLS storage).
 */

/** Réduit la photo (côté le plus long ≤ maxSide) et la convertit en JPEG léger. */
export async function compressImage(img: LocalImage, maxSide = 1600): Promise<LocalImage> {
  const longest = Math.max(img.width, img.height);
  const scale = longest > maxSide ? maxSide / longest : 1;
  const actions =
    scale < 1 ? [{ resize: img.width >= img.height ? { width: Math.round(img.width * scale) } : { height: Math.round(img.height * scale) } }] : [];
  const out = await manipulateAsync(img.uri, actions, { compress: 0.72, format: SaveFormat.JPEG });
  return { uri: out.uri, width: out.width, height: out.height };
}

/** Envoie une photo compressée ; renvoie son chemin dans le stockage. */
export async function uploadImage(img: LocalImage, folder: string, maxSide = 1600): Promise<LocalImage> {
  if (!supabase) throw new Error('Supabase non configuré');
  const small = await compressImage(img, maxSide);
  const body = await (await fetch(small.uri)).arrayBuffer();
  const path = `${folder}/${randomUUID()}.jpg`;
  const { error } = await supabase.storage.from('store-media').upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  // L'image locale reste affichée sur l'appareil ; les autres la liront via son chemin.
  return { uri: img.uri, width: small.width, height: small.height, remotePath: path };
}

/** Supprime des photos devenues inutiles (erreurs ignorées : ménage best effort). */
export async function removeImages(paths: string[]) {
  if (!supabase || paths.length === 0) return;
  await supabase.storage.from('store-media').remove(paths);
}
