// Espace insécable classique : l'espace fine (U+202F) est absente de certaines polices (DM Sans).
const NNBSP = ' ';

/** 25000 → « 25 000 FCFA » (sans dépendre d'Intl, absent sur certains Android). */
export function formatFCFA(value: number): string {
  const digits = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  return `${digits}${NNBSP}FCFA`;
}

export function discountPercent(price: number, oldPrice?: number): number | null {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',')}${NNBSP}k`;
  return String(n);
}

/** Recherche insensible aux accents et à la casse. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
