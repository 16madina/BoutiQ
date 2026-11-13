import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getStore } from '@/api/catalog';
import { FavoriteButton } from '@/components/FavoriteButton';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import type { Product } from '@/types';
import { discountPercent, formatFCFA } from '@/utils/format';
import { productImageUri } from '@/utils/images';

const CARD = 148;

function RailCard({ product, showStore }: { product: Product; showStore: boolean }) {
  const percent = discountPercent(product.price, product.oldPrice);
  const store = showStore ? getStore(product.storeId) : undefined;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
      accessibilityLabel={`${product.name}, ${formatFCFA(product.price)}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: productImageUri(product, CARD, 1) }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
        {percent ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-{percent} %</Text>
          </View>
        ) : null}
        <View style={styles.favorite}>
          <FavoriteButton productId={product.id} size={30} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={typography.price} numberOfLines={1}>
          {formatFCFA(product.price)}
        </Text>
        {percent && product.oldPrice ? (
          <Text style={[typography.oldPrice, styles.old]} numberOfLines={1}>
            {formatFCFA(product.oldPrice)}
          </Text>
        ) : null}
        {store ? (
          <Text style={styles.store} numberOfLines={1}>
            {store.name}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

interface Props {
  title: string;
  subtitle?: string;
  products: Product[];
  /** Affiche le nom de la boutique sous chaque article. */
  showStore?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

/** Bande d'articles à faire défiler (articles similaires, autres articles de la boutique). */
export function ProductRail({ title, subtitle, products, showStore = true, actionLabel, onAction }: Props) {
  if (products.length === 0) return null;
  return (
    <View style={styles.band}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={typography.h3} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={[typography.caption, { marginTop: 2 }]}>{subtitle}</Text> : null}
        </View>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={10} accessibilityRole="link" style={({ pressed }) => pressed && { opacity: 0.5 }}>
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: 10 }}>
        {products.map((p) => (
          <RailCard key={p.id} product={p} showStore={showStore} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { paddingTop: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.screen, marginBottom: spacing.md },
  action: { fontFamily: fonts.semibold, fontSize: 14, color: colors.caramel },
  card: { width: CARD, borderRadius: radii.md, backgroundColor: colors.surface, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  imageWrap: { width: CARD, height: CARD, backgroundColor: colors.placeholder },
  badge: { position: 'absolute', left: 8, top: 8, backgroundColor: colors.promo, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },
  favorite: { position: 'absolute', right: 8, top: 8 },
  body: { padding: 10, gap: 3 },
  name: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 18, color: colors.text, minHeight: 36 },
  old: { textDecorationLine: 'line-through', fontSize: 12 },
  store: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
