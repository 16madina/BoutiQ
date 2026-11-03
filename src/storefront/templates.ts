/**
 * Modèles de vitrine et calcul des couleurs de chaque boutique.
 * Module sans dépendance à React Native : partageable avec une vitrine web.
 */
import type { CategoryId } from '@/types';
import type { StorefrontPalette, StorefrontTemplate, StorefrontTemplateId } from '@/types/storefront';

/** Couleurs de l'identité BoutiQ, proposées dans tous les modèles. */
const BRAND_ACCENTS = ['#B87A3D', '#8A542C', '#58351F', '#191919'];

export const TEMPLATES: Record<StorefrontTemplateId, StorefrontTemplate> = {
  mode: {
    id: 'mode',
    label: 'Mode et accessoires',
    hint: 'Grandes photos, titres élégants. Idéal pour les vêtements, sacs et bijoux.',
    defaultFor: ['mode'],
    heroRatio: 1.18,
    titleFont: 'serif',
    heroLayout: 'immersive',
    collectionShape: 'portrait',
    radius: 18,
    defaultAccent: '#B87A3D',
    suggestedAccents: [...BRAND_ACCENTS, '#9B2C3A', '#2F4F3A'],
    dark: false,
  },
  beaute: {
    id: 'beaute',
    label: 'Beauté et cosmétiques',
    hint: 'Doux et lumineux, formes arrondies. Idéal pour les soins, parfums et maquillage.',
    defaultFor: ['beaute'],
    heroRatio: 0.92,
    titleFont: 'serif',
    heroLayout: 'immersive',
    collectionShape: 'round',
    radius: 24,
    defaultAccent: '#B0646E',
    suggestedAccents: ['#B0646E', '#C98A6B', '#8E5A7A', ...BRAND_ACCENTS],
    dark: false,
  },
  electronique: {
    id: 'electronique',
    label: 'Électronique',
    hint: 'Sobre et moderne, en-tête sombre. Idéal pour les téléphones et accessoires.',
    defaultFor: ['electronique'],
    heroRatio: 0.72,
    titleFont: 'sans',
    heroLayout: 'stacked',
    collectionShape: 'square',
    radius: 14,
    defaultAccent: '#2B6CB0',
    suggestedAccents: ['#2B6CB0', '#0F766E', '#191919', '#B87A3D'],
    dark: true,
  },
  maison: {
    id: 'maison',
    label: 'Maison et décoration',
    hint: 'Larges photos d’ambiance. Idéal pour les meubles, la déco et le linge.',
    defaultFor: ['maison'],
    heroRatio: 0.78,
    titleFont: 'serif',
    heroLayout: 'immersive',
    collectionShape: 'landscape',
    radius: 16,
    defaultAccent: '#6B7F5A',
    suggestedAccents: ['#6B7F5A', '#8A542C', '#5C6B7A', ...BRAND_ACCENTS],
    dark: false,
  },
  generaliste: {
    id: 'generaliste',
    label: 'Boutique généraliste',
    hint: 'Équilibré et clair. Convient à tous les produits.',
    defaultFor: ['alimentation', 'sport'],
    heroRatio: 0.82,
    titleFont: 'sans',
    heroLayout: 'immersive',
    collectionShape: 'square',
    radius: 18,
    defaultAccent: '#B87A3D',
    suggestedAccents: [...BRAND_ACCENTS, '#6B7F3A', '#2B6CB0'],
    dark: false,
  },
};

export const TEMPLATE_ORDER: StorefrontTemplateId[] = ['mode', 'beaute', 'electronique', 'maison', 'generaliste'];

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
    accentSoft: toHex(mix(accent, IVORY, 0.86)),
    accentInk: toHex(ink),
  };
}

/** Vérifie qu'une couleur saisie est utilisable. */
export function isValidAccent(hex: string) {
  return parseHex(hex) != null;
}
