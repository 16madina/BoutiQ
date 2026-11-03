import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react-native';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStore, peekProduct } from '@/api/catalog';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useShop } from '@/store/useShop';
import { colors, fonts, radii, shadows, spacing, typography } from '@/theme';
import { formatFCFA } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { productImageUri } from '@/utils/images';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const cart = useShop((s) => s.cart);
  const setQuantity = useShop((s) => s.setQuantity);
  const removeFromCart = useShop((s) => s.removeFromCart);
  const clearCart = useShop((s) => s.clearCart);

  const lines = cart
    .map((l) => ({ ...l, product: peekProduct(l.productId) }))
    .filter((l): l is typeof l & { product: NonNullable<typeof l.product> } => !!l.product);
  const total = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={`Mon panier${count ? ` (${count})` : ''}`} />
      {lines.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Votre panier est vide"
          message="Ajoutez des articles depuis l’accueil grâce au bouton panier sur chaque photo."
          actionLabel="Découvrir les tendances"
          onAction={() => router.navigate('/')}
        />
      ) : (
        <>
          <FlatList
            data={lines}
            keyExtractor={(l) => `${l.productId}-${l.size ?? ''}`}
            contentContainerStyle={{ padding: spacing.screen, gap: 12, paddingBottom: 160 }}
            renderItem={({ item: l }) => (
              <Animated.View layout={LinearTransition.springify()} exiting={FadeOut} style={styles.line}>
                <Pressable onPress={() => router.push({ pathname: '/product/[id]', params: { id: l.productId } })}>
                  <Image source={{ uri: productImageUri(l.product, 84, 1) }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
                </Pressable>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={typography.productName} numberOfLines={1}>
                    {l.product.name}
                  </Text>
                  <Text style={typography.caption} numberOfLines={1}>
                    {getStore(l.product.storeId)?.name}
                    {l.size ? ` · Taille ${l.size}` : ''}
                  </Text>
                  <Text style={typography.price}>{formatFCFA(l.product.price)}</Text>
                </View>
                <View style={styles.right}>
                  <Pressable onPress={() => removeFromCart(l.productId, l.size)} hitSlop={8} accessibilityLabel="Supprimer">
                    <Trash2 size={18} strokeWidth={1.7} color={colors.textSecondary} />
                  </Pressable>
                  <View style={styles.qty}>
                    <Pressable
                      onPress={() => {
                        haptics.selection();
                        setQuantity(l.productId, l.quantity - 1, l.size);
                      }}
                      hitSlop={6}
                      style={styles.qtyBtn}
                      accessibilityLabel="Diminuer"
                    >
                      <Minus size={14} strokeWidth={2.2} color={colors.text} />
                    </Pressable>
                    <Text style={styles.qtyText}>{l.quantity}</Text>
                    <Pressable
                      onPress={() => {
                        haptics.selection();
                        setQuantity(l.productId, l.quantity + 1, l.size);
                      }}
                      hitSlop={6}
                      style={styles.qtyBtn}
                      accessibilityLabel="Augmenter"
                    >
                      <Plus size={14} strokeWidth={2.2} color={colors.text} />
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            )}
          />
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.totalRow}>
              <Text style={typography.h3}>Total</Text>
              <Text style={[typography.price, { fontSize: 20 }]}>{formatFCFA(total)}</Text>
            </View>
            <PrimaryButton
              label="Valider ma commande"
              onPress={() =>
                Alert.alert(
                  'Démo',
                  'Le paiement (Mobile Money, carte, paiement à la livraison) arrive dans la prochaine version.',
                  [
                    { text: 'Vider le panier', style: 'destructive', onPress: clearCart },
                    { text: 'OK' },
                  ],
                )
              }
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.soft,
  },
  thumb: { width: 84, height: 84, borderRadius: radii.md, backgroundColor: colors.champagne },
  right: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 2 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.backgroundAlt, borderRadius: radii.pill, padding: 4 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontFamily: fonts.semibold, fontSize: 14, minWidth: 14, textAlign: 'center', color: colors.text },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    gap: 14,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    ...shadows.floating,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
