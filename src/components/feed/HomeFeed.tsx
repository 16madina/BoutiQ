import { FlashList, type ListRenderItemInfo, type ViewToken } from '@shopify/flash-list';
import { router } from 'expo-router';
import { PackageSearch, RefreshCw, WifiOff } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEMO_DATA, feedProducts, getCategory, getStore } from '@/api/catalog';
import { remoteStores, useRemoteCatalog } from '@/api/remoteCatalog';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { useMasonryMetrics } from '@/components/ProductMasonryGrid';
import { ProductRail } from '@/components/ProductRail';
import { MasonrySkeleton } from '@/components/ProductSkeleton';
import { SearchBar } from '@/components/SearchBar';
import { STORES } from '@/data/demo';
import { trackAd, useCampaigns } from '@/feed/campaigns';
import { composeFeed } from '@/feed/compose';
import { useFeedConfig } from '@/feed/config';
import type { FeedSection } from '@/feed/types';
import { usePaginatedProducts } from '@/hooks/usePaginatedProducts';
import { useHistory } from '@/store/useHistory';
import { useSeller } from '@/store/useSeller';
import { useShop } from '@/store/useShop';
import { colors, fonts, spacing, typography } from '@/theme';
import type { ProductQuery } from '@/types';

import { AsymmetricSection } from './AsymmetricSection';
import { CollectionCarouselSection } from './CollectionCarouselSection';
import { DealsSection } from './DealsSection';
import { EditorialBannerSection } from './EditorialBannerSection';
import { Appear } from './FeedHeader';
import { ProductGridSection } from './ProductGridSection';
import { SponsoredSection } from './SponsoredSection';
import { StoreDiscoverySection } from './StoreDiscoverySection';

const HOME_QUERY: ProductQuery = { sort: 'relevance' };

/** Une annonce compte comme « vue » quand elle est bien à l'écran, pas seulement chargée. */
const VIEWABILITY = { itemVisiblePercentThreshold: 60, minimumViewTime: 700 };

/** Ce que la personne aime et a regardé, figé à l'ouverture : le fil ne bouge pas sous le doigt. */
function readSignals() {
  const shop = useShop.getState();
  const history = useHistory.getState();
  return {
    favorites: shop.favorites,
    followed: shop.followedStores,
    history: { products: history.products, stores: history.stores, categories: history.categories },
  };
}

function Section({ section }: { section: FeedSection }) {
  switch (section.type) {
    case 'grid':
      return <ProductGridSection title={section.title} products={section.products} />;
    case 'collections':
      return <CollectionCarouselSection title={section.title} cards={section.cards} />;
    case 'sponsored':
      return <SponsoredSection campaign={section.campaign} product={section.product} store={section.store} flip={section.flip} />;
    case 'stores':
      return <StoreDiscoverySection title={section.title} layout={section.layout} stores={section.stores} />;
    case 'rail': {
      const link = section.link;
      return (
        <ProductRail
          title={section.title}
          subtitle={section.subtitle}
          products={section.products}
          actionLabel={link ? 'Voir tout' : undefined}
          onAction={
            link
              ? () => (link.storeId ? router.push({ pathname: '/store/[id]', params: { id: link.storeId } }) : router.push({ pathname: '/search', params: { category: link.category ?? '' } }))
              : undefined
          }
        />
      );
    }
    case 'deals':
      return <DealsSection title={section.title} subtitle={section.subtitle} products={section.products} />;
    case 'banner':
      return <EditorialBannerSection banner={section.banner} />;
    case 'asymmetric':
      return <AsymmetricSection products={section.products} flip={section.flip} />;
  }
}

/**
 * Fil d'accueil : une seule liste virtualisée de sections de formats variés,
 * chargée page par page. L'ordre vient des réglages (src/feed/config.ts).
 */
export function HomeFeed({ header, bottomInset }: { header: ReactElement; bottomInset: number }) {
  const insets = useSafeAreaInsets();
  const feed = usePaginatedProducts(HOME_QUERY);
  const config = useFeedConfig((s) => s.config);
  const loadConfig = useFeedConfig((s) => s.load);
  const campaigns = useCampaigns((s) => s.campaigns);
  const loadCampaigns = useCampaigns((s) => s.load);
  const syncedAt = useRemoteCatalog((s) => s.syncedAt);
  const ownSlug = useSeller((s) => s.store?.slug);
  const { columns, gap, cardWidth } = useMasonryMetrics();
  const [signals, setSignals] = useState(readSignals);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);
  // Les annonces se rattachent aux boutiques du catalogue : on les relit quand il arrive.
  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns, syncedAt]);

  const sections = useMemo(() => {
    const remote = remoteStores().filter((s) => s.id !== ownSlug);
    const ids = new Set(remote.map((s) => s.id));
    return composeFeed({
      products: feed.items,
      hasMore: feed.hasMore,
      config,
      campaigns,
      pool: feedProducts(),
      stores: [...remote, ...(DEMO_DATA ? STORES.filter((s) => !ids.has(s.id)) : [])],
      campaignStores: [ownSlug ? getStore(ownSlug) : undefined].filter((s): s is NonNullable<typeof s> => !!s),
      ...signals,
      categoryName: (id) => getCategory(id)?.name ?? id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.items, feed.hasMore, config, campaigns, signals, ownSlug, syncedAt]);

  // Une page peut ne pas suffire à remplir la section suivante : on demande alors la suite.
  const lastCount = useRef(-1);
  useEffect(() => {
    if (feed.status !== 'ready' || feed.loadingMore || !feed.hasMore) return;
    if (sections.length === lastCount.current) feed.loadMore();
    lastCount.current = sections.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.items.length, feed.loadingMore]);

  const refresh = useCallback(() => {
    setSignals(readSignals());
    loadConfig();
    loadCampaigns();
    feed.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.refresh, loadConfig, loadCampaigns]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<FeedSection>) => (
      // Les bandes de produits (rail) portent déjà leur marge du haut.
      <View style={item.type === 'rail' ? undefined : styles.section}>
        <Appear>
          <Section section={item} />
        </Appear>
      </View>
    ),
    [],
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<FeedSection>[] }) => {
    for (const token of viewableItems) {
      const section = token.item;
      if (token.isViewable && section?.type === 'sponsored') trackAd(section.campaign, 'impression');
    }
  }).current;

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y > 170;
    setStuck((prev) => (prev === next ? prev : next));
  }, []);

  const empty =
    feed.status === 'loading' ? (
      <View style={{ paddingHorizontal: spacing.screen - gap / 2, marginTop: spacing.xl }}>
        <MasonrySkeleton columns={columns} cardWidth={cardWidth} gap={gap} />
      </View>
    ) : feed.status === 'error' ? (
      <EmptyState compact icon={WifiOff} title="Connexion impossible" message={feed.error ?? 'Vérifiez votre connexion internet puis réessayez.'} actionLabel="Réessayer" onAction={feed.retry} />
    ) : (
      <EmptyState icon={PackageSearch} title="Aucun produit pour le moment" message="Revenez bientôt : nos vendeurs publient chaque jour." />
    );

  const footer = (
    <View style={styles.footer}>
      {feed.error && sections.length > 0 ? (
        <PressableScale onPress={feed.retry} style={styles.retry} accessibilityRole="button">
          <RefreshCw size={16} color={colors.cognac} strokeWidth={2} />
          <Text style={styles.retryText}>Erreur de chargement — Réessayer</Text>
        </PressableScale>
      ) : feed.hasMore && sections.length > 0 ? (
        <ActivityIndicator color={colors.caramel} />
      ) : sections.length > 0 ? (
        <Text style={styles.end}>Vous avez tout vu ✨</Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlashList
        data={sections}
        renderItem={renderItem}
        keyExtractor={(s) => s.id}
        getItemType={(s) => s.type}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        onEndReached={feed.loadMore}
        onEndReachedThreshold={0.8}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset }}
        refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={refresh} tintColor={colors.caramel} colors={[colors.caramel]} progressBackgroundColor={colors.surface} />}
      />
      {/* La recherche reste sous le pouce pendant le défilement. */}
      {stuck ? (
        <View style={[styles.sticky, { paddingTop: insets.top + 6 }]}>
          <SearchBar asButton />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  section: { marginTop: spacing.xl },
  sticky: { position: 'absolute', left: 0, right: 0, top: 0, paddingBottom: 10, backgroundColor: colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  footer: { paddingTop: spacing.xl, paddingBottom: spacing.lg, alignItems: 'center' },
  end: { ...typography.caption, paddingVertical: spacing.md },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.md },
  retryText: { fontFamily: fonts.medium, fontSize: 14, color: colors.cognac },
});
