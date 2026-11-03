/**
 * Vitrine publique d'une boutique.
 *
 * Ces types ne dépendent ni de React Native ni d'Expo : ils décrivent des données
 * pures, réutilisables telles quelles par une future vitrine web (Next.js, etc.).
 * Côté base : table `storefront_settings` (voir supabase/migrations).
 */
import type { CategoryId } from '@/types';

/** Modèles professionnels proposés au vendeur. */
export type StorefrontTemplateId = 'mode' | 'beaute' | 'electronique' | 'maison' | 'generaliste';

/**
 * Réglages choisis par le vendeur (Studio Boutique).
 * Changer de modèle ou de couleur ne touche jamais aux produits.
 */
export interface StorefrontSettings {
  template: StorefrontTemplateId;
  /** Couleur principale de la boutique (hexadécimal #RRGGBB). */
  accentColor: string;
  /** Phrase d'accroche affichée sur la bannière. */
  tagline?: string;
  /** Produits « mis en avant » (identifiants), dans l'ordre choisi. */
  featuredProductIds: string[];
  /** Contact public facultatif (WhatsApp / téléphone), au format international. */
  contactPhone?: string;
}

/** Collection telle qu'affichée sur la vitrine. */
export interface StorefrontCollection {
  id: string;
  name: string;
  /** Photo de couverture (URL complète). */
  coverUri?: string;
  /** Identifiants des produits (démo) ; vide = filtre par nom de collection. */
  productKeys?: string[];
  count: number;
}

/** Présentation d'un modèle : tout ce qui change d'un modèle à l'autre. */
export interface StorefrontTemplate {
  id: StorefrontTemplateId;
  label: string;
  /** Description simple, pour le Studio. */
  hint: string;
  /** Catégorie de boutique à laquelle ce modèle est proposé par défaut. */
  defaultFor: CategoryId[];
  /** Hauteur de la bannière par rapport à la largeur de l'écran. */
  heroRatio: number;
  /** Titre de la boutique : serif élégant ou sans-serif net. */
  titleFont: 'serif' | 'sans';
  /** Disposition de l'en-tête. */
  heroLayout: 'immersive' | 'stacked';
  /** Forme des cartes de collection. */
  collectionShape: 'portrait' | 'round' | 'square' | 'landscape';
  /** Arrondi général des cartes. */
  radius: number;
  /** Couleur proposée par défaut. */
  defaultAccent: string;
  /** Teintes proposées dans le Studio. */
  suggestedAccents: string[];
  /** Fond de l'en-tête pour les modèles sombres (électronique). */
  dark: boolean;
}

/** Palette calculée à partir de la couleur du vendeur. */
export interface StorefrontPalette {
  accent: string;
  /** Texte lisible posé sur l'accent. */
  onAccent: string;
  /** Teinte très claire de l'accent (fonds de puces, encadrés). */
  accentSoft: string;
  /** Accent assombri pour les textes et liens sur fond clair. */
  accentInk: string;
}
