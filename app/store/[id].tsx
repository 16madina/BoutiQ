import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, ChevronLeft, MapPin, SearchX, Share2, Star, Truck } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStore } from '@/api/catalog';
import { CircleIconButton } from '@/components/CircleIconButton';
import { EmptyState } from '@/components/EmptyState';
import { FollowButton } from '@/components/FollowButton';
import { ProductMasonryGrid } from '@/components/ProductMasonryGrid';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StoreAvatar } from '@/components/StoreAvatar';
import { usePaginatedProducts } from '@/hooks/usePaginatedProducts';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import { formatCount } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { storeBannerUri } from '@/utils/images';
import { storeUrl } from '@/config/links';
import { useSeller } from '@/store/useSeller';
import { LinearGradient } from 'expo-linear-gradient';

/** Vitrine personnelle d'un vendeur. */
export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = getStore(id);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<string>('Tout');
  // Boutiques créées par un vendeur : vraie collection. Boutiques de démo : filtre par mot-clé.
  const isSellerStore = !!store?.slug;
  const query = useMemo(
    () =>
      tab === 'Tout'
        ? { storeId: id }
        : isSellerStore
          ? { storeId: id, collection: tab }
          : { storeId: id, query: tab.replace(/s$/i, '') },
    [id, tab, isSellerStore],
  );
  const feed = usePaginatedProducts(query);
  const recordStoreView = useSeller((s) => s.recordStoreView);
  const ownSlug = useSeller((s) => s.store?.slug);
  const space = useSeller((s) => s.space);

  // Statistique « vues » de la vitrine (hors consultation par le vendeur lui-même).
  useEffect(() => {
    if (ownSlug && ownSlug === id && space === 'buyer') recordStoreView();
  }, [id, ownSlug, space, recordStoreView]);

  if (!store) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Boutique" />
        <EmptyState icon={SearchX} title="Boutique introuvable" actionLabel="Retour" onAction={() => router.back()} />
      </View>
    );
  }

  const bannerHeight = Math.round(width * 0.5);
  const shareLink = store.slug ? storeUrl(store.slug) : Linking.createURL(`/store/${store.id}`);
  const bannerUri = storeBannerUri(store, width, 0.5);

  const header = (
    <View>
      {bannerUri ? (
        <Image source={{ uri: bannerUri }} style={{ width, height: bannerHeight, backgroundColor: colors.champagne }} contentFit="cover" cachePolicy="memory-disk" transition={250} />
      ) : (
        <LinearGradient colors={[colors.champagne, colors.caramel]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width, height: bannerHeight }} />
      )}
      {store.salesEnabled === false && (
        <View style={styles.pending}>
          <Text style={styles.pendingText}>Boutique en cours de vérification · achats bientôt disponibles</Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.identity}>
          <View style={{ marginTop: -44 }}>
            <StoreAvatar store={store} size={78} />
          </View>
          <View style={styles.actions}>
            <FollowButton storeId={store.id} />
          </View>
        </View>
        <View style={styles.nameRow}>
          <Text style={typography.h1} numberOfLines={1}>
            {store.name}
          </Text>
          {store.verified && <BadgeCheck size={20} color={colors.caramel} strokeWidth={2} />}
        </View>
        <Text style={styles.subtitle}>{store.verified ? 'Boutique vérifiée' : 'Vendeur indépendant'}</Text>
        <View style={styles.stats}>
          <Star size={14} color={colors.caramel} fill={colors.caramel} />
          <Text style={styles.statText}>
            {store.reviewsCount > 0
              ? `${store.rating.toFixed(1).replace('.', ',')} (${formatCount(store.reviewsCount)} avis)`
              : 'Nouvelle boutique'}
          </Text>
          <Text style={styles.sep}>•</Text>
          <Text style={styles.statText}>{formatCount(store.followers)} abonnés</Text>
        </View>
        <Text style={styles.description}>{store.description}</Text>
        <View style={styles.metaRow}>
          <MapPin size={15} color={colors.cognac} strokeWidth={1.8} />
          <Text style={styles.metaText}>
            {store.city}, {store.country}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Truck size={15} color={colors.cognac} strokeWidth={1.8} />
          <Text style={styles.metaText}>{store.delivery}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {['Tout', ...store.collections].map((c) => {
            const active = c === tab;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  haptics.selection();
                  setTab(c);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && { color: colors.white }]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={styles.count}>
          {feed.total} produit{feed.total > 1 ? 's' : ''}
        </Text>
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
        bottomInset={insets.bottom + 24}
        emptyComponent={
          <EmptyState
            compact
            icon={SearchX}
            title={tab === 'Tout' ? 'Aucun produit publié' : 'Collection vide pour le moment'}
          />
        }
      />
      <View style={[styles.topBar, { top: insets.top + 6 }]}>
        <CircleIconButton variant="glass" size={42} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Retour">
          <ChevronLeft size={22} strokeWidth={1.9} color={colors.text} />
        </CircleIconButton>
        <CircleIconButton
          variant="glass"
          size={42}
          onPress={() => Share.share({ message: `Découvrez ${store.name} sur BoutiQ : ${shareLink}` }).catch(() => {})}
          accessibilityLabel="Partager la boutique"
        >
          <Share2 size={19} strokeWidth={1.8} color={colors.text} />
        </CircleIconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  info: { paddingHorizontal: spacing.screen, paddingBottom: spacing.md },
  pending: { backgroundColor: '#F6E8D6', paddingVertical: 8, paddingHorizontal: spacing.screen, paddingLeft: 110 },
  pendingText: { fontFamily: fonts.medium, fontSize: 12, color: colors.chocolate },
  identity: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  subtitle: { ...typography.caption, color: colors.caramel, fontFamily: fonts.medium, marginTop: 2 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  statText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  sep: { color: colors.textMuted },
  description: { ...typography.body, fontSize: 14.5, lineHeight: 21, color: '#3A3430', marginTop: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  metaText: { ...typography.caption, fontSize: 13.5, flex: 1, color: '#4A433E' },
  tabs: { gap: 8, paddingTop: spacing.lg, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  chipText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  count: { ...typography.caption, marginTop: spacing.md },
  topBar: { position: 'absolute', left: spacing.screen, right: spacing.screen, flexDirection: 'row', justifyContent: 'space-between' },
});
