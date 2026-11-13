import { create } from 'zustand';

import { ensureSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { formatFCFA } from '@/utils/format';

/**
 * Codes promo des boutiques (migration 20261113120000_promo_codes).
 * Le vendeur crée ses codes ; la réduction est toujours calculée par Supabase
 * (place_order) : le téléphone n'envoie que le code.
 */

export interface PromoCode {
  id: string;
  code: string;
  percent: number;
  /** Montant minimum d'achats dans la boutique (0 = aucun). */
  minTotal: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  /** Affiché sur la boutique et ses fiches produit. */
  isPublic: boolean;
  active: boolean;
}

export const PROMO_CODE_PATTERN = /^[A-Z0-9]{3,16}$/;

/** « PROMO 10 » → « PROMO10 » : majuscules, lettres et chiffres seulement. */
export const cleanPromoCode = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);

type Row = {
  id: string;
  code: string;
  percent: number;
  min_total: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_public: boolean;
  active: boolean;
};

const toPromo = (r: Row): PromoCode => ({
  id: r.id,
  code: r.code,
  percent: r.percent,
  minTotal: r.min_total,
  maxUses: r.max_uses ?? undefined,
  usedCount: r.used_count,
  expiresAt: r.expires_at ?? undefined,
  isPublic: r.is_public,
  active: r.active,
});

/** Le code est-il encore utilisable (actif, pas expiré, pas épuisé) ? */
export function promoUsable(p: PromoCode): boolean {
  if (!p.active) return false;
  if (p.expiresAt && new Date(p.expiresAt).getTime() <= Date.now()) return false;
  if (p.maxUses != null && p.usedCount >= p.maxUses) return false;
  return true;
}

/** « −10 % dès 20 000 FCFA d'achats » */
export function promoSummary(p: Pick<PromoCode, 'percent' | 'minTotal'>): string {
  return p.minTotal > 0 ? `−${p.percent} % dès ${formatFCFA(p.minTotal)} d’achats` : `−${p.percent} % sur vos achats dans la boutique`;
}

function fail(error: { code?: string; message?: string }): never {
  if (error.code === 'P0001' && error.message) throw new Error(error.message);
  if (error.code === '23505') throw new Error('Vous avez déjà un code avec ce nom.');
  if (error.code === 'PGRST202' || error.code === '42P01' || error.code === 'PGRST205') throw new Error('Les codes promo ne sont pas encore activés.');
  throw new Error('Action impossible pour le moment. Vérifiez votre connexion.');
}

/* ------------------------------------------------------------------ Vendeur */

/** Tous les codes de la boutique du vendeur connecté. */
export async function fetchMyPromoCodes(storeId: string): Promise<PromoCode[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('promo_codes').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
  if (error) fail(error);
  return (data ?? []).map(toPromo);
}

export interface NewPromoCode {
  code: string;
  percent: number;
  minTotal?: number;
  maxUses?: number;
  /** Durée de validité en jours (absent = sans date de fin). */
  days?: number;
  isPublic: boolean;
}

export async function createPromoCode(storeId: string, input: NewPromoCode): Promise<PromoCode> {
  if (!supabase) throw new Error('Codes promo indisponibles.');
  const { data, error } = await supabase
    .from('promo_codes')
    .insert({
      store_id: storeId,
      code: input.code,
      percent: input.percent,
      min_total: input.minTotal ?? 0,
      max_uses: input.maxUses ?? null,
      expires_at: input.days ? new Date(Date.now() + input.days * 86_400_000).toISOString() : null,
      is_public: input.isPublic,
    })
    .select('*')
    .single();
  if (error || !data) fail(error ?? {});
  usePublicPromos.getState().forget(storeId);
  return toPromo(data);
}

export async function updatePromoCode(id: string, storeId: string, patch: { active?: boolean; isPublic?: boolean }) {
  if (!supabase) return;
  const { error } = await supabase
    .from('promo_codes')
    .update({ ...(patch.active != null ? { active: patch.active } : {}), ...(patch.isPublic != null ? { is_public: patch.isPublic } : {}) })
    .eq('id', id);
  if (error) fail(error);
  usePublicPromos.getState().forget(storeId);
}

export async function deletePromoCode(id: string, storeId: string) {
  if (!supabase) return;
  const { error } = await supabase.from('promo_codes').delete().eq('id', id);
  if (error) fail(error);
  usePublicPromos.getState().forget(storeId);
}

/* ------------------------------------------------------------------- Client */

export interface PromoCheck {
  code: string;
  percent: number;
  discount: number;
}

/** Vérifie un code pour une boutique et un montant ; l'erreur explique le refus. */
export async function checkPromoCode(storeId: string, code: string, subtotal: number): Promise<PromoCheck> {
  if (!supabase) throw new Error('Codes promo indisponibles.');
  await ensureSession();
  const { data, error } = await supabase.rpc('check_promo_code', { p_store_id: storeId, p_code: cleanPromoCode(code), p_subtotal: Math.round(subtotal) });
  if (error || !data?.[0]) fail(error ?? {});
  return data[0];
}

/** Codes qu'une boutique affiche à ses clients (lus une fois, gardés en mémoire). */
export const usePublicPromos = create<{
  byStore: Record<string, PromoCode[]>;
  load: (storeId: string) => Promise<void>;
  forget: (storeId: string) => void;
}>((set, get) => ({
  byStore: {},
  load: async (storeId) => {
    if (!supabase || get().byStore[storeId]) return;
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_public', true)
      .eq('active', true)
      .order('percent', { ascending: false })
      .limit(5);
    if (error) return;
    set((s) => ({ byStore: { ...s.byStore, [storeId]: (data ?? []).map(toPromo).filter(promoUsable) } }));
  },
  forget: (storeId) =>
    set((s) => {
      const byStore = { ...s.byStore };
      delete byStore[storeId];
      return { byStore };
    }),
}));
