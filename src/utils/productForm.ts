/**
 * Aides de saisie de l'écran « Ajouter un produit » : devise, catégorie proposée,
 * tailles et couleurs courantes, vérifications avec des messages simples.
 */
import type { CategoryId } from '@/types';
import type { ProductForm } from '@/types/seller';
import { normalize } from '@/utils/format';

/** Devise affichée selon le pays de la boutique (prix saisis en nombre entier). */
export function currencyLabel(country?: string): string {
  return country && normalize(country).startsWith('guinee') ? 'GNF' : 'FCFA';
}

const CATEGORY_WORDS: [CategoryId, RegExp][] = [
  ['electronique', /telephone|smartphone|iphone|samsung|ecouteur|casque|chargeur|ordinateur|laptop|tablette|tele|tv|montre connectee|enceinte|cable|console/],
  ['beaute', /creme|parfum|savon|serum|maquillage|rouge a levre|vernis|huile de|beurre de karite|lotion|shampo|perruque|meche|cosmetique|soin/],
  ['alimentation', /riz|huile|sucre|farine|fruit|legume|mangue|banane|tomate|oignon|piment|poisson|viande|poulet|jus|boisson|epice|attieke|manioc|igname|pain|cafe|the |lait/],
  ['maison', /canape|chaise|table|lit|matelas|rideau|lampe|tapis|marmite|casserole|assiette|verre|couverture|drap|coussin|meuble|deco/],
  ['sport', /ballon|maillot|crampon|basket de sport|velo|haltere|tapis de yoga|survetement|raquette/],
  ['mode', /robe|jupe|pantalon|chemise|t-shirt|tshirt|boubou|pagne|wax|sac|chaussure|sandale|escarpin|basket|bijou|collier|bracelet|boucle|montre|lunette|ceinture|veste|costume|foulard/],
];

/** Catégorie proposée d'après le nom saisi (sinon celle de la boutique). */
export function suggestCategory(name: string, fallback: CategoryId): CategoryId {
  const n = ` ${normalize(name)} `;
  return CATEGORY_WORDS.find(([, re]) => re.test(n))?.[0] ?? fallback;
}

export const SIZE_PRESETS: { label: string; values: string[] }[] = [
  { label: 'Vêtements', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { label: 'Chaussures', values: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] },
];

export const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Noir', hex: '#191919' },
  { name: 'Blanc', hex: '#FFFFFF' },
  { name: 'Beige', hex: '#E6D3B3' },
  { name: 'Marron', hex: '#7A4A2A' },
  { name: 'Rouge', hex: '#C62828' },
  { name: 'Rose', hex: '#E58AA8' },
  { name: 'Orange', hex: '#E67E22' },
  { name: 'Jaune', hex: '#F2C230' },
  { name: 'Vert', hex: '#2E7D32' },
  { name: 'Bleu', hex: '#1F6FD1' },
  { name: 'Gris', hex: '#8E8E8E' },
  { name: 'Doré', hex: '#C9962E' },
];

export type FormErrors = Partial<Record<'photos' | 'name' | 'price' | 'oldPrice' | 'variants', string>>;

/** Champs obligatoires pour publier : photo, nom, prix. */
export function validateProduct(f: ProductForm): FormErrors {
  const e: FormErrors = {};
  if (f.photos.length === 0) e.photos = 'Ajoutez au moins une photo de votre produit.';
  if (f.name.trim().length < 2) e.name = 'Donnez un nom à votre produit.';
  if (f.price <= 0) e.price = 'Indiquez le prix de vente.';
  if (f.oldPrice && f.oldPrice > 0 && f.oldPrice <= f.price) e.oldPrice = 'L’ancien prix doit être plus élevé que le prix de vente.';
  if (f.variants?.some((v) => !v.label.trim() || v.price <= 0)) e.variants = 'Chaque variante a besoin d’un nom et d’un prix.';
  return e;
}

/** Résumé court de ce qui manque (« une photo · le prix »). */
export function missingSummary(e: FormErrors): string {
  const parts: string[] = [];
  if (e.photos) parts.push('une photo');
  if (e.name) parts.push('le nom');
  if (e.price) parts.push('le prix');
  if (e.oldPrice) parts.push('l’ancien prix');
  if (e.variants) parts.push('les variantes');
  return parts.join(' · ');
}

export const toNumber = (t: string) => Number(t.replace(/\D/g, '')) || 0;
export const groupDigits = (n: number) => (n ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');
