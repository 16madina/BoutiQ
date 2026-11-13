import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Info, Minus, Plus, ShoppingCart, Store as StoreIcon, Trash2 } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { groupCart, type CartGroupState } from '@/api/account';
import { useRemoteCatalog } from '@/api/remoteCatalog';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSeller } from '@/store/useSeller';
import { useShop } from '@/store/useShop';
import { colors, fonts, radii, shadows, spacing, typography } from '@/theme';
import { formatFCFA } from '@/utils/format';
import { haptics } from '@/utils/haptics';

const NOTE: Record<Exclude<CartGroupState, 'orderable'>, string> = {
  demo: 'Boutique de démonstration : ses articles ne peuvent pas être commandés.',
  unverified: 'Cette boutique attend sa vérification : la commande sera possible très bientôt.',
  own: 'C’est votre boutique : vous ne pouvez pas y commander.',
};

/** Panier : une commande par boutique, chaque vendeur livre lui-même. */
export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const cart = useShop((s) => s.cart);
  const setQuantity = useShop((s) => s.setQuantity);
  const removeFromCart = useShop((s) => s.removeFromCart);
  const ownSlug = useSeller((s) => s.store?.slug);
  const syncedAt = useRemoteCatalog((s) => s.syncedAt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const groups = useMemo(() => groupCart(cart, ownSlug), [cart, ownSlug, syncedAt]);
  const orderable = groups.filter((g) => g.state === 'orderable');
  const total = orderable.reduce((n, g) => n + g.total, 0);
  const count = cart.reduce((n, l) => n + l.quantity, 0);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={`Mon panier${count ? ` (${count})` : ''}`} />
      {groups.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Votre panier est vide"
          message="Ajoutez des articles grâce au bouton panier sur chaque photo."
          actionLabel="Découvrir les tendances"
          onAction={() => router.navigate('/')}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: spacing.screen, gap: 16, paddingBottom: 190 + insets.bottom }}>
            {groups.map((g) => (
              <View key={g.storeKey} style={styles.group}>
                <Pressable onPress={() => router.push({ pathname: '/store/[id]', params: { id: g.storeKey } })} style={styles.groupHead}>
                  <StoreIcon size={17} color={colors.cognac} strokeWidth={1.8} />
                  <Text style={styles.groupName} numberOfLines={1}>
                    {g.storeName}
                  </Text>
                  <Text style={styles.groupTotal}>{formatFCFA(g.total)}</Text>
                </Pressable>
                {g.state !== 'orderable' && (
                  <View style={styles.note}>
                    <Info size={15} color={colors.chocolate} strokeWidth={1.9} />
                    <Text style={styles.noteText}>{NOTE[g.state]}</Text>
                  </View>
                )}
                {g.lines.map((l) => (
                  <Animated.View key={`${l.productId}-${l.size ?? ''}-${l.variant ?? ''}-${l.color ?? ''}`} layout={LinearTransition.springify()} exiting={FadeOut} style={styles.line}>
                    <Pressable onPress={() => router.push({ pathname: '/product/[id]', params: { id: l.productId } })}>
                      {l.imageUri ? <Image source={{ uri: l.imageUri }} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
                    </Pressable>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={typography.productName} numberOfLines={1}>
                        {l.name}
                      </Text>
                      {l.size || l.variant || l.color ? (
                        <Text style={typography.caption} numberOfLines={1}>
                          {[l.variant, l.color, l.size ? `Taille ${l.size}` : null].filter(Boolean).join(' · ')}
                        </Text>
                      ) : null}
                      <Text style={typography.price}>{formatFCFA(l.unitPrice)}</Text>
                    </View>
                    <View style={styles.right}>
                      <Pressable onPress={() => removeFromCart(l.productId, l.size, l.variant, l.color)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Retirer ${l.name}`}>
                        <Trash2 size={18} strokeWidth={1.7} color={colors.textSecondary} />
                      </Pressable>
                      <View style={styles.qty}>
                        <Pressable
                          onPress={() => {
                            haptics.selection();
                            setQuantity(l.productId, l.quantity - 1, l.size, l.variant, l.color);
                          }}
                          hitSlop={6}
                          style={styles.qtyBtn}
                          accessibilityRole="button"
                          accessibilityLabel="Diminuer"
                        >
                          <Minus size={14} strokeWidth={2.2} color={colors.text} />
                        </Pressable>
                        <Text style={styles.qtyText}>{l.quantity}</Text>
                        <Pressable
                          onPress={() => {
                            haptics.selection();
                            setQuantity(l.productId, l.quantity + 1, l.size, l.variant, l.color);
                          }}
                          hitSlop={6}
                          style={styles.qtyBtn}
                          accessibilityRole="button"
                          accessibilityLabel="Augmenter"
                        >
                          <Plus size={14} strokeWidth={2.2} color={colors.text} />
                        </Pressable>
                      </View>
                    </View>
                  </Animated.View>
                ))}
              </View>
            ))}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.totalRow}>
              <View>
                <Text style={typography.h3}>Total à commander</Text>
                <Text style={typography.caption}>
                  {orderable.length > 1 ? `${orderable.length} commandes, une par boutique` : orderable.length === 1 ? '1 boutique' : 'Aucun article commandable'}
                </Text>
              </View>
              <Text style={[typography.price, { fontSize: 20 }]}>{formatFCFA(total)}</Text>
            </View>
            <PrimaryButton label="Commander" onPress={() => router.push('/checkout')} disabled={orderable.length === 0} variant="caramel" style={{ height: 56 }} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  group: { gap: 10, padding: 12, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadows.soft },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  groupName: { flex: 1, fontFamily: fonts.bold, fontSize: 15.5, color: colors.text },
  groupTotal: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSecondary },
  note: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: radii.md, backgroundColor: '#F6E8D6' },
  noteText: { flex: 1, fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, color: colors.chocolate },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 6, borderRadius: radii.lg, backgroundColor: colors.background },
  thumb: { width: 72, height: 80, borderRadius: radii.md, backgroundColor: colors.champagne },
  right: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 4 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 4, borderRadius: radii.pill, backgroundColor: colors.backgroundAlt },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontFamily: fonts.bold, fontSize: 15, minWidth: 18, textAlign: 'center', color: colors.text },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 12,
    paddingHorizontal: spacing.screen,
    paddingTop: 14,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
