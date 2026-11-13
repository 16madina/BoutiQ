import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DEMO_DATA, feedProducts, peekProducts } from '@/api/catalog';
import { useRemoteCatalog } from '@/api/remoteCatalog';
import { SectionHeader } from '@/components/SectionHeader';
import { LIMITED_DEAL_IDS } from '@/data/posters';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import type { Product } from '@/types';
import { discountPercent, formatFCFA } from '@/utils/format';
import { productImageUri } from '@/utils/images';

const CARD = 150;

function DealCard({ product }: { product: Product }) {
  const percent = discountPercent(product.price, product.oldPrice);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
      accessibilityLabel={`${product.name}, ${formatFCFA(product.price)}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: productImageUri(product, CARD, 1) }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        {percent ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-{percent}{' '}% de rabais</Text>
          </View>
        ) : null}
        <Text style={styles.limited}>Offre à durée limitée</Text>
        <Text style={[typography.price, styles.price]} numberOfLines={1}>
          {formatFCFA(product.price)}
        </Text>
        {product.oldPrice ? (
          <Text style={[typography.oldPrice, styles.old]} numberOfLines={1}>
            {formatFCFA(product.oldPrice)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Bande « Offres à durée limitée » : produits en promotion à faire défiler. */
export function DealsRail() {
  // Les plus fortes remises des boutiques réelles (rien à afficher = bande masquée).
  const syncedAt = useRemoteCatalog((s) => s.syncedAt);
  const products = useMemo(
    () => (DEMO_DATA ? peekProducts(LIMITED_DEAL_IDS).filter((p) => p.oldPrice) : feedProducts({ onlyPromo: true, sort: 'discount' }).slice(0, 8)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [syncedAt],
  );
  if (products.length === 0) return null;
  return (
    <View style={styles.band}>
      <SectionHeader
        title="Offres à durée limitée"
        actionLabel="Voir tout"
        onAction={() => router.push({ pathname: '/search', params: { promo: '1' } })}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD + 10}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: 10 }}
      >
        {products.map((p) => (
          <DealCard key={p.id} product={p} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: colors.backgroundAlt, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  card: { width: CARD, borderRadius: radii.md, backgroundColor: colors.surface, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  imageWrap: { width: CARD, height: CARD, backgroundColor: colors.white },
  body: { padding: 10, gap: 4 },
  name: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.promo, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },
  limited: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.promo },
  price: { marginTop: 2 },
  old: { textDecorationLine: 'line-through', fontSize: 12 },
});
