import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, SearchX, Share2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { storefrontProducts } from '@/api/catalog';
import { useRemoteCatalog } from '@/api/remoteCatalog';
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
import { CollectionShowcase, ProductRail, StoreSectionTitle } from '@/components/storefront/StoreSections';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePaginatedProducts } from '@/hooks/usePaginatedProducts';
import { PRICE_RANGES } from '@/store/useShop';
import { useSeller } from '@/store/useSeller';
import { colors, fonts, spacing } from '@/theme';
import type { ProductQuery } from '@/types';
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

  const header = (
    <View>
      <StoreHero sf={sf} width={width} topInset={insets.top} onContact={() => setSheet('contact')} onShare={() => setSheet('share')} />

      <View style={styles.sections}>
        {!filtering && sections.featured.length > 0 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <StoreSectionTitle kicker="Sélection de la boutique" title="Coups de cœur" template={template} palette={palette} />
            <ProductRail products={sections.featured} template={template} palette={palette} size="lg" />
          </Animated.View>
        )}

        {sf.collections.length > 0 && (
          <View>
            <StoreSectionTitle kicker="Collections" title="Explorer la boutique" template={template} palette={palette} />
            <CollectionShowcase
              collections={sf.collections}
              template={template}
              palette={palette}
              selectedId={collection?.id}
              onSelect={setCollection}
            />
          </View>
        )}

        {!filtering && sections.newArrivals.length > 0 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <StoreSectionTitle kicker="Nouveau" title="Nouveautés" template={template} palette={palette} />
            <ProductRail products={sections.newArrivals} template={template} palette={palette} badge="Nouveau" />
          </Animated.View>
        )}

        {!filtering && sections.promotions.length > 0 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <StoreSectionTitle kicker="Bons plans" title="Promotions" template={template} palette={palette} />
            <ProductRail products={sections.promotions} template={template} palette={palette} />
          </Animated.View>
        )}

        <View style={{ gap: 12 }}>
          <StoreSectionTitle
            kicker="Catalogue"
            title={collection ? collection.name : 'Tous les articles'}
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
      </View>
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
        emptyComponent={
          <EmptyState
            compact
            icon={SearchX}
            title={filtering ? 'Aucun article ne correspond' : 'Aucun produit publié'}
            message={filtering ? 'Essayez un autre mot ou retirez un filtre.' : undefined}
            actionLabel={filtering ? 'Tout afficher' : undefined}
            onAction={filtering ? clearAll : undefined}
          />
        }
      />

      <View style={[styles.topBar, { top: insets.top + 6 }]}>
        <CircleIconButton variant="glass" size={42} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Retour">
          <ChevronLeft size={22} strokeWidth={1.9} color={colors.text} />
        </CircleIconButton>
        <CircleIconButton variant="glass" size={42} onPress={() => setSheet('share')} accessibilityLabel="Partager la boutique">
          <Share2 size={19} strokeWidth={1.8} color={colors.text} />
        </CircleIconButton>
      </View>

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
  sections: { paddingTop: 30, paddingBottom: 14, gap: 34 },
  count: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.textSecondary, paddingBottom: 3 },
  clear: { fontFamily: fonts.semibold, fontSize: 14, paddingHorizontal: spacing.screen, paddingVertical: 4 },
  topBar: { position: 'absolute', left: spacing.screen, right: spacing.screen, flexDirection: 'row', justifyContent: 'space-between' },
});
