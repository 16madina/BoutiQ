import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Star } from 'lucide-react-native';
import { memo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { AddToCartButton } from '@/components/AddToCartButton';
import { FavoriteButton } from '@/components/FavoriteButton';
import { PressableScale } from '@/components/PressableScale';
import { ProductPrice } from '@/components/ProductPrice';
import { StoreLink } from '@/components/StoreLink';
import { colors, fonts, radii, shadows, spacing, typography } from '@/theme';
import type { Product } from '@/types';
import { productImageUri } from '@/utils/images';

interface Props {
  product: Product;
  /** Largeur exacte de la carte (calculée par la grille) */
  width: number;
}

/**
 * Carte éditoriale : grande photo aux proportions naturelles,
 * informations sous l'image (nom, prix, réduction, boutique).
 */
function ProductCardBase({ product, width }: Props) {
  const imageHeight = Math.round(width * product.aspect);

  return (
    <View style={[styles.shadow, { width }]}>
      <PressableScale
        activeScale={0.975}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
        // Web : pas de rôle « button » sur la carte, elle contient déjà des boutons (HTML invalide sinon).
        accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
        accessibilityLabel={product.name}
        style={styles.card}
      >
        <View style={{ width, height: imageHeight }}>
          <Image
            source={{ uri: productImageUri(product, width) }}
            style={styles.image}
            contentFit="cover"
            transition={250}
            cachePolicy="memory-disk"
            recyclingKey={product.id}
            accessibilityIgnoresInvertColors
          />
          <View style={styles.favorite}>
            <FavoriteButton productId={product.id} />
          </View>
          {product.salesEnabled !== false && product.stock !== 0 && (
            <View style={styles.cart}>
              <AddToCartButton
                productId={product.id}
                onChoose={
                  product.sizes?.length || product.variants?.length || (product.colors?.length ?? 0) > 1
                    ? () => router.push({ pathname: '/product/[id]', params: { id: product.id } })
                    : undefined
                }
              />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={typography.productName} numberOfLines={1}>
            {product.name}
          </Text>
          <ProductPrice price={product.price} oldPrice={product.oldPrice} />
          {product.reviewsCount > 0 ? (
            <View style={styles.rating}>
              <Star size={12} color={colors.gold} fill={colors.gold} strokeWidth={1.6} />
              <Text style={styles.ratingText}>
                {product.rating.toFixed(1).replace('.', ',')} <Text style={styles.ratingCount}>({product.reviewsCount})</Text>
              </Text>
            </View>
          ) : null}
          <View style={styles.store}>
            <StoreLink storeId={product.storeId} />
          </View>
        </View>
      </PressableScale>
    </View>
  );
}

export const ProductCard = memo(ProductCardBase);

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  card: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  image: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.placeholder,
    borderRadius: radii.lg,
  },
  favorite: { position: 'absolute', top: 10, right: 10 },
  cart: { position: 'absolute', bottom: 10, right: 10 },
  info: {
    paddingHorizontal: spacing.md - 1,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 5,
  },
  store: { marginTop: 2 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  ratingCount: { fontFamily: fonts.regular, color: colors.textSecondary },
});
