import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { CategoryCarousel } from '@/components/CategoryCarousel';
import { DealsRail } from '@/components/DealsRail';
import { HomeFeed } from '@/components/feed/HomeFeed';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { PosterRail } from '@/components/PosterRail';
import { SearchBar } from '@/components/SearchBar';
import { spacing } from '@/theme';

/**
 * Accueil : l'en-tête (logo, recherche, catégories, affiches, offres) puis le fil de sections
 * variées — grilles, collections, boutiques, recommandations, annonces sponsorisées…
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();

  // L'en-tête défile avec le fil : une seule liste virtualisée pour tout l'écran.
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
      </View>
    ),
    [insets.top],
  );

  return <HomeFeed header={header} bottomInset={bottomSpace} />;
}

const styles = StyleSheet.create({
  categories: { marginTop: spacing.lg, marginBottom: spacing.lg },
  deals: { marginTop: spacing.xl },
});
