import { discountPercent } from '@/utils/format';
import type { CategoryId, Product, Store } from '@/types';

import { EDITORIAL_BANNERS } from './config';
import type { Campaign, CollectionCard, FeedConfig, FeedSection } from './types';

/**
 * Compose le fil d'accueil : une suite de sections de formats variés.
 *
 * - Les grilles consomment les produits « organiques » chargés page par page.
 * - Les autres sections (collections, boutiques, recommandations, offres, bannières)
 *   piochent dans le catalogue visible et ne passent qu'un nombre limité de fois.
 * - Une annonce sponsorisée s'insère après `adInterval` produits affichés, jamais deux
 *   de suite, et chaque campagne au plus `adMaxPerCampaign` fois.
 *
 * La fonction est pure et stable : ajouter des produits à la fin ne change pas les
 * sections déjà construites (rien ne saute à l'écran pendant le défilement).
 */

export interface FeedInput {
  /** Produits chargés jusqu'ici (fil paginé). */
  products: Product[];
  /** D'autres produits restent à charger. */
  hasMore: boolean;
  config: FeedConfig;
  campaigns: Campaign[];
  /** Catalogue visible, chaque produit une seule fois (sections thématiques). */
  pool: Product[];
  stores: Store[];
  /** Boutiques connues seulement pour retrouver celle d'une annonce (ex. sa propre boutique). */
  campaignStores?: Store[];
  favorites: Record<string, true>;
  followed: Record<string, true>;
  history: { products: string[]; stores: string[]; categories: Partial<Record<CategoryId, number>> };
  categoryName: (id: CategoryId) => string;
}

const COLLECTION_TITLES: Record<CategoryId, string> = {
  mode: 'Mode et accessoires',
  electronique: 'Électronique',
  maison: 'Maison et décoration',
  beaute: 'Beauté et bien-être',
  alimentation: 'Alimentation',
  sport: 'Sport et loisirs',
};

const GRID_TITLES = ['Tendances du moment', 'À découvrir', 'Sélection du jour'];

const isPromo = (p: Product) => discountPercent(p.price, p.oldPrice) != null;
const popularity = (p: Product) => p.reviewsCount * (p.rating || 1);

export function composeFeed(input: FeedInput): FeedSection[] {
  const { products, hasMore, config, campaigns, pool, stores, favorites, followed, history, categoryName } = input;
  const off = new Set(config.disabled);
  const sections: FeedSection[] = [];
  const byId = new Map(pool.map((p) => [p.id, p]));
  const storeById = new Map([...(input.campaignStores ?? []), ...stores].map((s) => [s.id, s]));

  let cursor = 0; // prochain produit organique
  let sinceAd = 0; // produits affichés depuis la dernière annonce
  let adIndex = 0;
  const adCount = new Map<string, number>();
  let lastAd: string | null = null;
  const counters: Record<string, number> = {};
  const next = (key: string) => (counters[key] = (counters[key] ?? 0) + 1) - 1;
  /** Produits déjà mis en avant dans une section thématique (pour varier). */
  const featured = new Set<string>();
  const shownStores = new Set<string>();
  let recentDone = false;

  const fresh = (list: Product[], n: number, min = 3) => {
    const picked = list.filter((p) => !featured.has(p.id)).slice(0, n);
    if (picked.length < min) return null;
    picked.forEach((p) => featured.add(p.id));
    return picked;
  };

  const push = (section: FeedSection, shown: number) => {
    sections.push(section);
    sinceAd += shown;
    maybeAd();
  };

  function maybeAd() {
    if (off.has('sponsored') || campaigns.length === 0 || sinceAd < config.adInterval) return;
    if (sections[sections.length - 1]?.type === 'sponsored') return;
    // Campagne suivante : pas celle qui vient de passer si une autre est possible, et pas au-delà du plafond.
    for (let tries = 0; tries < campaigns.length; tries++) {
      const c = campaigns[(adIndex + tries) % campaigns.length];
      if ((adCount.get(c.id) ?? 0) >= config.adMaxPerCampaign) continue;
      if (c.id === lastAd && campaigns.length > 1) continue;
      const store = storeById.get(c.storeId);
      const product = c.productId ? byId.get(c.productId) : undefined;
      if (!store || (c.kind === 'product' && !product)) continue;
      const n = next('sponsored');
      sections.push({ type: 'sponsored', id: `sponsored-${n}`, campaign: c, product, store, flip: n % 2 === 1 });
      adCount.set(c.id, (adCount.get(c.id) ?? 0) + 1);
      adIndex = (adIndex + tries + 1) % campaigns.length;
      lastAd = c.id;
      sinceAd = 0;
      return;
    }
  }

  /** Prend `count` produits organiques ; `null` s'il faut attendre la page suivante. */
  const take = (count: number, min: number): Product[] | null => {
    const left = products.length - cursor;
    if (left <= 0) return null;
    if (left < count && hasMore) return null;
    if (left < min) return null;
    const slice = products.slice(cursor, cursor + count);
    cursor += slice.length;
    return slice;
  };

  const collections = (): FeedSection | null => {
    const n = next('collections');
    if (n > 1) return null;
    const cats = [...new Set([...config.featuredCategories, ...(Object.keys(COLLECTION_TITLES) as CategoryId[])])];
    const cards: CollectionCard[] = [];
    const promo = pool.filter(isPromo).sort((a, b) => (discountPercent(b.price, b.oldPrice) ?? 0) - (discountPercent(a.price, a.oldPrice) ?? 0));
    if (n === 0 && promo.length >= 4) cards.push({ id: 'promo', title: 'Offres à découvrir', products: promo.slice(0, 4), link: { promo: true }, showDiscount: true });
    for (const cat of cats) {
      const items = pool.filter((p) => p.categoryId === cat).sort((a, b) => popularity(b) - popularity(a));
      // Deuxième passage : les produits suivants de chaque catégorie.
      const four = items.slice(n * 4, n * 4 + 4);
      if (four.length === 4) cards.push({ id: `${cat}-${n}`, title: COLLECTION_TITLES[cat] ?? categoryName(cat), products: four, link: { category: cat }, showDiscount: false });
    }
    if (cards.length === 0) return null;
    return { type: 'collections', id: `collections-${n}`, title: n === 0 ? 'Collections à explorer' : 'Encore plus de rayons', cards: cards.slice(0, 6) };
  };

  const storesSection = (): FeedSection | null => {
    const n = next('stores');
    const layout = (['carousel', 'feature', 'pair'] as const)[n % 3];
    if (n > 2) return null;
    const ranked = [...stores].sort((a, b) => Number(!!followed[b.id]) - Number(!!followed[a.id]) || Number(b.verified) - Number(a.verified) || b.followers - a.followers);
    const pick = (count: number, min: number) => {
      const list = ranked.filter((s) => !shownStores.has(s.id)).slice(0, count);
      if (list.length < min) return null;
      list.forEach((s) => shownStores.add(s.id));
      return list;
    };
    if (layout === 'carousel') {
      const list = pick(8, 2);
      return list && { type: 'stores', id: `stores-${n}`, title: 'Boutiques à découvrir', layout, stores: list };
    }
    if (layout === 'feature') {
      const list = pick(1, 1);
      return list && { type: 'stores', id: `stores-${n}`, title: 'La boutique à l’honneur', layout, stores: list };
    }
    const list = pick(2, 2);
    return list && { type: 'stores', id: `stores-${n}`, title: 'D’autres boutiques à visiter', layout, stores: list };
  };

  const recommendations = (): FeedSection | null => {
    const n = next('recommendations');
    const seen = new Set(history.products);
    const topCats = (Object.entries(history.categories) as [CategoryId, number][]).sort((a, b) => b[1] - a[1]).map(([c]) => c);
    const favCats = [...new Set(Object.keys(favorites).map((id) => byId.get(id)?.categoryId).filter((c): c is CategoryId => !!c))];
    const lastStore = history.stores.map((id) => storeById.get(id)).find(Boolean);
    const followedIds = Object.keys(followed);
    const popular = [...pool].sort((a, b) => popularity(b) - popularity(a));

    const variants: (() => FeedSection | null)[] = [
      () => {
        if (topCats.length === 0) return null;
        const list = fresh(pool.filter((p) => topCats.slice(0, 2).includes(p.categoryId) && !seen.has(p.id)), 10);
        return list && { type: 'rail', id: `reco-${n}`, title: 'Pour vous', subtitle: 'D’après ce que vous avez regardé', products: list };
      },
      () => {
        if (!lastStore) return null;
        const list = fresh(pool.filter((p) => p.storeId === lastStore.id && !seen.has(p.id)), 10);
        return list && { type: 'rail', id: `reco-${n}`, title: `Parce que vous avez consulté ${lastStore.name}`, products: list, link: { storeId: lastStore.id } };
      },
      () => {
        if (followedIds.length === 0) return null;
        const list = fresh(pool.filter((p) => followed[p.storeId]), 10);
        return list && { type: 'rail', id: `reco-${n}`, title: 'De vos boutiques préférées', subtitle: 'Les boutiques que vous suivez', products: list };
      },
      () => {
        if (favCats.length === 0) return null;
        const list = fresh(pool.filter((p) => favCats.includes(p.categoryId) && !favorites[p.id]), 10);
        return list && { type: 'rail', id: `reco-${n}`, title: 'Vous pourriez aimer', subtitle: 'Proche de vos favoris', products: list };
      },
      () => {
        const list = fresh(popular, 10);
        return list && { type: 'rail', id: `reco-${n}`, title: 'Populaires en ce moment', subtitle: 'Les articles les mieux notés', products: list };
      },
    ];
    // Chaque passage essaie la variante suivante, puis les autres.
    for (let i = 0; i < variants.length; i++) {
      const section = variants[(n + i) % variants.length]();
      if (section) return section;
    }
    return null;
  };

  const recent = (): FeedSection | null => {
    if (recentDone) return null;
    const list = history.products.map((id) => byId.get(id)).filter((p): p is Product => !!p).slice(0, 10);
    if (list.length < 2) return null;
    recentDone = true;
    return { type: 'rail', id: 'recent', title: 'Récemment consultés', subtitle: 'Reprenez là où vous en étiez', products: list };
  };

  const deals = (): FeedSection | null => {
    const n = next('deals');
    if (n === 0) {
      const list = fresh([...pool].filter((p) => p.price <= 15000 && (p.stock ?? 1) > 0).sort((a, b) => a.price - b.price), 10);
      return list && { type: 'deals', id: 'deals-0', title: 'Les petits prix', subtitle: 'Moins de 15 000 FCFA', products: list };
    }
    if (n === 1) {
      const list = fresh(pool.filter(isPromo).sort((a, b) => (discountPercent(b.price, b.oldPrice) ?? 0) - (discountPercent(a.price, a.oldPrice) ?? 0)), 10);
      return list && { type: 'deals', id: 'deals-1', title: 'Les plus fortes remises', products: list };
    }
    return null;
  };

  const banner = (): FeedSection | null => {
    const n = next('banner');
    const b = EDITORIAL_BANNERS[n];
    if (!b) return null;
    // Une bannière ne mène jamais vers un rayon vide.
    if (b.link.category && !pool.some((p) => p.categoryId === b.link.category)) return banner();
    return { type: 'banner', id: `banner-${b.id}`, banner: b };
  };

  const slots = config.slots.filter((s) => !off.has(s.kind));
  // Sécurité : on s'arrête dès qu'un tour complet n'a rien ajouté.
  for (let round = 0; round < 200; round++) {
    const before = sections.length;
    let blocked = false;
    for (const slot of slots) {
      if (slot.kind === 'grid') {
        const count = slot.count ?? 6;
        const items = take(count, 1);
        if (!items) {
          blocked = true;
          break;
        }
        const n = next('grid');
        push({ type: 'grid', id: `grid-${n}`, title: GRID_TITLES[n], products: items }, items.length);
      } else if (slot.kind === 'asymmetric') {
        const items = take(3, 3);
        if (!items) {
          // Pas assez de produits pour ce format : on laisse la place à la grille suivante.
          if (products.length - cursor <= 0 || (products.length - cursor < 3 && hasMore)) {
            blocked = true;
            break;
          }
          continue;
        }
        const n = next('asymmetric');
        push({ type: 'asymmetric', id: `asymmetric-${n}`, products: items, flip: n % 2 === 1 }, 3);
      } else {
        const section =
          slot.kind === 'collections' ? collections() : slot.kind === 'stores' ? storesSection() : slot.kind === 'recommendations' ? recommendations() : slot.kind === 'recent' ? recent() : slot.kind === 'deals' ? deals() : banner();
        // Jamais deux sections du même format à la suite.
        if (section && sections[sections.length - 1]?.type !== section.type) {
          push(section, section.type === 'banner' || section.type === 'stores' ? 0 : 4);
        }
      }
    }
    if (blocked || sections.length === before) break;
  }
  return sections;
}
