import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

/**
 * Adresse publique des boutiques.
 * Provisoire : lien profond de l'app. Le jour où un domaine est disponible,
 * renseigner PUBLIC_WEB_BASE (ex. 'https://boutiq.africa') : tous les liens
 * deviennent https://boutiq.africa/<adresse> (avec aperçu dans WhatsApp).
 */
export const PUBLIC_WEB_BASE: string | null = null;

/** Texte affiché à l'utilisateur (court et lisible). */
export function storeDisplayAddress(slug: string): string {
  return PUBLIC_WEB_BASE ? `${PUBLIC_WEB_BASE.replace(/^https?:\/\//, '')}/${slug}` : `boutiq://store/${slug}`;
}

/** Lien réellement partagé. */
export function storeUrl(slug: string): string {
  if (PUBLIC_WEB_BASE) return `${PUBLIC_WEB_BASE}/${slug}`;
  return Linking.createURL(`/store/${slug}`);
}

export function storeShareMessage(name: string, slug: string): string {
  return `Découvrez ma boutique « ${name} » sur BoutiQ 🛍️\n${storeUrl(slug)}`;
}

/** Ouvre WhatsApp avec le message pré-rempli (repli : feuille de partage du système). */
export async function shareOnWhatsApp(message: string) {
  const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
  try {
    if (Platform.OS !== 'web' && (await Linking.canOpenURL(url))) {
      await Linking.openURL(url);
      return;
    }
    if (Platform.OS === 'web') {
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
      return;
    }
  } catch {
    // on bascule sur le partage système
  }
  await Share.share({ message }).catch(() => {});
}

export async function shareAnywhere(message: string) {
  await Share.share({ message }).catch(() => {});
}
