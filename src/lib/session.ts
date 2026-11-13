import { supabase } from '@/lib/supabase';

/**
 * Compte Supabase de la personne qui utilise l'app (client ou vendeur).
 * Créé automatiquement (connexion anonyme) à la première action qui en a besoin :
 * favori, abonnement, commande, publication. Le numéro de téléphone y sera rattaché
 * quand la connexion par SMS sera activée, sans rien perdre.
 */
export async function ensureSession() {
  if (!supabase) throw new Error('Supabase non configuré');
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user;
  const { data: signIn, error } = await supabase.auth.signInAnonymously();
  if (error || !signIn.user) throw error ?? new Error('Connexion impossible');
  return signIn.user;
}

/** Utilisateur déjà connecté, sans en créer un. */
export async function currentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}
