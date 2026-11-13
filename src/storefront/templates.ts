/**
 * Modèles de vitrine et calcul des couleurs de chaque boutique.
 * Module sans dépendance à React Native : partageable avec une vitrine web.
 */
import type { CategoryId } from '@/types';
import type { StorefrontPalette, StorefrontTemplate, StorefrontTemplateId } from '@/types/storefront';

/** Couleurs de l'identité BoutiQ, proposées dans tous les modèles. */
const BRAND_ACCENTS = ['#B87A3D', '#8A542C', '#58351F', '#191919'];

/**
 * Les six modèles professionnels. Ils partagent les mêmes données (boutique,
 * produits, commandes) : seule la présentation change.
 */
export const TEMPLATES: Record<StorefrontTemplateId, StorefrontTemplate> = {
  editorial: {
    id: 'editorial',
    label: 'Éditorial Élégance',
    shortLabel: 'Éditorial',
    hint: 'Style magazine haut de gamme : collage de photos, grands titres. Idéal pour les créateurs et marques premium.',
    defaultFor: [],
    heroRatio: 1.08,
    titleFont: 'serif',
    // Vitrine « comme un site web ». Pour revenir à l'ancienne présentation : heroLayout: 'collage'.
    heroLayout: 'site',
    siteStyle: 'editorial',
    legacyLayout: 'collage',
    defaultHeroPhotoIds: ['1572804013309-59a88b7e92f1', '1515372039744-b8f02a3ae446', '1539008835657-9e8e9680c956'],
    collectionShape: 'photo-card',
    productStyle: 'fashion',
    featuredStyle: 'editorial',
    sections: ['collections', 'featured', 'promo', 'new', 'deals', 'about'],
    copy: {
      featured: ['La sélection', 'Pièces signatures'],
      collections: ['Collections', 'Nos collections'],
      new: ['Nouveautés', 'Nos nouveautés'],
      deals: ['Offres', 'Promotions'],
      catalog: ['Catalogue', 'Toute la boutique'],
    },
    heroTitle: 'L’élégance au quotidien',
    heroCta: 'Découvrir la collection',
    kickers: false,
    suggestedCollections: ['Nouvelle collection', 'Robes', 'Sacs', 'Bijoux', 'Accessoires', 'Édition limitée'],
    promoExample: 'Emballage cadeau offert sur toutes les commandes',
    radius: 14,
    defaultAccent: '#58351F',
    suggestedAccents: ['#58351F', '#191919', '#8A542C', '#B87A3D', '#6B2D3A', '#2F4F3A'],
    dark: false,
  },
  mode: {
    id: 'mode',
    label: 'Mode et accessoires',
    shortLabel: 'Mode',
    hint: 'Moderne et attirant : grande photo, nom de la boutique en haut, rayons en icônes. Pour vêtements, sacs, chaussures.',
    defaultFor: ['mode'],
    heroRatio: 1.12,
    titleFont: 'serif',
    // Vitrine « comme un site web ». Pour revenir à l'ancienne présentation : heroLayout: 'overlay'.
    heroLayout: 'site',
    siteStyle: 'fashion',
    legacyLayout: 'overlay',
    defaultHeroPhotoIds: ['1511499767150-a48a237f0083', '1590874103328-eac38a683ce7', '1691480250099-a63081ecfcb8'],
    collectionShape: 'emoji-circle',
    productStyle: 'fashion',
    featuredStyle: 'rail',
    sections: ['collections', 'new', 'promo', 'featured', 'deals', 'about'],
    copy: {
      featured: ['Sélection', 'Coups de cœur'],
      collections: ['Rayons', 'Nos rayons'],
      new: ['Nouveautés', 'Nos nouveautés'],
      deals: ['Bons plans', 'Promotions'],
      catalog: ['Catalogue', 'Toute la boutique'],
    },
    heroTitle: 'Nouvelle collection',
    heroCta: 'Explorer',
    kickers: false,
    suggestedCollections: ['Robes', 'Sacs', 'Chaussures', 'Bijoux', 'Wax', 'Accessoires'],
    promoExample: 'Retouches offertes sur toutes les robes',
    radius: 16,
    defaultAccent: '#B87A3D',
    suggestedAccents: [...BRAND_ACCENTS, '#9B2C3A', '#2F4F3A'],
    dark: true,
  },
  beaute: {
    id: 'beaute',
    label: 'Beauté et cosmétiques',
    shortLabel: 'Beauté',
    hint: 'Doux et raffiné : logo centré, rayons ronds, best-sellers en vitrine. Pour soins, maquillage et bien-être.',
    defaultFor: ['beaute'],
    heroRatio: 0.78,
    titleFont: 'serif',
    // Vitrine « comme un site web ». Pour revenir à l'ancienne présentation : heroLayout: 'centered'.
    heroLayout: 'site',
    siteStyle: 'soft',
    legacyLayout: 'centered',
    defaultHeroPhotoIds: ['1588405748880-12d1d2a59f75', '1512496015851-a90fb38ba796'],
    collectionShape: 'round',
    productStyle: 'classic',
    featuredStyle: 'grid',
    sections: ['promo', 'collections', 'featured', 'new', 'deals', 'about'],
    copy: {
      featured: ['Les plus aimés', 'Nos best-sellers'],
      collections: ['Rayons', 'Trouver mon soin'],
      new: ['Tout juste arrivés', 'Nouveautés beauté'],
      deals: ['Offres', 'Promotions'],
      catalog: ['Catalogue', 'Tous les produits'],
    },
    heroTitle: 'Révélez votre éclat naturel',
    heroCta: 'Découvrir',
    kickers: true,
    suggestedCollections: ['Visage', 'Corps', 'Cheveux', 'Maquillage', 'Parfums', 'Coffrets'],
    promoExample: 'Un échantillon offert dans chaque commande',
    radius: 24,
    defaultAccent: '#A8427A',
    suggestedAccents: ['#A8427A', '#B0646E', '#C98A6B', '#7A2E4A', ...BRAND_ACCENTS],
    dark: false,
  },
  electronique: {
    id: 'electronique',
    label: 'Électronique',
    shortLabel: 'Électronique',
    hint: 'Sobre et moderne : en-tête sombre, produit phare mis en avant, bonnes affaires.',
    defaultFor: ['electronique'],
    heroRatio: 0.62,
    titleFont: 'sans',
    // Vitrine « comme un site web ». Pour revenir à l'ancienne présentation : heroLayout: 'stacked'.
    heroLayout: 'site',
    siteStyle: 'tech',
    legacyLayout: 'stacked',
    defaultHeroPhotoIds: ['1511707171634-5f897ff02aa9', '1609692814858-f7cd2f0afa4f', '1592750475338-74b7b21085ab'],
    collectionShape: 'square',
    productStyle: 'classic',
    featuredStyle: 'spotlight',
    sections: ['promo', 'featured', 'deals', 'collections', 'new', 'about'],
    copy: {
      featured: ['À la une', 'Produits phares'],
      collections: ['Univers', 'Par catégorie'],
      new: ['Arrivages', 'Derniers arrivages'],
      deals: ['Prix en baisse', 'Bonnes affaires'],
      catalog: ['Catalogue', 'Tous les produits'],
    },
    heroTitle: 'High-Tech & Innovation',
    heroCta: 'Découvrir',
    kickers: true,
    suggestedCollections: ['Smartphones', 'Ordinateurs', 'Audio', 'Montres', 'Accessoires', 'Gaming'],
    promoExample: 'Garantie 12 mois sur tous les téléphones',
    radius: 14,
    defaultAccent: '#1F6FD1',
    suggestedAccents: ['#1F6FD1', '#0F766E', '#6D28D9', '#191919', '#B87A3D'],
    dark: true,
  },
  alimentation: {
    id: 'alimentation',
    label: 'Alimentation et épicerie',
    shortLabel: 'Alimentation',
    hint: 'Frais et pratique : rayons en vignettes, petits prix en premier, paniers.',
    defaultFor: ['alimentation'],
    heroRatio: 0.56,
    titleFont: 'sans',
    // Vitrine « comme un site web ». Pour revenir à l'ancienne présentation : heroLayout: 'inset'.
    heroLayout: 'site',
    siteStyle: 'fresh',
    legacyLayout: 'inset',
    defaultHeroPhotoIds: ['1610832958506-aa56368176cf', '1542838132-92c53300491e', '1488459716781-31db52582fe9'],
    collectionShape: 'tile',
    productStyle: 'classic',
    featuredStyle: 'grid',
    sections: ['promo', 'collections', 'deals', 'featured', 'new', 'about'],
    copy: {
      featured: ['Le choix du marché', 'Produits du moment'],
      collections: ['Rayons', 'Faire mes courses'],
      new: ['Arrivages', 'Arrivés aujourd’hui'],
      deals: ['Petits prix', 'Promos de la semaine'],
      catalog: ['Catalogue', 'Tous les produits'],
    },
    heroTitle: 'Des produits frais et de qualité',
    heroCta: 'Faire mes courses',
    kickers: true,
    suggestedCollections: ['Fruits', 'Légumes', 'Épicerie', 'Boissons', 'Boulangerie', 'Paniers'],
    promoExample: 'Livraison offerte dès 15 000 FCFA d’achat',
    radius: 20,
    defaultAccent: '#2F8A3A',
    suggestedAccents: ['#2F8A3A', '#D97706', '#B45309', '#0F766E', ...BRAND_ACCENTS],
    dark: false,
  },
  generaliste: {
    id: 'generaliste',
    label: 'Boutique généraliste',
    shortLabel: 'Généraliste',
    hint: 'Polyvalent : grille de rayons, photo d’ambiance. Pour les commerçants qui vendent de tout.',
    defaultFor: ['maison', 'sport'],
    heroRatio: 0.86,
    titleFont: 'serif',
    // Vitrine « comme un site web ». Pour revenir à l'ancienne présentation : heroLayout: 'banner'.
    heroLayout: 'site',
    siteStyle: 'warm',
    legacyLayout: 'banner',
    defaultHeroPhotoIds: ['1555041469-a586c61ea9bc', '1615800001964-5afd0ae8e49a', '1507473885765-e6ed057f782c'],
    collectionShape: 'emoji-grid',
    productStyle: 'clean',
    featuredStyle: 'rail',
    sections: ['collections', 'featured', 'new', 'deals', 'promo', 'about'],
    copy: {
      featured: ['Sélection', 'Nos sélections'],
      collections: ['Rayons', 'Nos rayons'],
      new: ['Nouveautés', 'Nos nouveautés'],
      deals: ['Bons plans', 'Promotions'],
      catalog: ['Catalogue', 'Tous les articles'],
    },
    heroTitle: 'Tout pour votre maison et bien plus',
    heroCta: 'Explorer les rayons',
    kickers: false,
    suggestedCollections: ['Maison', 'Mode', 'Beauté', 'Électronique', 'Alimentation', 'Cadeaux'],
    promoExample: 'Livraison gratuite à Abidjan ce week-end',
    radius: 16,
    defaultAccent: '#B0502E',
    suggestedAccents: ['#B0502E', '#8E3F24', '#C9703F', '#6E3B22', '#191919', '#6B7F5A'],
    dark: false,
  },
};

export const TEMPLATE_ORDER: StorefrontTemplateId[] = ['editorial', 'mode', 'beaute', 'electronique', 'alimentation', 'generaliste'];

/** Ramène une valeur inconnue (ancien modèle « maison », donnée corrompue) à un modèle valide. */
export function normalizeTemplateId(value: string | null | undefined): StorefrontTemplateId {
  return value && value in TEMPLATES ? (value as StorefrontTemplateId) : 'generaliste';
}

/** Modèle proposé automatiquement selon la catégorie de la boutique. */
export function templateForCategory(categoryId?: CategoryId): StorefrontTemplateId {
  if (!categoryId) return 'generaliste';
  return TEMPLATE_ORDER.find((id) => TEMPLATES[id].defaultFor.includes(categoryId)) ?? 'generaliste';
}

/* ---------------------------------------------------------------- Couleurs */

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Luminance relative (WCAG). */
function luminance([r, g, b]: [number, number, number]) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const IVORY: [number, number, number] = [250, 246, 240];
const WHITE: [number, number, number] = [255, 255, 255];
const INK: [number, number, number] = [25, 25, 25];

/**
 * Palette d'une boutique à partir de sa couleur.
 * Garantit des textes lisibles (contraste ≥ 4,5:1) quelle que soit la couleur choisie.
 */
export function buildPalette(accentHex: string, fallback = '#B87A3D'): StorefrontPalette {
  const accent = parseHex(accentHex) ?? parseHex(fallback)!;
  const onAccent = contrast(accent, WHITE) >= 4.5 ? '#FFFFFF' : contrast(accent, WHITE) >= 3 && luminance(accent) < 0.3 ? '#FFFFFF' : '#191919';
  let ink = accent;
  for (let i = 0; i < 10 && contrast(ink, IVORY) < 4.5; i++) ink = mix(ink, INK, 0.18);
  return {
    accent: toHex(accent),
    onAccent,
    // Teinte claire assez marquée pour que la couleur de la boutique se voie bien.
    accentSoft: toHex(mix(accent, IVORY, 0.8)),
    accentInk: toHex(ink),
  };
}

/** Vérifie qu'une couleur saisie est utilisable. */
export function isValidAccent(hex: string) {
  return parseHex(hex) != null;
}
