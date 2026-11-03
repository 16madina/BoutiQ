import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from '@/types/database';

/**
 * Client Supabase de BoutiQ (projet dédié, organisation kidi+).
 * Seule la clé PUBLIQUE est utilisée : les règles RLS de la base protègent les données.
 * Variables : EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_KEY (fichier .env.local).
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** Faux si les variables ne sont pas renseignées : l'app reste alors en mode démo. */
export const supabaseEnabled = !!url && !!key;

export const supabase = supabaseEnabled
  ? createClient<Database>(url!, key!, {
      auth: {
        // Sur le web, le stockage du navigateur est utilisé par défaut.
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/** Adresse publique d'un fichier du dossier « store-media » (logos, bannières, photos produits). */
export function storeMediaUrl(path: string | null | undefined): string | undefined {
  if (!path || !supabase) return undefined;
  return supabase.storage.from('store-media').getPublicUrl(path).data.publicUrl;
}
