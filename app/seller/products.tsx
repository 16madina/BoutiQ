import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Package } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { EmptyState } from '@/components/EmptyState';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AddProductFab } from '@/components/seller/AddProductFab';
import { useSeller } from '@/store/useSeller';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import type { ProductStatus } from '@/types/seller';
import { formatFCFA } from '@/utils/format';
import { haptics } from '@/utils/haptics';

type Filter = 'all' | ProductStatus;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'published', label: 'En ligne' },
  { id: 'draft', label: 'Brouillons' },
];

export default function SellerProducts() {
  const bottomSpace = useTabBarSpace();
  const products = useSeller((s) => s.products);
  const [filter, setFilter] = useState<Filter>('all');
  const items = useMemo(() => (filter === 'all' ? products : products.filter((p) => p.status === filter)), [products, filter]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Mes produits" back={false} large />
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = f.id === filter;
          const count = f.id === 'all' ? products.length : products.filter((p) => p.status === f.id).length;
          return (
            <Pressable
              key={f.id}
              onPress={() => {
                haptics.selection();
                setFilter(f.id);
              }}
              style={[styles.filter, active && styles.filterActive]}
            >
              <Text style={[styles.filterText, active && { color: colors.white }]}>
                {f.label} · {count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: bottomSpace + 80, gap: 10 }}
        ListEmptyComponent={
          <EmptyState
            icon={Package}
            title={products.length === 0 ? 'Votre vitrine est vide' : 'Aucun produit ici'}
            message={products.length === 0 ? 'Ajoutez votre premier produit : quelques photos et un prix suffisent.' : undefined}
            actionLabel={products.length === 0 ? 'Ajouter un produit' : undefined}
            onAction={products.length === 0 ? () => router.push('/product-editor') : undefined}
          />
        }
        renderItem={({ item }) => (
          <Animated.View entering={FadeIn} layout={LinearTransition.springify()}>
            <Pressable
              onPress={() => router.push({ pathname: '/product-editor', params: { id: item.id } })}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
            >
              {item.photos[0] ? (
                <Image source={{ uri: item.photos[0].uri }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]}>
                  <Package size={22} color={colors.sand} strokeWidth={1.5} />
                </View>
              )}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={typography.productName} numberOfLines={1}>
                  {item.name || 'Sans nom'}
                </Text>
                <Text style={typography.price}>{formatFCFA(item.price)}</Text>
                <Text style={typography.caption}>
                  Stock : {item.stock > 0 ? item.stock : 'épuisé'}
                </Text>
              </View>
              <View style={[styles.status, item.status === 'published' ? styles.statusOn : styles.statusOff]}>
                <Text style={[styles.statusText, item.status === 'published' && { color: '#3F6B3A' }]}>
                  {item.status === 'published' ? 'En ligne' : 'Brouillon'}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        )}
      />
      <AddProductFab />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.screen, marginBottom: spacing.md },
  filter: { paddingHorizontal: 14, height: 36, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  filterActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  filterText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  thumb: { width: 76, height: 88, borderRadius: radii.md, backgroundColor: colors.champagne },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundAlt },
  status: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, alignSelf: 'flex-start' },
  statusOn: { backgroundColor: '#E7EFDF' },
  statusOff: { backgroundColor: colors.backgroundAlt },
  statusText: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.tabInactive },
});
