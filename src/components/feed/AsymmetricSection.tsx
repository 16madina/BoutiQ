import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { FavoriteButton } from '@/components/FavoriteButton';
import { colors, fonts, radii, spacing } from '@/theme';
import type { Product } from '@/types';
import { discountPercent, formatFCFA } from '@/utils/format';
import { productImageUri } from '@/utils/images';

const GAP = 10;

function Tile({ product, width, height, big }: { product: Product; width: number; height: number; big?: boolean }) {
  const percent = discountPercent(product.price, product.oldPrice);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
      accessibilityLabel={`${product.name}, ${formatFCFA(product.price)}`}
      style={({ pressed }) => [styles.tile, { width, height }, pressed && { opacity: 0.9 }]}
    >
      <Image source={{ uri: productImageUri(product, width, height / width) }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={220} />
      <LinearGradient colors={['rgba(28,16,8,0)', 'rgba(28,16,8,0.25)', 'rgba(28,16,8,0.8)']} locations={[0.35, 0.6, 1]} style={StyleSheet.absoluteFill} />
      {percent ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>-{percent} %</Text>
        </View>
      ) : null}
      <View style={styles.favorite}>
        <FavoriteButton productId={product.id} size={big ? 34 : 30} />
      </View>
      <View style={styles.caption}>
        <Text style={[styles.name, big && { fontSize: 16 }]} numberOfLines={big ? 2 : 1}>
          {product.name}
        </Text>
        <Text style={[styles.price, big && { fontSize: 17 }]} numberOfLines={1}>
          {formatFCFA(product.price)}
        </Text>
      </View>
    </Pressable>
  );
}

/** Format H — grille asymétrique : un grand produit et deux petits, pour casser le rythme. */
export function AsymmetricSection({ products, flip }: { products: Product[]; flip: boolean }) {
  const { width } = useWindowDimensions();
  const inner = width - spacing.screen * 2;
  const big = Math.round((inner - GAP) * 0.58);
  const small = inner - GAP - big;
  const height = Math.round(Math.min(big * 1.32, 360));
  const [first, second, third] = products;
  if (!first || !second || !third) return null;
  return (
    <View style={[styles.row, flip && { flexDirection: 'row-reverse' }]}>
      <Tile product={first} width={big} height={height} big />
      <View style={{ gap: GAP }}>
        <Tile product={second} width={small} height={(height - GAP) / 2} />
        <Tile product={third} width={small} height={(height - GAP) / 2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: GAP, paddingHorizontal: spacing.screen },
  tile: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.placeholder },
  badge: { position: 'absolute', left: 10, top: 10, backgroundColor: colors.promo, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },
  favorite: { position: 'absolute', right: 8, top: 8 },
  caption: { position: 'absolute', left: 12, right: 12, bottom: 10, gap: 2 },
  name: { fontFamily: fonts.medium, fontSize: 13.5, color: '#FFF9F1' },
  price: { fontFamily: fonts.bold, fontSize: 15, color: '#FFFFFF' },
});
