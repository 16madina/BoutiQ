import { STORES } from '@/data/demo';

const RESERVED = new Set([
  'admin', 'api', 'app', 'aide', 'help', 'support', 'mymarket', 'boutiq', 'boutique', 'boutiques', 'store', 'stores',
  'seller', 'vendeur', 'login', 'auth', 'search', 'cart', 'panier', 'compte', 'account', 'settings',
]);

/** « Boutique Élégance CI » → « boutique-elegance-ci » */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

export type SlugCheck = { ok: true } | { ok: false; reason: string };

/**
 * Démo : unicité vérifiée contre les boutiques connues localement.
 * Production : contrainte UNIQUE en base + RPC `is_slug_available` (voir migration).
 */
export function checkSlug(slug: string, ownSlug?: string): SlugCheck {
  if (slug.length < 3) return { ok: false, reason: 'Au moins 3 caractères' };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { ok: false, reason: 'Lettres, chiffres et tirets uniquement' };
  if (RESERVED.has(slug)) return { ok: false, reason: 'Cette adresse est réservée' };
  if (slug !== ownSlug && STORES.some((s) => s.id === slug || s.slug === slug)) {
    return { ok: false, reason: 'Déjà prise — essayez une variante' };
  }
  return { ok: true };
}

export function suggestSlug(base: string): string {
  for (let i = 2; i < 50; i++) {
    const candidate = `${base}-${i}`;
    if (checkSlug(candidate).ok) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
