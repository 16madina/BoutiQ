/**
 * Aperçu « téléphone » dans le navigateur (page apercu/, développement uniquement).
 *
 * La page d'aperçu nomme son iframe « boutiq-iphone » : l'app simule alors les zones de
 * sécurité d'un iPhone (barre d'état + Dynamic Island en haut, barre d'accueil en bas) et
 * indique à la page la couleur de la barre d'état. Sans effet sur téléphone et sur le site.
 */
import { Platform } from 'react-native';

export const isPhonePreview = Platform.OS === 'web' && typeof window !== 'undefined' && window.name === 'boutiq-iphone';

/** Zones de sécurité d'un iPhone récent (en points). */
export const PREVIEW_INSETS = { top: 54, bottom: 34, left: 0, right: 0 };

/** Couleur des icônes de la barre d'état (heure, batterie) affichée par la page d'aperçu. */
export function reportStatusBarStyle(style: 'light' | 'dark') {
  if (isPhonePreview) window.parent?.postMessage({ type: 'boutiq:status-bar', style }, '*');
}
