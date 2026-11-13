import { router } from 'expo-router';
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
import { siteIsDark, siteNavBackground, SiteNav, type SiteSection } from '@/components/storefront/SiteHero';
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
 *
 * `owner` : la même vitrine, affichée dans l'Accueil de l'espace vendeur
 * (sous la barre du vendeur) : le retour devient « Personnaliser ».
 */
export function StorefrontScreen({ id, owner, bottomInset }: { id: string; owner?: boolean; bottomInset?: number }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Côté vendeur, la barre « Ma boutique » occupe déjà le haut de l'écran.
  const topInset = owner ? 0 : insets.top;
  const customize = () => router.push('/customize');

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
  // Vitrine « site web » : l'en-tête avec son menu reste en haut, à la place des boutons flottants.
  const site = layout === 'site';
  const bodyY = useRef(0);
  const aboutY = useRef<number | null>(null);
  const [section, setSection] = useState<SiteSection>('home');
  const showFloating = !site && (scrolled || layout === 'centered' || layout === 'stacked' || layout === 'inset');
  // Heure et batterie en blanc sur les bannières photo sombres (Mode, Beauté, Électronique).
  const darkTop = layout === 'overlay' || layout === 'centered' || layout === 'stacked';
  // Vitrine « site web » à en-tête sombre (Mode, Électronique) : blanc tout le long, l'en-tête fixe reste sombre.
  const darkSite = site && !!sf && siteIsDark(sf);
  useScreenStatusBar(!owner && (darkSite || (darkTop && !pastHero)) ? 'light' : 'dark');
  // Bande claire derrière l'heure et la batterie dès que le contenu passe dessous.
  const showStatusBackdrop = !site && (darkTop ? pastHero : scrolled);
  const backdropStyle = useAnimatedStyle(() => ({ opacity: withTiming(showStatusBackdrop ? 1 : 0, { duration: 180 }) }), [showStatusBackdrop]);
  const floatingStyle = useAnimatedStyle(() => ({ opacity: withTiming(showFloating ? 1 : 0, { duration: 180 }) }), [showFloating]);
  const stickyStyle = useAnimatedStyle(() => ({ opacity: withTiming(site && scrolled ? 1 : 0, { duration: 160 }) }), [site, scrolled]);
  // Hauteur réservée en haut de l'écran quand on fait défiler jusqu'à une section.
  const topOffset = topInset + (site ? 104 : 56);
  const scrollTo = (y: number) => listRef.current?.scrollToOffset({ offset: Math.max(y - topOffset, 0), animated: true });
  const goToCatalog = () => scrollTo(catalogY.current);
  const navigate = (target: SiteSection) => {
    if (target === 'home') listRef.current?.scrollToOffset({ offset: 0, animated: true });
    else if (target === 'products') goToCatalog();
    else if (target === 'contact') setSheet('contact');
    else if (aboutY.current != null) scrollTo(bodyY.current + aboutY.current);
  };

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
        topInset={topInset}
        owner={owner}
        onBack={owner ? customize : undefined}
        onNavigate={navigate}
        onContact={() => setSheet('contact')}
        onShare={() => setSheet('share')}
        onExplore={goToCatalog}
      />

      <View onLayout={(e) => (bodyY.current = e.nativeEvent.layout.y)}>
      <StorefrontBody
        sf={sf}
        sections={sections}
        width={width}
        filtering={filtering}
        onAboutLayout={(y) => (aboutY.current = y)}
        selectedCollectionId={collection?.id}
        onSelectCollection={setCollection}
        onContact={() => setSheet('contact')}
        onSeeAll={(section) => {
          if (section === 'deals') setFilters({ ...DEFAULT_STORE_FILTERS, onlyPromo: true });
          goToCatalog();
        }}
      />
      </View>

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
        bottomInset={bottomInset ?? insets.bottom + 32}
        listRef={listRef}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          if (y > 90 !== scrolled) setScrolled(y > 90);
          const beyond = y > width * (sf?.template.heroRatio ?? 1) * 0.9;
          if (beyond !== pastHero) setPastHero(beyond);
          if (site) {
            // Rubrique du menu correspondant à ce qu'on regarde.
            const line = y + topOffset + 40;
            const about = aboutY.current != null ? bodyY.current + aboutY.current : Infinity;
            const next: SiteSection = catalogY.current > 0 && line >= catalogY.current ? 'products' : line >= about ? 'about' : 'home';
            if (next !== section) setSection(next);
          }
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

      {site && (
        <Animated.View style={[styles.sticky, { paddingTop: topInset, backgroundColor: siteNavBackground(sf) }, stickyStyle]} pointerEvents={scrolled ? 'auto' : 'none'}>
          <SiteNav sf={sf} active={section} onNavigate={navigate} onSearch={goToCatalog} onBack={owner ? customize : undefined} owner={owner} />
        </Animated.View>
      )}
      {!owner && <Animated.View style={[styles.statusBackdrop, { height: insets.top }, backdropStyle]} pointerEvents="none" />}
      <Animated.View style={[styles.topBar, { top: topInset + 6 }, floatingStyle]} pointerEvents={showFloating ? 'box-none' : 'none'}>
        {owner ? (
          // Le vendeur a déjà « Modifier » dans sa barre : rien à gauche, pour ne pas cacher les titres.
          <View />
        ) : (
          <CircleIconButton variant="glass" size={42} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Retour">
            <ChevronLeft size={22} strokeWidth={1.9} color={colors.text} />
          </CircleIconButton>
        )}
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
  sticky: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.surface },
  statusBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(250,246,240,0.96)' },
  topBar: { position: 'absolute', left: spacing.screen, right: spacing.screen, flexDirection: 'row', justifyContent: 'space-between' },
});
