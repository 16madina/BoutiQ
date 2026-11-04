import { FlashList, type FlashListRef, type ListRenderItemInfo } from '@shopify/flash-list';
import { RefreshCw, WifiOff } from 'lucide-react-native';
import { useCallback, type ReactElement, type RefObject } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { ProductCard } from '@/components/ProductCard';
import { MasonrySkeleton, ProductSkeleton } from '@/components/ProductSkeleton';
import { colors, fonts, layout, spacing, typography } from '@/theme';
import type { Product } from '@/types';

export interface MasonryGridProps {
  items: Product[];
  status: 'loading' | 'ready' | 'error';
  error?: string | null;
  loadingMore?: boolean;
  hasMore?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  onRetry?: () => void;
  ListHeaderComponent?: ReactElement | null;
  /** Affiché quand la requête ne renvoie aucun produit */
  emptyComponent?: ReactElement | null;
  /** Espace libre sous la grille (barre d'onglets flottante, barre d'action…) */
  bottomInset?: number;
  /** Pour faire défiler la liste depuis l'écran (ex. « Explorer » → catalogue). */
  listRef?: RefObject<FlashListRef<Product> | null>;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

/** Calcule le nombre de colonnes et la largeur exacte des cartes. */
export function useMasonryMetrics() {
  const { width } = useWindowDimensions();
  const columns = width >= layout.threeColumnsBreakpoint ? 3 : 2;
  const gap = spacing.gridGap;
  const outer = spacing.screen;
  const cardWidth = Math.floor((width - outer * 2 - gap * (columns - 1)) / columns);
  /** Padding du conteneur : chaque cellule porte gap/2 de chaque côté. */
  const containerPadding = outer - gap / 2;
  return { columns, gap, cardWidth, containerPadding };
}

/**
 * Grille Masonry virtualisée (FlashList v2, mode `masonry`).
 * Chaque produit est placé dans la colonne la plus courte : hauteurs libres,
 * aucune rangée imposée — rendu « Pinterest premium ».
 */
export function ProductMasonryGrid({
  items,
  status,
  error,
  loadingMore,
  hasMore,
  refreshing = false,
  onRefresh,
  onEndReached,
  onRetry,
  ListHeaderComponent,
  emptyComponent,
  bottomInset = 32,
  listRef,
  onScroll,
}: MasonryGridProps) {
  const { columns, gap, cardWidth, containerPadding } = useMasonryMetrics();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Product>) => (
      <View style={{ paddingHorizontal: gap / 2, paddingBottom: gap + 2 }}>
        <ProductCard product={item} width={cardWidth} />
      </View>
    ),
    [cardWidth, gap],
  );

  const header = ListHeaderComponent ? (
    <View style={{ marginHorizontal: -containerPadding }}>{ListHeaderComponent}</View>
  ) : null;

  const empty =
    status === 'loading' ? (
      <View style={{ paddingHorizontal: gap / 2 }}>
        <MasonrySkeleton columns={columns} cardWidth={cardWidth} gap={gap} />
      </View>
    ) : status === 'error' ? (
      <EmptyState
        compact
        icon={WifiOff}
        title="Connexion impossible"
        message={error ?? 'Vérifiez votre connexion internet puis réessayez.'}
        actionLabel="Réessayer"
        onAction={onRetry}
      />
    ) : (
      emptyComponent ?? null
    );

  const footer = (
    <View style={styles.footer}>
      {loadingMore ? (
        <View style={[styles.footerSkeletons, { gap }]}>
          {Array.from({ length: columns }).map((_, i) => (
            <ProductSkeleton key={i} width={cardWidth} aspect={i % 2 ? 0.8 : 1.05} />
          ))}
        </View>
      ) : error && items.length > 0 ? (
        <PressableScale onPress={onRetry} style={styles.retry} accessibilityRole="button">
          <RefreshCw size={16} color={colors.cognac} strokeWidth={2} />
          <Text style={styles.retryText}>Erreur de chargement — Réessayer</Text>
        </PressableScale>
      ) : !hasMore && items.length > 0 ? (
        <Text style={styles.end}>Vous avez tout vu ✨</Text>
      ) : items.length > 0 ? (
        <ActivityIndicator color={colors.caramel} />
      ) : null}
    </View>
  );

  return (
    <FlashList
      ref={listRef}
      onScroll={onScroll}
      scrollEventThrottle={32}
      data={items}
      masonry
      numColumns={columns}
      renderItem={renderItem}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.8}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: containerPadding, paddingBottom: bottomInset }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.caramel}
            colors={[colors.caramel]}
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: { paddingTop: 4, paddingBottom: spacing.lg, alignItems: 'center' },
  footerSkeletons: { flexDirection: 'row' },
  end: { ...typography.caption, paddingVertical: spacing.md },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.md },
  retryText: { fontFamily: fonts.medium, fontSize: 14, color: colors.cognac },
});
