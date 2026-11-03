import { router } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { peekProducts } from '@/api/catalog';
import { EmptyState } from '@/components/EmptyState';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { ProductMasonryGrid } from '@/components/ProductMasonryGrid';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useShop } from '@/store/useShop';
import { colors } from '@/theme';

export default function FavoritesScreen() {
  const bottomSpace = useTabBarSpace();
  const favorites = useShop((s) => s.favorites);
  const items = useMemo(() => peekProducts(Object.keys(favorites)), [favorites]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Favoris" back={false} large />
      <ProductMasonryGrid
        items={items}
        status="ready"
        hasMore={false}
        bottomInset={bottomSpace}
        emptyComponent={
          <EmptyState
            icon={Heart}
            title="Aucun favori pour l’instant"
            message="Touchez le cœur sur un produit pour le retrouver ici."
            actionLabel="Explorer les tendances"
            onAction={() => router.navigate('/')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
});
