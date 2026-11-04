/**
 * « Remplir avec l'IA » — PRÉPARÉ, DÉSACTIVÉ par défaut.
 *
 * Aucun service payant n'est appelé tant que EXPO_PUBLIC_PRODUCT_ASSISTANT_URL n'est pas
 * renseigné (fichier .env.local). Cette adresse doit pointer vers un service BoutiQ
 * (ex. Edge Function Supabase) qui garde la clé du fournisseur d'IA côté serveur :
 * jamais de clé d'IA dans l'application.
 *
 * Contrat : POST { image: <photo JPEG en base64> } → { name?, categoryId?, description? }.
 * Le prix, la marque, la composition et les caractéristiques techniques ne sont
 * JAMAIS proposés : ils sont ignorés même si le service les renvoie.
 */
import { compressImage } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import type { CategoryId } from '@/types';
import type { LocalImage } from '@/types/seller';

const ENDPOINT = process.env.EXPO_PUBLIC_PRODUCT_ASSISTANT_URL;

export const assistantEnabled = !!ENDPOINT;

export interface ProductSuggestion {
  name?: string;
  categoryId?: CategoryId;
  description?: string;
}

const CATEGORIES: CategoryId[] = ['mode', 'electronique', 'maison', 'beaute', 'alimentation', 'sport'];

async function toBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Suggestions à partir de la première photo. Le vendeur accepte ou refuse chacune. */
export async function suggestFromPhoto(photo: LocalImage): Promise<ProductSuggestion> {
  if (!ENDPOINT) throw new Error('Assistant non configuré');
  const small = await compressImage(photo, 768);
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ image: await toBase64(small.uri) }),
  });
  if (!res.ok) throw new Error(`Assistant indisponible (${res.status})`);
  const raw = (await res.json()) as Record<string, unknown>;
  // Seuls ces trois champs sont acceptés.
  return {
    name: typeof raw.name === 'string' ? raw.name.trim().slice(0, 60) : undefined,
    categoryId: CATEGORIES.includes(raw.categoryId as CategoryId) ? (raw.categoryId as CategoryId) : undefined,
    description: typeof raw.description === 'string' ? raw.description.trim().slice(0, 600) : undefined,
  };
}
