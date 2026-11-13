import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Camera, ChevronLeft, SearchX, SlidersHorizontal, TrendingUp } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEMO_DATA, getCategory, searchCategories, searchStores } from '@/api/catalog';
import { remoteStores, useRemoteCatalog } from '@/api/remoteCatalog';
import { CircleIconButton } from '@/components/CircleIconButton';
import { EmptyState } from '@/components/EmptyState';
import { ProductMasonryGrid } from '@/components/ProductMasonryGrid';
import { SearchBar, startVisualSearch } from '@/components/SearchBar';
import { StoreAvatar } from '@/components/StoreAvatar';
import { CATEGORIES, POPULAR_SEARCHES, STORES } from '@/data/demo';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePaginatedProducts } from '@/hooks/usePaginatedProducts';
import { PRICE_RANGES, useShop } from '@/store/useShop';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import type { CategoryId, ProductQuery, SortOption, Store } from '@/types';
import { haptics } from '@/utils/haptics';

type Params = { q?: string; category?: string; promo?: string; sort?: string; visual?: string };

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

function StorePill({ store }: { store: Store }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/store/[id]', params: { id: store.id } })}
      style={({ pressed }) => [styles.storePill, pressed && { opacity: 0.7 }]}
    >
      <StoreAvatar store={store} size={34} />
      <Text style={styles.storeName} numberOfLines={1}>
        {store.name}
      </Text>
      {store.verified && <BadgeCheck size={14} color={colors.caramel} strokeWidth={2} />}
    </Pressable>
  );
}

export default function SearchScreen() {
  const params = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();
  const filters = useShop((s) => s.filters);
  const setFilters = useShop((s) => s.setFilters);
  const resetFilters = useShop((s) => s.resetFilters);

  const [text, setText] = useState(params.q ?? '');
  const [category, setCategory] = useState<CategoryId | undefined>(getCategory(params.category ?? '')?.id);
  const visual = params.visual === '1';
  const query = useDebouncedValue(text.trim(), 300);

  // Les paramètres d'entrée (bannière, « Voir tout »…) initialisent les filtres.
  useEffect(() => {
    resetFilters();
    if (params.promo === '1') setFilters({ onlyPromo: true });
    if (params.sort) setFilters({ sort: params.sort as SortOption });
    return () => resetFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const browsing = !!params.sort || !!params.promo || visual;
  const idle = !query && !category && !browsing && !filters.onlyPromo && filters.priceRange === 'all';
  // Boutiques réelles (vérifiées d'abord) ; les boutiques d'exemple seulement sans Supabase.
  const syncedAt = useRemoteCatalog((s) => s.syncedAt);
  const suggestedStores = useMemo<Store[]>(
    () => (DEMO_DATA ? STORES : [...remoteStores()].sort((a, b) => Number(!!b.verified) - Number(!!a.verified))).slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [syncedAt],
  );

  const productQuery = useMemo<ProductQuery>(() => {
    const range = PRICE_RANGES[filters.priceRange];
    return {
      query: query || undefined,
      categoryId: category ?? (visual ? 'mode' : undefined),
      onlyPromo: filters.onlyPromo || undefined,
      priceMin: range.min,
      priceMax: range.max,
      sort: filters.sort,
    };
  }, [query, category, visual, filters]);

  const feed = usePaginatedProducts(productQuery);
  const stores = useMemo(() => searchStores(query), [query]);
  const matchedCategories = useMemo(() => searchCategories(query), [query]);
  const activeFilters = (filters.onlyPromo ? 1 : 0) + (filters.priceRange !== 'all' ? 1 : 0) + (filters.sort !== 'relevance' ? 1 : 0);

  const title = visual
    ? 'Produits similaires à votre photo'
    : category
      ? getCategory(category)?.name
      : query
        ? `Résultats pour « ${query} »`
        : filters.onlyPromo
          ? 'Promotions'
          : 'Toutes les tendances';

  const resultsHeader = (
    <View style={styles.resultsHeader}>
      {visual && (
        <View style={styles.visualNote}>
          <Camera size={16} color={colors.cognac} strokeWidth={1.8} />
          <Text style={styles.visualText}>Recherche par image — résultats de démonstration</Text>
        </View>
      )}

      {stores.length > 0 && (
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={styles.sectionLabel}>Boutiques</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {stores.map((s) => (
              <StorePill key={s.id} store={s} />
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        {(matchedCategories.length ? matchedCategories : CATEGORIES).map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            active={category === c.id}
            onPress={() => setCategory(category === c.id ? undefined : c.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={typography.h2} numberOfLines={1}>
            {title}
          </Text>
          <Text style={typography.caption}>
            {feed.status === 'loading' ? 'Recherche…' : `${feed.total} article${feed.total > 1 ? 's' : ''}`}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/filters')} style={styles.filterButton} accessibilityRole="button" accessibilityLabel="Filtres">
          <SlidersHorizontal size={17} strokeWidth={1.8} color={colors.text} />
          <Text style={styles.filterText}>Filtres</Text>
          {activeFilters > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilters}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <CircleIconButton size={44} onPress={() => router.back()} accessibilityLabel="Retour">
          <ChevronLeft size={22} strokeWidth={1.8} color={colors.text} />
        </CircleIconButton>
        <SearchBar value={text} onChangeText={setText} autoFocus={idle && !params.category} style={styles.bar} />
      </View>

      {idle ? (
        <Animated.ScrollView entering={FadeIn.duration(200)} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.idle}>
          {DEMO_DATA && (
            <>
              <Text style={styles.sectionLabel}>Recherches populaires</Text>
              <View style={[styles.wrap, { marginBottom: spacing.xxl }]}>
                {POPULAR_SEARCHES.map((s) => (
                  <Pressable key={s} onPress={() => setText(s)} style={styles.popular}>
                    <TrendingUp size={14} color={colors.caramel} strokeWidth={2} />
                    <Text style={styles.chipText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={styles.sectionLabel}>Catégories</Text>
          <View style={styles.wrap}>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} label={`${c.emoji ?? ''} ${c.name}`.trim()} onPress={() => setCategory(c.id)} />
            ))}
          </View>

          {suggestedStores.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: spacing.xxl }]}>Boutiques à découvrir</Text>
              <View style={{ gap: 10 }}>
                {suggestedStores.map((s) => (
                  <StorePill key={s.id} store={s} />
                ))}
              </View>
            </>
          )}

          <Pressable onPress={startVisualSearch} style={styles.visualCta}>
            <Camera size={20} color={colors.cognac} strokeWidth={1.7} />
            <Text style={styles.visualCtaText}>Rechercher avec une photo</Text>
          </Pressable>
        </Animated.ScrollView>
      ) : (
        <ProductMasonryGrid
          items={feed.items}
          status={feed.status}
          error={feed.error}
          loadingMore={feed.loadingMore}
          hasMore={feed.hasMore}
          onEndReached={feed.loadMore}
          onRetry={feed.retry}
          ListHeaderComponent={resultsHeader}
          bottomInset={insets.bottom + 24}
          emptyComponent={
            <EmptyState
              compact
              icon={SearchX}
              title="Aucun résultat"
              message="Essayez un autre mot-clé ou retirez des filtres."
              actionLabel={activeFilters ? 'Réinitialiser les filtres' : undefined}
              onAction={activeFilters ? resetFilters : undefined}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.screen, paddingBottom: spacing.md },
  bar: { flex: 1, marginHorizontal: 0, height: 50 },
  idle: { paddingHorizontal: spacing.screen, paddingTop: spacing.sm, paddingBottom: 60 },
  sectionLabel: { ...typography.h3, marginBottom: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  popular: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chip: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  chipText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  storeName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, maxWidth: 200 },
  visualCta: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.champagne,
    backgroundColor: colors.tint,
  },
  visualCtaText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.chocolate },
  resultsHeader: { paddingTop: spacing.xs, paddingBottom: spacing.md },
  hScroll: { gap: 8, paddingHorizontal: spacing.screen },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.screen, marginTop: spacing.lg, gap: 12 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  filterBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: colors.white, fontFamily: fonts.bold, fontSize: 10.5 },
  visualNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.screen,
    marginBottom: spacing.lg,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.tint,
  },
  visualText: { fontFamily: fonts.medium, fontSize: 13, color: colors.chocolate, flex: 1 },
});
