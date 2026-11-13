import { pullProfile } from '@/api/account';
import { pullSellerData } from '@/api/sellerSync';
import { syncRemoteCatalog } from '@/api/remoteCatalog';
import { pullShopData } from '@/api/shopSync';
import { removeImages } from '@/lib/media';
import { currentUser, ensureSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { useProfile } from '@/store/useProfile';
import { useSeller } from '@/store/useSeller';
import { useSettings } from '@/store/useSettings';
import { useShop } from '@/store/useShop';

/**
 * Compte par e-mail et mot de passe.
 *
 * Créer un compte RATTACHE l'e-mail au compte déjà utilisé sur l'appareil (compte anonyme
 * créé à la première action) : la boutique, les commandes et les favoris sont conservés.
 * Se connecter ouvre un compte existant, par exemple sur un nouveau téléphone.
 */

const clean = (email: string) => email.trim().toLowerCase();
export const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
export const MIN_PASSWORD = 8;

/** Message simple à partir d'une erreur Supabase Auth. */
function message(error: { code?: string; message?: string; status?: number }): string {
  const code = error.code ?? '';
  const text = (error.message ?? '').toLowerCase();
  if (code === 'email_exists' || code === 'user_already_exists' || text.includes('already') || text.includes('registered'))
    return 'Un compte existe déjà avec cet e-mail. Touchez « J’ai déjà un compte » pour vous connecter.';
  if (code === 'invalid_credentials' || text.includes('invalid login')) return 'E-mail ou mot de passe incorrect.';
  if (code === 'email_not_confirmed' || text.includes('not confirmed')) return 'Confirmez d’abord votre e-mail : ouvrez le message reçu et touchez le lien.';
  if (code === 'weak_password' || text.includes('password')) return `Choisissez un mot de passe d’au moins ${MIN_PASSWORD} caractères.`;
  if (code === 'over_email_send_rate_limit' || error.status === 429 || text.includes('rate limit'))
    return 'Trop de demandes en peu de temps. Réessayez dans quelques minutes.';
  if (code === 'email_address_invalid' || code === 'validation_failed') return 'Cette adresse e-mail n’est pas acceptée. Vérifiez-la.';
  if (code === 'email_address_not_authorized') return 'L’envoi d’e-mails n’est pas encore ouvert à cette adresse. Contactez l’équipe BoutiQ.';
  return 'Action impossible pour le moment. Vérifiez votre connexion et réessayez.';
}

function remember(user: { id: string; email?: string | null; phone?: string | null }) {
  useAuth.getState().setSession({ userId: user.id, email: user.email ?? undefined, phone: user.phone || undefined, signedInAt: new Date().toISOString() });
}

/**
 * Crée le compte. Renvoie « confirm » quand un e-mail de confirmation vient de partir
 * (il faut toucher le lien reçu), « done » quand le compte est tout de suite actif.
 */
export async function signUpWithEmail(email: string, password: string): Promise<'confirm' | 'done'> {
  if (!supabase) throw new Error('Connexion indisponible.');
  const address = clean(email);
  const user = await ensureSession();
  if (user.email && !user.is_anonymous) throw new Error('Vous êtes déjà connecté avec ' + user.email + '.');
  const { data, error } = await supabase.auth.updateUser({ email: address, password });
  if (error) throw new Error(message(error));
  if (data.user?.email === address) {
    remember(data.user);
    return 'done';
  }
  return 'confirm';
}

/** Après avoir touché le lien reçu par e-mail : le compte est-il confirmé ? */
export async function checkEmailConfirmed(email: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.auth.refreshSession();
  const user = data.user;
  if (error || !user || user.email !== clean(email)) return false;
  remember(user);
  return true;
}

export async function resendConfirmation(email: string) {
  if (!supabase) return;
  const { error } = await supabase.auth.resend({ type: 'email_change', email: clean(email) });
  if (error) throw new Error(message(error));
}

/** Ouvre un compte existant (nouveau téléphone, réinstallation). */
export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Connexion indisponible.');
  // Une boutique créée ici sans compte serait perdue en changeant de compte.
  const { data: current } = await supabase.auth.getSession();
  if (current.session?.user.is_anonymous && useSeller.getState().store) {
    throw new Error('Cet appareil a déjà une boutique. Créez plutôt votre compte ici pour la garder.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: clean(email), password });
  if (error || !data.user) throw new Error(message(error ?? {}));
  remember(data.user);
  // Boutique, profil, favoris du compte : relus depuis Supabase.
  await Promise.allSettled([pullSellerData(), pullProfile(), pullShopData()]);
}

/** Au démarrage : retrouve la connexion (par exemple après avoir confirmé l'e-mail hors de l'app). */
export async function restoreAccountSession() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (user && !user.is_anonymous && (user.email || user.phone)) {
    const known = useAuth.getState().session;
    if (known?.userId !== user.id || known.email !== (user.email ?? undefined)) remember(user);
  }
}

/**
 * Déconnexion. Pour un vrai compte (e-mail ou SMS), l'appareil oublie la boutique et le profil :
 * ils restent enregistrés en ligne et reviennent à la prochaine connexion.
 */
export async function signOutAccount() {
  const { session, signOut } = useAuth.getState();
  if (supabase && session) {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (user && !user.is_anonymous) {
      if (useSeller.getState().products.some((p) => p.sync && p.sync.state !== 'synced')) {
        throw new Error('Des produits ne sont pas encore envoyés en ligne. Ouvrez « Produits » et envoyez-les avant de vous déconnecter.');
      }
      await supabase.auth.signOut();
      useSeller.setState({ store: null, details: null, products: [], storeViews: 0, space: 'buyer', productDraft: null });
      useProfile.getState().update({ fullName: '', phone: '', city: '', address: '', avatar: undefined, memberSince: undefined });
    }
  }
  signOut();
}

/** L'appareil oublie tout ce qui appartenait au compte (boutique, profil, panier, favoris, réglages). */
function forgetEverything() {
  useSeller.setState({ store: null, details: null, products: [], storeViews: 0, space: 'buyer', productDraft: null });
  useProfile.getState().update({ fullName: '', phone: '', city: '', address: '', avatar: undefined, memberSince: undefined });
  useShop.setState({ cart: [], favorites: {}, followedStores: {}, promoCodes: {} });
  useSettings.getState().set({ biometricLock: false });
  useAuth.getState().signOut();
}

/** Y a-t-il un compte en ligne (même sans e-mail) à supprimer ? */
export async function hasOnlineAccount(): Promise<boolean> {
  return !!(await currentUser());
}

/**
 * Supprime définitivement le compte et ses données (exigé par l'App Store et Google Play).
 * Refusé par Supabase tant qu'une commande est en cours. Les ventes déjà terminées restent
 * chez le vendeur, sans le nom, le téléphone ni l'adresse du client.
 */
export async function deleteAccount() {
  const user = await currentUser();
  if (supabase && user) {
    // Commandes en cours : on s'arrête avant de toucher aux photos.
    const { store, products, details } = useSeller.getState();
    const mine = `buyer_id.eq.${user.id}${store?.remoteId ? `,store_id.eq.${store.remoteId}` : ''}`;
    const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['pending', 'confirmed', 'shipped']).or(mine);
    if (count) throw new Error('Vous avez des commandes en cours. Terminez-les ou annulez-les avant de supprimer votre compte.');

    // Photos envoyées en ligne (boutique, produits, profil) et pièce d'identité.
    const media = [
      ...products.flatMap((p) => p.photos.map((ph) => ph.remotePath)),
      store?.logo?.remotePath,
      ...(store?.banners ?? [store?.banner]).map((b) => b?.remotePath),
      useProfile.getState().avatar?.remotePath,
    ].filter((x): x is string => !!x);
    await removeImages(media).catch(() => {});
    if (details?.idDocument?.remotePath) await supabase.storage.from('seller-documents').remove([details.idDocument.remotePath]).catch(() => {});

    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      if (error.code === 'P0001' && error.message) throw new Error(error.message);
      throw new Error('Suppression impossible pour le moment. Vérifiez votre connexion et réessayez.');
    }
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    syncRemoteCatalog();
  }
  forgetEverything();
}
