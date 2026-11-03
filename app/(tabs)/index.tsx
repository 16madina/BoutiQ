import { router } from 'expo-router';
import { PackageSearch } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { CategoryCarousel } from '@/components/CategoryCarousel';
import { EmptyState } from '@/components/EmptyState';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { ProductMasonryGrid } from '@/components/ProductMasonryGrid';
import { DealsRail } from '@/components/DealsRail';
import { PosterRail } from '@/components/PosterRail';
import { SearchBar } from '@/components/SearchBar';
import { SectionHeader } from '@/components/SectionHeader';
import { usePaginatedProducts } from '@/hooks/usePaginatedProducts';
import { colors, spacing } from '@/theme';
import type { ProductQuery } from '@/types';

const HOME_QUERY: ProductQuery = { sort: 'relevance' };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const feed = usePaginatedProducts(HOME_QUERY);

  // L'en-tête défile avec la grille : une seule liste virtualisée pour tout l'écran.
  const header = useMemo(
    () => (
      <View style={{ paddingTop: insets.top }}>
        <AppHeader />
        <SearchBar asButton />
        <View style={styles.categories}>
          <CategoryCarousel />
        </View>
        <PosterRail />
        <View style={styles.deals}>
          <DealsRail />
        </View>
        <View style={styles.section}>
          <SectionHeader
            title="Tendances du moment 🔥"
            actionLabel="Voir tout"
            onAction={() => router.push({ pathname: '/search', params: { sort: 'relevance' } })}
          />
        </View>
      </View>
    ),
    [insets.top],
  );

  return (
    <View style={styles.screen}>
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
        emptyComponent={
          <EmptyState icon={PackageSearch} title="Aucun produit pour le moment" message="Revenez bientôt : nos vendeurs publient chaque jour." />
        }
        bottomInset={bottomSpace}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  categories: { marginTop: spacing.lg, marginBottom: spacing.lg },
  deals: { marginTop: spacing.xl },
  section: { marginTop: spacing.xl },
});
