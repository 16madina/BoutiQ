import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, SearchX, Share2 } from 'lucide-react-native';
import type { FlashListRef } from '@shopify/flash-list';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { storefrontProducts } from '@/api/catalog';
import { useRemoteCatalog } from '@/api/remoteCatalog';
import { recordRemoteView } from '@/api/sellerSync';
import { getStorefront, getStorefrontSections } from '@/api/storefront';
import { CircleIconButton } from '@/components/CircleIconButton';
import { EmptyState } from '@/components/EmptyState';
import { ProductMasonryGrid } from '@/components/ProductMasonryGrid';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  activeFilterCount,
  DEFAULT_STORE_FILTERS,
  StoreFilterBar,
  StoreFilterSheet,
  StoreSearchField,
  type StoreFilters,
} from '@/components/storefront/StoreCatalogFilters';
import { StoreContactSheet, StoreShareSheet } from '@/components/storefront/StoreContactShare';
import { StoreHero } from '@/components/storefront/StoreHero';
import { StoreSectionTitle } from '@/components/storefront/StoreSections';
import { StorefrontBody } from '@/components/storefront/StorefrontBody';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePaginatedProducts } from '@/hooks/usePaginatedProducts';
import { useScreenStatusBar } from '@/hooks/useScreenStatusBar';
import { PRICE_RANGES } from '@/store/useShop';
import { useSeller } from '@/store/useSeller';
import { colors, fonts, spacing } from '@/theme';
import type { Product, ProductQuery } from '@/types';
import type { StorefrontCollection } from '@/types/storefront';

/**
 * Vitrine publique d'une boutique : bannière, identité, actions, collections,
 * Coups de cœur, Nouveautés, Promotions, puis le catalogue complet (Masonry)
 * avec recherche et filtres limités à la boutique.
 */
export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // La vitrine se met à jour quand le vendeur modifie sa boutique sur l'appareil.
  const ownStore = useSeller((s) => s.store);
  const ownProducts = useSeller((s) => s.products);
  const remoteSyncedAt = useRemoteCatalog((s) => s.syncedAt);
  // getStorefront lit la boutique locale et le catalogue Supabase : on recalcule quand ils changent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sf = useMemo(() => getStorefront(id), [id, ownStore, ownProducts, remoteSyncedAt]);
  const sections = useMemo(() => (sf ? getStorefrontSections(sf) : null), [sf]);

  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const [collection, setCollection] = useState<StorefrontCollection | null>(null);
  const [filters, setFilters] = useState<StoreFilters>(DEFAULT_STORE_FILTERS);
  const [sheet, setSheet] = useState<'contact' | 'share' | 'filters' | null>(null);

  // Défilement : « Explorer », la loupe et « Voir tout » mènent au catalogue ;
  // les boutons flottants n'apparaissent qu'une fois la barre du haut sortie de l'écran.
  const listRef = useRef<FlashListRef<Product>>(null);
  const catalogY = useRef(0);
  const [scrolled, setScrolled] = useState(false);
  // La photo sombre est encore sous la barre d'état tant qu'on n'a pas dépassé la bannière.
  const [pastHero, setPastHero] = useState(false);
  // Beauté, Électronique et Alimentation n'ont pas de barre en haut : boutons flottants toujours visibles.
  const layout = sf?.template.heroLayout;
  const showFloating = scrolled || layout === 'centered' || layout === 'stacked' || layout === 'inset';
  // Heure et batterie en blanc sur les bannières photo sombres (Mode, Beauté, Électronique).
  const darkTop = layout === 'overlay' || layout === 'centered' || layout === 'stacked';
  useScreenStatusBar(darkTop && !pastHero ? 'light' : 'dark');
  // Bande claire derrière l'heure et la batterie dès que le contenu passe dessous.
  const showStatusBackdrop = darkTop ? pastHero : scrolled;
  const backdropStyle = useAnimatedStyle(() => ({ opacity: withTiming(showStatusBackdrop ? 1 : 0, { duration: 180 }) }), [showStatusBackdrop]);
  const floatingStyle = useAnimatedStyle(() => ({ opacity: withTiming(showFloating ? 1 : 0, { duration: 180 }) }), [showFloating]);
  const goToCatalog = () => listRef.current?.scrollToOffset({ offset: Math.max(catalogY.current - insets.top - 56, 0), animated: true });

  const productQuery = useMemo<ProductQuery>(() => {
    const range = PRICE_RANGES[filters.priceRange];
    return {
      storeId: sf?.store.id ?? id,
      storefront: true,
      query: query || undefined,
      collection: collection && !collection.productKeys ? collection.name : undefined,
      productKeys: collection?.productKeys,
      categoryId: filters.categoryId,
      onlyPromo: filters.onlyPromo || undefined,
      inStockOnly: filters.inStockOnly || undefined,
      priceMin: range.min,
      priceMax: range.max,
      sort: filters.sort,
    };
  }, [sf?.store.id, id, query, collection, filters]);

  const feed = usePaginatedProducts(productQuery);
  const resultCount = useMemo(() => storefrontProducts(productQuery).length, [productQuery]);

  // Statistique « vues » de la vitrine (hors consultation par le vendeur lui-même).
  const recordStoreView = useSeller((s) => s.recordStoreView);
  const space = useSeller((s) => s.space);
  useEffect(() => {
    if (sf?.isOwn && space === 'buyer') recordStoreView();
  }, [sf?.isOwn, space, recordStoreView]);
  // Vitrine réelle d'un autre vendeur : la visite compte dans ses statistiques.
  const remoteStoreId = sf && !sf.isOwn ? sf.store.remoteId : undefined;
  useEffect(() => {
    if (remoteStoreId) recordRemoteView(remoteStoreId).catch(() => {});
  }, [remoteStoreId]);

  if (!sf || !sections) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Boutique" />
        <EmptyState icon={SearchX} title="Boutique introuvable" actionLabel="Retour" onAction={() => router.back()} />
      </View>
    );
  }

  const { template, palette } = sf;
  const filtering = !!query || !!collection || activeFilterCount(filters) > 0;
  const clearAll = () => {
    setSearch('');
    setCollection(null);
    setFilters(DEFAULT_STORE_FILTERS);
  };

  const empty = sections.total === 0;
  const header = (
    <View>
      <StoreHero
        sf={sf}
        width={width}
        topInset={insets.top}
        onContact={() => setSheet('contact')}
        onShare={() => setSheet('share')}
        onExplore={goToCatalog}
      />

      <StorefrontBody
        sf={sf}
        sections={sections}
        width={width}
        filtering={filtering}
        selectedCollectionId={collection?.id}
        onSelectCollection={setCollection}
        onContact={() => setSheet('contact')}
        onSeeAll={(section) => {
          if (section === 'deals') setFilters({ ...DEFAULT_STORE_FILTERS, onlyPromo: true });
          goToCatalog();
        }}
      />

      {!empty && (
        <View style={styles.catalog} onLayout={(e) => (catalogY.current = e.nativeEvent.layout.y)}>
          <StoreSectionTitle
            kicker={template.copy.catalog[0]}
            title={collection ? collection.name : template.copy.catalog[1]}
            template={template}
            palette={palette}
            right={
              <Text style={styles.count}>
                {resultCount} article{resultCount > 1 ? 's' : ''}
              </Text>
            }
          />
          <StoreSearchField value={search} onChange={setSearch} storeName={sf.store.name} palette={palette} />
          <StoreFilterBar
            filters={filters}
            onChange={setFilters}
            categories={sf.categories}
            palette={palette}
            onOpenSheet={() => setSheet('filters')}
          />
          {filtering && (
            <Text style={[styles.clear, { color: palette.accentInk }]} onPress={clearAll} accessibilityRole="button">
              Effacer la recherche et les filtres
            </Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProductMasonryGrid
        items={feed.items}
        status={feed.status}
        error={feed.error}
        loadingMore={feed.loadingMore}
        hasMore={feed.hasMore}
        refreshing={feed.refreshing}
        onRefresh={feed.refresh}
        onEndReached={feed.loadMore}
        onRetry={feed.retry}
        ListHeaderComponent={header}
        bottomInset={insets.bottom + 32}
        listRef={listRef}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          if (y > 90 !== scrolled) setScrolled(y > 90);
          const beyond = y > width * (sf?.template.heroRatio ?? 1) * 0.9;
          if (beyond !== pastHero) setPastHero(beyond);
        }}
        emptyComponent={
          // Boutique sans produit : l'état vide élégant est déjà dans les sections.
          empty ? null : (
            <EmptyState
              compact
              icon={SearchX}
              title="Aucun article ne correspond"
              message="Essayez un autre mot ou retirez un filtre."
              actionLabel="Tout afficher"
              onAction={clearAll}
            />
          )
        }
      />

      <Animated.View style={[styles.statusBackdrop, { height: insets.top }, backdropStyle]} pointerEvents="none" />
      <Animated.View style={[styles.topBar, { top: insets.top + 6 }, floatingStyle]} pointerEvents={showFloating ? 'box-none' : 'none'}>
        <CircleIconButton variant="glass" size={42} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Retour">
          <ChevronLeft size={22} strokeWidth={1.9} color={colors.text} />
        </CircleIconButton>
        <CircleIconButton variant="glass" size={42} onPress={() => setSheet('share')} accessibilityLabel="Partager la boutique">
          <Share2 size={19} strokeWidth={1.8} color={colors.text} />
        </CircleIconButton>
      </Animated.View>

      <StoreContactSheet sf={sf} visible={sheet === 'contact'} onClose={() => setSheet(null)} />
      <StoreShareSheet sf={sf} visible={sheet === 'share'} onClose={() => setSheet(null)} />
      <StoreFilterSheet
        visible={sheet === 'filters'}
        onClose={() => setSheet(null)}
        filters={filters}
        onChange={setFilters}
        categories={sf.categories}
        palette={palette}
        resultCount={resultCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  catalog: { gap: 12, paddingTop: 20, paddingBottom: 14 },
  count: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.textSecondary, paddingBottom: 3 },
  clear: { fontFamily: fonts.semibold, fontSize: 14, paddingHorizontal: spacing.screen, paddingVertical: 4 },
  statusBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(250,246,240,0.96)' },
  topBar: { position: 'absolute', left: spacing.screen, right: spacing.screen, flexDirection: 'row', justifyContent: 'space-between' },
});
