import { useCampaigns } from '@/feed/campaigns';
import { useFeedConfig } from '@/feed/config';
import type { FeedConfig } from '@/feed/types';
import { supabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/database';

/**
 * Annonces sponsorisées : création par la boutique, validation par l'équipe, résultats.
 * Règles et droits dans supabase/migrations/20261113150000_home_feed_ads.sql.
 * Rien n'est facturé : le budget est seulement enregistré.
 */

type Row = Database['public']['Tables']['ad_campaigns']['Row'];
export type AdStatus = Row['status'];

export interface AdCampaign {
  id: string;
  /** Identifiant Supabase de la boutique. */
  storeId: string;
  storeName?: string;
  storeSlug?: string;
  kind: 'product' | 'store';
  productId?: string;
  headline: string;
  tagline?: string;
  cta: string;
  status: AdStatus;
  budget: number;
  startsAt: string;
  endsAt?: string;
  impressions: number;
  clicks: number;
  /** Ajouts au panier venus de l'annonce. */
  cartAdds: number;
  rejectionReason?: string;
  createdAt: string;
}

const toCampaign = (r: Row): AdCampaign => ({
  id: r.id,
  storeId: r.store_id,
  kind: r.kind === 'store' ? 'store' : 'product',
  productId: r.product_id ?? undefined,
  headline: r.headline,
  tagline: r.tagline ?? undefined,
  cta: r.cta,
  status: r.status,
  budget: r.budget,
  startsAt: r.starts_at,
  endsAt: r.ends_at ?? undefined,
  impressions: r.impressions,
  clicks: r.clicks,
  cartAdds: 0,
  rejectionReason: r.rejection_reason ?? undefined,
  createdAt: r.created_at,
});

function fail(error: { code?: string; message?: string }): never {
  if (error.code === 'P0001' && error.message) throw new Error(error.message);
  if (error.code === '42501') throw new Error('Ce compte n’est pas autorisé à faire cela.');
  if (error.code === 'PGRST202' || error.code === 'PGRST205' || error.code === '42P01') throw new Error('Les annonces ne sont pas encore activées.');
  throw new Error('Action impossible pour le moment. Vérifiez votre connexion.');
}

/** Une annonce « active » dont la date de fin est passée n'est plus diffusée. */
export const adIsOver = (c: Pick<AdCampaign, 'status' | 'endsAt'>) => c.status === 'ended' || (c.status === 'active' && !!c.endsAt && new Date(c.endsAt).getTime() <= Date.now());

export const AD_STATUS: Record<AdStatus | 'over', { label: string; bg: 'tint' | 'successBg' | 'dangerBg' | 'neutralBg'; fg: 'cognac' | 'success' | 'promo' | 'neutralText' }> = {
  pending_review: { label: 'En attente de validation', bg: 'tint', fg: 'cognac' },
  active: { label: 'En ligne', bg: 'successBg', fg: 'success' },
  paused: { label: 'En pause', bg: 'neutralBg', fg: 'neutralText' },
  rejected: { label: 'Refusée', bg: 'dangerBg', fg: 'promo' },
  ended: { label: 'Terminée', bg: 'neutralBg', fg: 'neutralText' },
  over: { label: 'Terminée', bg: 'neutralBg', fg: 'neutralText' },
};

async function withCartAdds(list: AdCampaign[]): Promise<AdCampaign[]> {
  if (!supabase || list.length === 0) return list;
  const { data } = await supabase
    .from('ad_events')
    .select('campaign_id')
    .eq('kind', 'add_to_cart')
    .in('campaign_id', list.map((c) => c.id))
    .limit(2000);
  const counts = new Map<string, number>();
  for (const e of data ?? []) counts.set(e.campaign_id, (counts.get(e.campaign_id) ?? 0) + 1);
  return list.map((c) => ({ ...c, cartAdds: counts.get(c.id) ?? 0 }));
}

/* ------------------------------------------------------------------ Boutique */

export async function fetchMyCampaigns(storeId: string): Promise<AdCampaign[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('ad_campaigns').select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(50);
  if (error) fail(error);
  return withCartAdds((data ?? []).map(toCampaign));
}

export interface NewCampaign {
  kind: 'product' | 'store';
  productId?: string;
  headline: string;
  tagline?: string;
  /** Durée de diffusion en jours ; elle démarre quand l'équipe valide l'annonce. */
  days: number;
  /** Budget indicatif (rien n'est prélevé). */
  budget?: number;
}

export async function createCampaign(storeId: string, input: NewCampaign) {
  if (!supabase) throw new Error('Annonces indisponibles.');
  const now = Date.now();
  const { error } = await supabase.from('ad_campaigns').insert({
    store_id: storeId,
    kind: input.kind,
    product_id: input.kind === 'product' ? (input.productId ?? null) : null,
    headline: input.headline.trim(),
    tagline: input.tagline?.trim() || null,
    cta: input.kind === 'store' ? 'Visiter la boutique' : 'Découvrir',
    budget: input.budget ?? 0,
    starts_at: new Date(now).toISOString(),
    ends_at: new Date(now + input.days * 86_400_000).toISOString(),
  });
  if (error) fail(error);
}

export async function deleteCampaign(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from('ad_campaigns').delete().eq('id', id);
  if (error) fail(error);
  useCampaigns.getState().load();
}

/* -------------------------------------------------------------------- Équipe */

/** Annonces d'un statut, toutes boutiques confondues (réservé à la modération). */
export async function fetchCampaignsToReview(status: AdStatus): Promise<AdCampaign[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('ad_campaigns').select('*').eq('status', status).order('created_at', { ascending: false }).limit(100);
  if (error) fail(error);
  const list = (data ?? []).map(toCampaign);
  if (list.length === 0) return list;
  const { data: stores } = await supabase.from('stores').select('id, name, slug').in('id', [...new Set(list.map((c) => c.storeId))]);
  const byId = new Map((stores ?? []).map((s) => [s.id, s]));
  return withCartAdds(list.map((c) => ({ ...c, storeName: byId.get(c.storeId)?.name, storeSlug: byId.get(c.storeId)?.slug })));
}

export async function reviewCampaign(id: string, status: AdStatus, reason?: string) {
  if (!supabase) return;
  const { error } = await supabase.rpc('admin_review_campaign', { p_campaign_id: id, p_status: status, p_reason: reason });
  if (error) fail(error);
  useCampaigns.getState().load();
}

/** Enregistre les réglages du fil d'accueil pour toute l'application (réservé à la modération). */
export async function saveFeedConfig(config: FeedConfig) {
  if (!supabase) return;
  const { error } = await supabase.from('app_config').upsert({ key: 'home_feed', value: config as unknown as Json, updated_at: new Date().toISOString() });
  if (error) fail(error);
  await useFeedConfig.getState().load();
}
