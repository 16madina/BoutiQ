import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, SearchX, Share2, ShieldCheck, ShoppingBag, Star, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStore, peekProduct } from '@/api/catalog';
import { CartIconButton } from '@/components/CartIconButton';
import { CircleIconButton } from '@/components/CircleIconButton';
import { EmptyState } from '@/components/EmptyState';
import { FavoriteButton } from '@/components/FavoriteButton';
import { GlassSurface, glassBorder } from '@/components/GlassSurface';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProductPrice } from '@/components/ProductPrice';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StoreAvatar } from '@/components/StoreAvatar';
import { StoreLink } from '@/components/StoreLink';
import { useShop } from '@/store/useShop';
import { colors, fonts, radii, shadows, spacing, typography } from '@/theme';
import { formatCount, formatFCFA } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { photoUrl, productImageUri } from '@/utils/images';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = peekProduct(id);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const addToCart = useShop((s) => s.addToCart);
  const [size, setSize] = useState<string | undefined>();

  if (!product) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Produit" />
        <EmptyState icon={SearchX} title="Produit introuvable" message="Ce produit n’est plus disponible." actionLabel="Retour à l’accueil" onAction={() => router.replace('/')} />
      </View>
    );
  }

  const store = getStore(product.storeId);
  const heroHeight = width * Math.min(Math.max(product.aspect, 0.95), 1.3);
  const needsSize = !!product.sizes?.length;

  const onAdd = (buyNow = false) => {
    if (needsSize && !size) {
      haptics.light();
      Alert.alert('Choisissez une taille', 'Sélectionnez votre taille avant de continuer.');
      return;
    }
    addToCart(product.id, size);
    haptics.success();
    if (buyNow) router.push('/cart');
  };

  const onShare = () =>
    Share.share({
      message: `${product.name} sur BoutiQ — ${Linking.createURL(`/product/${product.id}`)}`,
    }).catch(() => {});

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <Image
          source={{ uri: productImageUri(product, width, heroHeight / width) }}
          placeholder={product.imageUri ? undefined : { uri: photoUrl(product.photoId, 180, product.aspect) }}
          style={{ width, height: heroHeight, backgroundColor: '#F1E6D8' }}
          contentFit="cover"
          transition={250}
          cachePolicy="memory-disk"
        />

        <Animated.View entering={FadeInDown.duration(380)} style={styles.sheet}>
          <Text style={typography.h1}>{product.name}</Text>
          {product.reviewsCount > 0 && (
            <View style={styles.rating}>
              <Star size={15} color={colors.caramel} fill={colors.caramel} />
              <Text style={styles.ratingText}>
                {product.rating.toFixed(1).replace('.', ',')} <Text style={typography.caption}>({product.reviewsCount} avis)</Text>
              </Text>
            </View>
          )}
          <View style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ProductPrice price={product.price} oldPrice={product.oldPrice} size="lg" />
            {product.stock === 0 && <Text style={styles.soldOut}>Épuisé</Text>}
          </View>

          {!!product.variants?.length && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Choix et prix</Text>
              {product.variants.map((v) => (
                <View key={v.label} style={styles.variantRow}>
                  <Text style={styles.description}>{v.label}</Text>
                  <Text style={styles.variantPrice}>{v.stock > 0 ? formatFCFA(v.price) : 'Épuisé'}</Text>
                </View>
              ))}
            </View>
          )}

          {!!product.colors?.length && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Couleurs disponibles</Text>
              <View style={styles.sizes}>
                {product.colors.map((c) => (
                  <View key={c} style={styles.size}>
                    <Text style={styles.sizeText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {needsSize && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Taille</Text>
              <View style={styles.sizes}>
                {product.sizes!.map((s) => {
                  const active = s === size;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => {
                        haptics.selection();
                        setSize(s);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[styles.size, active && styles.sizeActive]}
                    >
                      <Text style={[styles.sizeText, active && { color: colors.white }]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {store && (
            <Pressable
              onPress={() => router.push({ pathname: '/store/[id]', params: { id: store.id } })}
              style={({ pressed }) => [styles.storeCard, pressed && { opacity: 0.8 }]}
            >
              <StoreAvatar store={store} size={46} />
              <View style={{ flex: 1, gap: 3 }}>
                <StoreLink storeId={store.id} size="md" />
                <Text style={typography.caption}>
                  {store.city} · {store.rating.toFixed(1).replace('.', ',')} ★ · {formatCount(store.followers)} abonnés
                </Text>
              </View>
              <Text style={styles.visit}>Voir</Text>
            </Pressable>
          )}

          {!!product.description && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Truck size={20} strokeWidth={1.6} color={colors.cognac} />
            <Text style={styles.infoText}>{product.deliveryNote ?? store?.delivery ?? 'Livraison locale et régionale'}</Text>
          </View>
          <View style={styles.infoRow}>
            <ShieldCheck size={20} strokeWidth={1.6} color={colors.cognac} />
            <Text style={styles.infoText}>Paiement protégé : Mobile Money, carte bancaire ou à la livraison</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Boutons flottants sur l'image */}
      <View style={[styles.topBar, { top: insets.top + 6 }]}>
        <CircleIconButton variant="glass" size={42} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Retour">
          <ChevronLeft size={22} strokeWidth={1.9} color={colors.text} />
        </CircleIconButton>
        <View style={styles.topActions}>
          <CircleIconButton variant="glass" size={42} onPress={onShare} accessibilityLabel="Partager">
            <Share2 size={19} strokeWidth={1.8} color={colors.text} />
          </CircleIconButton>
          <FavoriteButton productId={product.id} size={42} />
          <CartIconButton variant="glass" />
        </View>
      </View>

      {/* Barre d'achat translucide */}
      <View style={[styles.buyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <GlassSurface borderRadius={0} />
        {product.salesEnabled === false ? (
          <View style={styles.salesSoon}>
            <ShieldCheck size={18} strokeWidth={1.7} color={colors.cognac} />
            <Text style={styles.salesSoonText}>Boutique en cours de vérification — achats bientôt disponibles</Text>
          </View>
        ) : (
          <>
            <PrimaryButton
              label="Ajouter au panier"
              onPress={() => onAdd(false)}
              icon={<ShoppingBag size={18} color={colors.white} strokeWidth={1.9} />}
              style={{ flex: 1.3 }}
            />
            <PrimaryButton label="Acheter" variant="light" onPress={() => onAdd(true)} style={{ flex: 1 }} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  soldOut: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.white, backgroundColor: colors.text, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  variantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  variantPrice: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  screen: { flex: 1, backgroundColor: colors.background },
  sheet: {
    marginTop: -26,
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.screen + 2,
    paddingTop: spacing.xxl,
  },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  ratingText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  block: { marginTop: spacing.xl },
  blockTitle: { ...typography.h3, marginBottom: 10 },
  sizes: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  size: {
    minWidth: 48,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  sizeText: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  storeCard: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.soft,
  },
  visit: { fontFamily: fonts.semibold, fontSize: 14, color: colors.caramel },
  description: { ...typography.body, lineHeight: 23, color: '#3A3430' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.lg },
  infoText: { ...typography.caption, fontSize: 13.5, flex: 1, color: '#4A433E' },
  topBar: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topActions: { flexDirection: 'row', gap: 10 },
  salesSoon: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: '#F6E8D6',
    borderWidth: 1,
    borderColor: colors.champagne,
  },
  salesSoonText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.chocolate },
  buyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.screen,
    paddingTop: 12,
    borderTopWidth: glassBorder.borderWidth,
    borderTopColor: colors.border,
  },
});
