import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import type { CategoryId } from '@/types';

import type { EditorialBanner, FeedConfig, FeedSlot, SlotKind } from './types';

/**
 * Réglages du fil d'accueil.
 * Valeurs par défaut ci-dessous ; l'équipe peut les remplacer sans nouvelle version de
 * l'application en écrivant la ligne « home_feed » de la table app_config (Supabase).
 */
export const DEFAULT_FEED_CONFIG: FeedConfig = {
  adInterval: 20,
  adMaxPerCampaign: 2,
  slots: [
    { kind: 'grid', count: 6 },
    { kind: 'collections' },
    { kind: 'grid', count: 8 },
    { kind: 'stores' },
    { kind: 'recommendations' },
    { kind: 'asymmetric' },
    { kind: 'deals' },
    { kind: 'grid', count: 8 },
    { kind: 'banner' },
    { kind: 'recent' },
    { kind: 'asymmetric' },
    { kind: 'stores' },
    { kind: 'grid', count: 6 },
    { kind: 'recommendations' },
  ],
  disabled: [],
  featuredCategories: [],
};

const SLOT_KINDS: SlotKind[] = ['grid', 'collections', 'stores', 'recommendations', 'recent', 'asymmetric', 'deals', 'banner'];
const CATEGORY_IDS: CategoryId[] = ['mode', 'electronique', 'maison', 'beaute', 'alimentation', 'sport'];

const int = (v: unknown, min: number, max: number, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(Math.round(v), min), max) : fallback);

/** Réglages venus de la base : tout ce qui est absent ou invalide garde sa valeur par défaut. */
export function sanitizeFeedConfig(raw: unknown): FeedConfig {
  const d = DEFAULT_FEED_CONFIG;
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  const slots = Array.isArray(r.slots)
    ? (r.slots as unknown[])
        .map((s): FeedSlot | null => {
          const kind = (s as { kind?: unknown })?.kind;
          if (!SLOT_KINDS.includes(kind as SlotKind)) return null;
          return { kind: kind as SlotKind, count: int((s as { count?: unknown }).count, 2, 12, 6) };
        })
        .filter((s): s is FeedSlot => !!s)
        .slice(0, 40)
    : d.slots;
  return {
    adInterval: int(r.adInterval, 6, 200, d.adInterval),
    adMaxPerCampaign: int(r.adMaxPerCampaign, 1, 10, d.adMaxPerCampaign),
    // Sans grille, le fil ne pourrait plus avancer : on revient alors à l'ordre par défaut.
    slots: slots.some((s) => s.kind === 'grid') ? slots : d.slots,
    disabled: Array.isArray(r.disabled) ? (r.disabled as unknown[]).filter((k): k is SlotKind | 'sponsored' => k === 'sponsored' || SLOT_KINDS.includes(k as SlotKind)) : d.disabled,
    featuredCategories: Array.isArray(r.featuredCategories) ? (r.featuredCategories as unknown[]).filter((c): c is CategoryId => CATEGORY_IDS.includes(c as CategoryId)) : d.featuredCategories,
  };
}

export const useFeedConfig = create<{ config: FeedConfig; load: () => Promise<void> }>((set) => ({
  config: DEFAULT_FEED_CONFIG,
  load: async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('app_config').select('value').eq('key', 'home_feed').maybeSingle();
    if (!error && data) set({ config: sanitizeFeedConfig(data.value) });
  },
}));

/** Bannières éditoriales (photos des catégories). Chacune ne passe qu'une fois dans le fil. */
export const EDITORIAL_BANNERS: EditorialBanner[] = [
  { id: 'createurs', kicker: 'Fait ici', title: 'Découvrez les\ncréateurs africains', cta: 'Voir la mode', photoId: '1572804013309-59a88b7e92f1', link: { category: 'mode' } },
  { id: 'local', kicker: 'Près de chez vous', title: 'Soutenez les\ncommerces locaux', cta: 'Voir les boutiques', photoId: '1610832958506-aa56368176cf', link: { view: 'stores' } },
  { id: 'maison', kicker: 'Décoration', title: 'Tout pour\nvotre maison', cta: 'Explorer', photoId: '1555041469-a586c61ea9bc', link: { category: 'maison' } },
  { id: 'beaute', kicker: 'Bien-être', title: 'Les essentiels\nbeauté', cta: 'Découvrir', photoId: '1588405748880-12d1d2a59f75', link: { category: 'beaute' } },
];
