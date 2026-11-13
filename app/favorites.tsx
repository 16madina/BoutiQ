import { router } from 'expo-router';
import { ChevronRight, Heart, Store as StoreIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getStore, peekProducts } from '@/api/catalog';
import { useRemoteCatalog } from '@/api/remoteCatalog';
import { EmptyState } from '@/components/EmptyState';
import { FollowButton } from '@/components/FollowButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductMasonryGrid } from '@/components/ProductMasonryGrid';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StoreAvatar } from '@/components/StoreAvatar';
import { useShop } from '@/store/useShop';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import type { Store } from '@/types';
import { formatCount } from '@/utils/format';

/** Favoris : produits aimés et boutiques suivies (gardés sur l'appareil et dans le compte). */
export default function FavoritesScreen() {
  const bottomSpace = useSafeAreaInsets().bottom + 32;
  const favorites = useShop((s) => s.favorites);
  const followed = useShop((s) => s.followedStores);
  const syncedAt = useRemoteCatalog((s) => s.syncedAt);
  const [tab, setTab] = useState<'products' | 'stores'>('products');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => peekProducts(Object.keys(favorites)).filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i), [favorites, syncedAt]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stores = useMemo(() => Object.keys(followed).map((id) => getStore(id)).filter((s): s is Store => !!s), [followed, syncedAt]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Mes favoris" />
      <View style={styles.tabs}>
        {(
          [
            ['products', `Produits · ${items.length}`],
            ['stores', `Boutiques suivies · ${stores.length}`],
          ] as const
        ).map(([id, label]) => (
          <Pressable key={id} onPress={() => setTab(id)} style={[styles.tab, tab === id && styles.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: tab === id }}>
            <Text style={[styles.tabText, tab === id && { color: colors.white }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'products' ? (
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
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: bottomSpace, gap: 10 }}
          ListEmptyComponent={
            <EmptyState
              icon={StoreIcon}
              title="Aucune boutique suivie"
              message="Suivez vos boutiques préférées pour être prévenu de leurs nouveautés."
              actionLabel="Découvrir les boutiques"
              onAction={() => router.navigate('/stores')}
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/store/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
              <StoreAvatar store={item} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={typography.caption}>
                  {item.city}
                  {item.followers > 0 ? ` · ${formatCount(item.followers)} abonné${item.followers > 1 ? 's' : ''}` : ''}
                </Text>
              </View>
              <FollowButton storeId={item.id} compact />
              <ChevronRight size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.screen, paddingBottom: 12 },
  tab: { paddingHorizontal: 14, height: 38, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  tabActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  tabText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  name: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text },
});
