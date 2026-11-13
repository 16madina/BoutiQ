/**
 * Vitrine publique d'une boutique.
 *
 * Ces types ne dépendent ni de React Native ni d'Expo : ils décrivent des données
 * pures, réutilisables telles quelles par une future vitrine web (Next.js, etc.).
 * Côté base : table `storefront_settings` (voir supabase/migrations).
 */
import type { CategoryId } from '@/types';

/** Les six modèles professionnels proposés au vendeur. */
export type StorefrontTemplateId = 'editorial' | 'mode' | 'beaute' | 'electronique' | 'alimentation' | 'generaliste';

/** Photo de bannière : URL complète (vendeur, Supabase) ou photo de démo. */
export interface HeroImage {
  uri?: string;
  photoId?: string;
}

/**
 * Réglages choisis par le vendeur (écran « Personnaliser ma boutique »).
 * Changer de modèle ou de couleur ne touche jamais aux produits.
 */
export interface StorefrontSettings {
  template: StorefrontTemplateId;
  /** Couleur principale de la boutique (hexadécimal #RRGGBB). */
  accentColor: string;
  /** Phrase d'accroche affichée sur la bannière. */
  tagline?: string;
  /** Message promotionnel écrit par le vendeur (« Livraison offerte dès 20 000 FCFA »). */
  promoMessage?: string;
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

/** Sections de la vitrine, placées dans l'ordre propre à chaque modèle. Le catalogue suit toujours. */
export type StorefrontSectionId = 'promo' | 'collections' | 'featured' | 'new' | 'deals' | 'about';

/** Titres des sections : [petit surtitre, titre]. */
export type SectionCopy = Record<'featured' | 'new' | 'deals' | 'collections' | 'catalog', [string, string]>;

/** Présentation d'un modèle : tout ce qui change d'un modèle à l'autre. */
/** Mise en scène de la vitrine « site web » (une par modèle). */
export type SiteStyle = 'fresh' | 'editorial' | 'fashion' | 'soft' | 'tech' | 'warm';

export interface StorefrontTemplate {
  id: StorefrontTemplateId;
  label: string;
  /** Nom court (sélecteur de modèle). */
  shortLabel: string;
  /** Description simple, pour le vendeur. */
  hint: string;
  /** Catégories de boutique auxquelles ce modèle est proposé par défaut. */
  defaultFor: CategoryId[];
  /** Hauteur de la bannière par rapport à la largeur de l'écran. */
  heroRatio: number;
  /** Titre de la boutique : serif élégant ou sans-serif net. */
  titleFont: 'serif' | 'sans';
  /**
   * Disposition de l'en-tête (nom de la boutique dans la barre du haut, sauf « centered ») :
   * collage = barre claire + collage de photos façon magazine (Éditorial) ;
   * overlay = grande photo sombre, nom en haut, titre en bas (Mode) ;
   * centered = photo puis logo et nom centrés (Beauté) ;
   * stacked = photo puis bloc sombre avec logo, nom et boutons (Électronique) ;
   * inset = photo encadrée en carte, puis identité et services (Alimentation) ;
   * banner = barre claire centrée + photo d'ambiance (Généraliste).
   */
  heroLayout: 'collage' | 'overlay' | 'centered' | 'stacked' | 'inset' | 'banner' | 'site';
  /** Présentation des collections (rayons). */
  collectionShape: 'photo-card' | 'emoji-circle' | 'round' | 'square' | 'tile' | 'emoji-grid';
  /**
   * Style des cartes produits des sections : classic = carrousel de cartes photo
   * (Beauté, Électronique, Alimentation) ; fashion / clean = cartes deux par deux.
   */
  productStyle: 'fashion' | 'classic' | 'clean';
  /** Présentation des produits vedettes. */
  featuredStyle: 'editorial' | 'grid' | 'spotlight' | 'rail';
  /** Titre affiché sur la bannière quand le vendeur n'a pas écrit d'accroche. */
  heroTitle: string;
  /** Avec heroLayout « site » : la mise en scène propre au modèle. */
  siteStyle?: SiteStyle;
  /** Ancienne présentation (vignette du modèle ; la remettre dans heroLayout pour revenir en arrière). */
  legacyLayout?: StorefrontTemplate['heroLayout'];
  /** Photos de bannière montrées tant que le vendeur n'a pas ajouté les siennes. */
  defaultHeroPhotoIds?: string[];
  /** Bouton de la bannière (mène au catalogue). */
  heroCta: string;
  /** Petits surtitres au-dessus des titres de sections. */
  kickers: boolean;
  /** Ordre des sections avant le catalogue. */
  sections: StorefrontSectionId[];
  copy: SectionCopy;
  /** Collections suggérées au vendeur. */
  suggestedCollections: string[];
  /** Exemple de message promotionnel (aide à la saisie, jamais affiché aux clients). */
  promoExample: string;
  /** Arrondi général des cartes. */
  radius: number;
  /** Couleur proposée par défaut. */
  defaultAccent: string;
  /** Teintes proposées au vendeur. */
  suggestedAccents: string[];
  /** En-tête et carte vedette sur fond sombre (électronique). */
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
