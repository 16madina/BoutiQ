import { create } from 'zustand';

import { DEMO_DATA } from '@/api/catalog';
import { remoteProducts, remoteStores } from '@/api/remoteCatalog';
import { supabase } from '@/lib/supabase';

import type { Campaign } from './types';

/**
 * Annonces sponsorisées de l'accueil.
 * Les vraies campagnes viennent de Supabase (table ad_campaigns, statut « active »).
 * Les annonces d'exemple ci-dessous n'existent qu'avec le catalogue de démonstration :
 * elles portent la mention « exemple » et ne sont jamais comptées.
 */
const DEMO_CAMPAIGNS: Campaign[] = [
  { id: 'demo-sac', kind: 'product', storeId: 'elegance-ci', productId: 'sac-cuir', headline: 'Le sac signature de la saison', tagline: 'Cuir pleine fleur, fait main.', cta: 'Découvrir', demo: true },
  { id: 'demo-maison', kind: 'store', storeId: 'maison-moderne', headline: 'Un salon chaleureux, sans se ruiner', tagline: 'Canapés, fauteuils et luminaires.', cta: 'Visiter la boutique', demo: true },
  { id: 'demo-tech', kind: 'product', storeId: 'tech-zone', productId: 'smartphone', headline: 'Smartphone 128 Go, garanti 12 mois', tagline: 'Double SIM, livré en 24 h.', cta: 'Découvrir', demo: true },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const useCampaigns = create<{ campaigns: Campaign[]; load: () => Promise<void> }>((set) => ({
  campaigns: DEMO_DATA ? DEMO_CAMPAIGNS : [],
  load: async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('ad_campaigns')
      .select('id, kind, store_id, product_id, headline, tagline, cta')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return;
    // Une campagne n'est gardée que si sa boutique (et son produit) sont visibles dans le catalogue.
    const stores = remoteStores();
    const products = new Set(remoteProducts().map((p) => p.id));
    const real: Campaign[] = (data ?? []).flatMap((c) => {
      const store = stores.find((s) => s.remoteId === c.store_id);
      if (!store) return [];
      if (c.kind === 'product' && (!c.product_id || !products.has(c.product_id))) return [];
      return [{ id: c.id, kind: c.kind === 'store' ? 'store' : 'product', storeId: store.id, productId: c.product_id ?? undefined, headline: c.headline, tagline: c.tagline ?? undefined, cta: c.cta }];
    });
    set({ campaigns: [...real, ...(DEMO_DATA ? DEMO_CAMPAIGNS : [])] });
  },
}));

export type AdEvent = 'impression' | 'click' | 'store_visit' | 'add_to_cart' | 'order';

const seen = new Set<string>();

/**
 * Enregistre un affichage réel ou un clic. Les annonces d'exemple ne sont pas comptées.
 * Un affichage n'est envoyé qu'une fois par annonce et par ouverture de l'application.
 */
export function trackAd(campaign: Pick<Campaign, 'id' | 'demo'>, kind: AdEvent) {
  if (campaign.demo || !supabase || !UUID.test(campaign.id)) return;
  if (kind === 'impression') {
    if (seen.has(campaign.id)) return;
    seen.add(campaign.id);
  }
  supabase.rpc('track_ad_event', { p_campaign_id: campaign.id, p_kind: kind }).then(
    () => {},
    () => {},
  );
}
