import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Minus,
  Plus,
  Search,
  SearchX,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store as StoreIcon,
  Tag,
  TicketPercent,
  Truck,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCategory, getStore, moreFromStore, peekProduct, similarProducts } from '@/api/catalog';
import { openConversation } from '@/api/messages';
import { promoSummary, usePublicPromos } from '@/api/promo';
import { useRemoteCatalog } from '@/api/remoteCatalog';
import { getStorefront } from '@/api/storefront';
import { CartIconButton } from '@/components/CartIconButton';
import { CircleIconButton } from '@/components/CircleIconButton';
import { EmptyState } from '@/components/EmptyState';
import { FavoriteButton } from '@/components/FavoriteButton';
import { FollowButton } from '@/components/FollowButton';
import { GlassSurface, glassBorder } from '@/components/GlassSurface';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProductRail } from '@/components/ProductRail';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StoreAvatar } from '@/components/StoreAvatar';
import { ProductGallery } from '@/components/product/ProductGallery';
import { trackAd } from '@/feed/campaigns';
import { useHistory } from '@/store/useHistory';
import { useSeller } from '@/store/useSeller';
import { useShop } from '@/store/useShop';
import { colors, fonts, isDark, radii, shadows, spacing, typography } from '@/theme';
import { discountPercent, formatCount, formatFCFA } from '@/utils/format';
import { COLOR_PRESETS } from '@/utils/productForm';
import { haptics } from '@/utils/haptics';
import { demoGallery, photoUrl, productImageUri, storeBannerUri } from '@/utils/images';

const IN_STOCK = colors.success;
const LOW_STOCK = 5;

/** « 12 000 » et « FCFA » séparés, pour écrire le prix en grand et la devise en petit. */
function priceParts(value: number): [string, string] {
  const text = formatFCFA(value);
  const cut = text.lastIndexOf('FCFA');
  return [text.slice(0, cut).trim(), 'FCFA'];
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} color={colors.gold} fill={n <= Math.round(rating) ? colors.gold : 'transparent'} strokeWidth={1.6} />
      ))}
    </View>
  );
}

export default function ProductScreen() {
  const { id, ad } = useLocalSearchParams<{ id: string; ad?: string }>();
  const product = peekProduct(id);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const addToCart = useShop((s) => s.addToCart);
  const ownSlug = useSeller((s) => s.store?.slug);
  const syncedAt = useRemoteCatalog((s) => s.syncedAt);
  const [size, setSize] = useState<string | undefined>();
  const [variant, setVariant] = useState<string | undefined>();
  const [pickedColor, setPickedColor] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [choiceError, setChoiceError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const similar = useMemo(
    () => (product ? similarProducts(product) : { items: [], samePrice: false }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product?.id, syncedAt],
  );
  const fromStore = useMemo(
    () => (product ? moreFromStore(product) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product?.id, syncedAt],
  );
  const storeOffer = useMemo(
    () => (product ? getStorefront(product.storeId)?.settings.promoMessage : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product?.storeId, syncedAt],
  );

  // Codes promo que la boutique affiche à ses clients.
  const storeRemoteId = product ? getStore(product.storeId)?.remoteId : undefined;
  const promos = usePublicPromos((s) => (storeRemoteId ? s.byStore[storeRemoteId] : undefined));
  const loadPromos = usePublicPromos((s) => s.load);
  const activeCode = useShop((s) => (product ? s.promoCodes[product.storeId] : undefined));
  const setPromoCode = useShop((s) => s.setPromoCode);
  useEffect(() => {
    if (storeRemoteId) loadPromos(storeRemoteId);
  }, [storeRemoteId, loadPromos]);

  // Sert aux sections « Pour vous » et « Récemment consultés » de l'accueil.
  const viewedId = product?.id;
  const viewedCategory = product?.categoryId;
  useEffect(() => {
    if (viewedId && viewedCategory) useHistory.getState().viewProduct({ id: viewedId, categoryId: viewedCategory });
  }, [viewedId, viewedCategory]);

  if (!product) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Produit" />
        <EmptyState icon={SearchX} title="Produit introuvable" message="Ce produit n’est plus disponible." actionLabel="Retour à l’accueil" onAction={() => router.replace('/')} />
      </View>
    );
  }

  const store = getStore(product.storeId);
  const isOwn = !!ownSlug && ownSlug === product.storeId;
  const category = getCategory(product.categoryId);

  // Photos : toutes celles du vendeur, sinon la photo d'exemple.
  const ratio = Math.min(Math.max(product.aspect, 0.9), 1.15);
  const galleryHeight = Math.round(width * ratio);
  const photos = product.imageUris?.length ? product.imageUris : product.imageUri ? [productImageUri(product, width, ratio)] : demoGallery(product.photoId, width, ratio);

  const needsSize = !!product.sizes?.length;
  const needsVariant = !!product.variants?.length;
  // Avec des variantes (« Rouge · M »), la couleur fait déjà partie du choix.
  const colorChoice = !needsVariant && !!product.colors?.length;
  const color = colorChoice ? (product.colors!.length === 1 ? product.colors![0] : pickedColor) : undefined;
  const chosen = product.variants?.find((v) => v.label === variant);
  const soldOut = product.stock === 0 && !needsVariant;
  const canBuy = !soldOut && product.salesEnabled !== false;

  const price = chosen?.price ?? product.price;
  const oldPrice = chosen ? undefined : product.oldPrice;
  const percent = discountPercent(price, oldPrice);
  const [amount, currency] = priceParts(price);
  const available = chosen?.stock ?? product.stock;
  const maxQuantity = Math.max(1, Math.min(available ?? 99, 99));
  const count = Math.min(quantity, maxQuantity);

  const openStore = () => store && router.push({ pathname: '/store/[id]', params: { id: store.id } });

  const onAdd = (buyNow = false) => {
    if (needsVariant && !variant) {
      haptics.light();
      setChoiceError('Choisissez une option avant de continuer.');
      return;
    }
    if (colorChoice && !color) {
      haptics.light();
      setChoiceError('Choisissez une couleur avant de continuer.');
      return;
    }
    if (needsSize && !size) {
      haptics.light();
      setChoiceError('Choisissez votre taille avant de continuer.');
      return;
    }
    setChoiceError(null);
    for (let i = 0; i < count; i += 1) addToCart(product.id, size, variant, color);
    // Arrivée par une annonce sponsorisée : l'ajout au panier lui est attribué.
    if (ad) trackAd({ id: ad }, 'add_to_cart');
    haptics.success();
    if (buyNow) router.push('/cart');
  };

  const onShare = () =>
    Share.share({
      message: `${product.name} sur BoutiQ — ${Linking.createURL(`/product/${product.id}`)}`,
    }).catch(() => {});

  const onMessage = async () => {
    if (!store?.remoteId) return;
    haptics.light();
    try {
      const conversation = await openConversation(store.remoteId);
      router.push({ pathname: '/chat/[id]', params: { id: conversation, title: store.name, sub: 'Boutique' } });
    } catch (e) {
      Alert.alert('Message impossible', (e as Error).message);
    }
  };

  const banner = store ? storeBannerUri(store, width - spacing.screen * 2, 0.32) : undefined;
  const longDescription = product.description.length > 240;
  const details: [string, string][] = [
    ...(category ? ([['Catégorie', category.name]] as [string, string][]) : []),
    ...(product.collection ? ([['Collection', product.collection]] as [string, string][]) : []),
    ...(product.colors?.length ? ([['Couleurs', product.colors.join(', ')]] as [string, string][]) : []),
    ...(product.sizes?.length ? ([['Tailles', product.sizes.join(', ')]] as [string, string][]) : []),
    ...(store ? ([['Vendu par', store.name], ['Expédié depuis', [store.city, store.country].filter(Boolean).join(', ')]] as [string, string][]) : []),
  ];

  return (
    <View style={styles.screen}>
      {/* Barre du haut : retour, recherche, panier */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <CircleIconButton size={40} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Retour">
          <ChevronLeft size={22} strokeWidth={1.9} color={colors.text} />
        </CircleIconButton>
        <Pressable onPress={() => router.push('/search')} accessibilityRole="search" accessibilityLabel="Rechercher sur BoutiQ" style={({ pressed }) => [styles.search, pressed && { opacity: 0.7 }]}>
          <Search size={17} strokeWidth={1.8} color={colors.textSecondary} />
          <Text style={styles.searchText} numberOfLines={1}>
            Rechercher sur BoutiQ
          </Text>
        </Pressable>
        <CartIconButton />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 118 + insets.bottom }}>
        {/* La boutique, puis le nom de l'article */}
        <View style={styles.top}>
          {store && (
            <Pressable onPress={openStore} accessibilityRole="link" accessibilityLabel={`Visiter la boutique ${store.name}`} style={({ pressed }) => [styles.storeRow, pressed && { opacity: 0.7 }]}>
              <StoreAvatar store={store} size={38} />
              <View style={{ flex: 1 }}>
                <View style={styles.storeNameRow}>
                  <Text style={styles.storeName} numberOfLines={1}>
                    {store.name}
                  </Text>
                  {store.verified && <BadgeCheck size={15} color={colors.caramel} strokeWidth={2} />}
                </View>
                <Text style={styles.visitLink}>Visiter la boutique</Text>
              </View>
              <ChevronRight size={18} strokeWidth={1.8} color={colors.textSecondary} />
            </Pressable>
          )}
          <Text style={styles.title}>{product.name}</Text>
          {product.reviewsCount > 0 && (
            <View style={styles.rating}>
              <Text style={styles.ratingValue}>{product.rating.toFixed(1).replace('.', ',')}</Text>
              <Stars rating={product.rating} />
              <Text style={styles.ratingCount}>({product.reviewsCount} avis)</Text>
            </View>
          )}
        </View>

        {/* Photos */}
        <ProductGallery
          images={photos}
          width={width}
          height={galleryHeight}
          placeholder={product.imageUri ? undefined : photoUrl(product.photoId, 180, product.aspect)}
        >
          {percent ? (
            <View style={styles.galleryBadge} pointerEvents="none">
              <Text style={styles.galleryBadgeText}>-{percent} %</Text>
            </View>
          ) : null}
          <View style={styles.galleryActions}>
            <FavoriteButton productId={product.id} size={40} />
            <CircleIconButton variant="glass" size={40} onPress={onShare} accessibilityLabel="Partager">
              <Share2 size={18} strokeWidth={1.8} color={colors.text} />
            </CircleIconButton>
          </View>
        </ProductGallery>

        {/* Prix */}
        <View style={styles.section}>
          {percent ? <Text style={styles.dealTag}>Promotion</Text> : null}
          <View style={styles.priceRow}>
            {percent ? <Text style={styles.percent}>-{percent} %</Text> : null}
            <Text style={styles.amount}>{amount}</Text>
            <Text style={styles.currency}>{currency}</Text>
          </View>
          {percent && oldPrice ? (
            <View style={styles.oldRow}>
              <Text style={styles.oldLabel}>
                Prix habituel : <Text style={styles.oldValue}>{formatFCFA(oldPrice)}</Text>
              </Text>
              <View style={styles.saving}>
                <Text style={styles.savingText}>Vous économisez {formatFCFA(oldPrice - price)}</Text>
              </View>
            </View>
          ) : null}

          {storeOffer ? (
            <View style={styles.offer}>
              <View>
                <Tag size={17} strokeWidth={1.9} color={colors.cognac} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerTitle}>Offre de la boutique</Text>
                <Text style={styles.offerText}>{storeOffer}</Text>
              </View>
            </View>
          ) : null}

          {promos?.map((promo) => {
            const on = activeCode === promo.code;
            return (
              <View key={promo.id} style={[styles.offer, on && styles.couponOn]}>
                <View>
                  <TicketPercent size={19} strokeWidth={1.8} color={on ? colors.successText : colors.cognac} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.offerTitle, on && { color: colors.successText }]}>Code promo {promo.code}</Text>
                  <Text style={[styles.offerText, on && { color: colors.successText }]}>{on ? 'Activé : la réduction s’applique à la commande.' : promoSummary(promo)}</Text>
                </View>
                {!isOwn && (
                  <Pressable
                    onPress={() => {
                      haptics.selection();
                      setPromoCode(product.storeId, on ? null : promo.code);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={on ? `Retirer le code ${promo.code}` : `Activer le code ${promo.code}`}
                    style={({ pressed }) => [styles.couponButton, on && styles.couponButtonOn, pressed && { opacity: 0.7 }]}
                  >
                    {on ? (
                      <View>
                        <Check size={15} strokeWidth={2.4} color={colors.successText} />
                      </View>
                    ) : null}
                    <Text style={[styles.couponButtonText, on && { color: colors.successText }]}>{on ? 'Activé' : 'Activer'}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          <Text style={[styles.stock, soldOut && { color: colors.promo }, !soldOut && available != null && available <= LOW_STOCK && { color: colors.promo }]}>
            {soldOut
              ? 'Épuisé pour le moment'
              : available != null && available > 0 && available <= LOW_STOCK
                ? `Plus que ${available} en stock`
                : 'En stock'}
          </Text>
        </View>

        {/* Options : variantes, couleurs, tailles */}
        {!!product.variants?.length && (
          <View style={styles.section}>
            <Text style={styles.blockTitle}>Choisissez</Text>
            {product.variants.map((v) => {
              const active = v.label === variant;
              const out = v.stock <= 0;
              return (
                <Pressable
                  key={v.label}
                  disabled={out}
                  onPress={() => {
                    haptics.selection();
                    setVariant(v.label);
                    setChoiceError(null);
                  }}
                  style={[styles.variantRow, active && styles.variantActive, out && { opacity: 0.45 }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active, disabled: out }}
                >
                  <Text style={[styles.description, active && { fontFamily: fonts.semibold }]}>{v.label}</Text>
                  <Text style={styles.variantPrice}>{out ? 'Épuisé' : formatFCFA(v.price)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {!!product.colors?.length && (
          <View style={styles.section}>
            <Text style={styles.blockTitle}>
              {colorChoice ? 'Couleur' : 'Couleurs disponibles'}
              {colorChoice && color ? <Text style={styles.blockValue}> : {color}</Text> : null}
            </Text>
            <View style={styles.sizes}>
              {product.colors.map((c) => {
                const active = colorChoice && c === color;
                const hex = COLOR_PRESETS.find((preset) => preset.name === c)?.hex;
                const swatch = hex ? <View style={[styles.swatch, { backgroundColor: hex }]} /> : null;
                if (!colorChoice) {
                  return (
                    <View key={c} style={[styles.size, styles.colorChip]}>
                      {swatch}
                      <Text style={styles.sizeText}>{c}</Text>
                    </View>
                  );
                }
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      haptics.selection();
                      setPickedColor(c);
                      setChoiceError(null);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Couleur ${c}`}
                    style={[styles.size, styles.colorChip, active && styles.colorActive]}
                  >
                    {swatch}
                    <Text style={styles.sizeText}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {needsSize && (
          <View style={styles.section}>
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
                      setChoiceError(null);
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

        {/* Quantité */}
        {canBuy && (
          <View style={[styles.section, styles.quantityRow]}>
            <Text style={styles.blockTitleInline}>Quantité</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => {
                  haptics.selection();
                  setQuantity(Math.max(1, count - 1));
                }}
                disabled={count <= 1}
                accessibilityRole="button"
                accessibilityLabel="Diminuer la quantité"
                style={[styles.stepButton, count <= 1 && { opacity: 0.35 }]}
              >
                <Minus size={17} strokeWidth={2} color={colors.text} />
              </Pressable>
              <Text style={styles.stepValue} accessibilityLabel={`Quantité : ${count}`}>
                {count}
              </Text>
              <Pressable
                onPress={() => {
                  haptics.selection();
                  setQuantity(Math.min(maxQuantity, count + 1));
                }}
                disabled={count >= maxQuantity}
                accessibilityRole="button"
                accessibilityLabel="Augmenter la quantité"
                style={[styles.stepButton, count >= maxQuantity && { opacity: 0.35 }]}
              >
                <Plus size={17} strokeWidth={2} color={colors.text} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Livraison et paiement */}
        <View style={[styles.section, styles.infoCard]}>
          <View style={styles.infoRow}>
            <View>
              <Truck size={20} strokeWidth={1.6} color={colors.cognac} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Livraison</Text>
              <Text style={styles.infoText}>{product.deliveryNote ?? store?.delivery ?? 'Livraison locale et régionale'}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View>
              <ShieldCheck size={20} strokeWidth={1.6} color={colors.cognac} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Paiement protégé</Text>
              <Text style={styles.infoText}>Mobile Money, carte bancaire ou à la livraison</Text>
            </View>
          </View>
        </View>

        {/* À propos de l'article */}
        {!!product.description && (
          <View style={styles.section}>
            <Text style={styles.blockTitle}>À propos de cet article</Text>
            <Text style={styles.description} numberOfLines={longDescription && !expanded ? 5 : undefined}>
              {product.description}
            </Text>
            {longDescription && (
              <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8} accessibilityRole="button" style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                <Text style={styles.more}>{expanded ? 'Réduire' : 'Lire la suite'}</Text>
              </Pressable>
            )}
          </View>
        )}

        {details.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.blockTitle}>Détails</Text>
            <View style={styles.table}>
              {details.map(([label, value], i) => (
                <View key={label} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={styles.tableLabel}>{label}</Text>
                  <Text style={styles.tableValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* La boutique */}
        {store && (
          <View style={styles.section}>
            <Text style={styles.blockTitle}>La boutique</Text>
            <View style={styles.storeCard}>
              <Pressable onPress={openStore} accessibilityRole="link" accessibilityLabel={`Voir la boutique ${store.name}`} style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <View style={[styles.storeBanner, { backgroundColor: store.logoColor }]}>
                  {banner ? <Image source={{ uri: banner }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} /> : null}
                </View>
                <View style={styles.storeBody}>
                  <View style={styles.storeAvatar}>
                    <StoreAvatar store={store} size={60} />
                  </View>
                  <View style={{ flex: 1, gap: 2, marginTop: 8 }}>
                    <View style={styles.storeNameRow}>
                      <Text style={styles.storeCardName} numberOfLines={1}>
                        {store.name}
                      </Text>
                      {store.verified && <BadgeCheck size={16} color={colors.caramel} strokeWidth={2} />}
                    </View>
                    <Text style={typography.caption} numberOfLines={1}>
                      {[store.city, store.reviewsCount > 0 ? `${store.rating.toFixed(1).replace('.', ',')} ★` : null, `${formatCount(store.followers)} abonné${store.followers > 1 ? 's' : ''}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                </View>
                {!!store.description && (
                  <Text style={styles.storeDescription} numberOfLines={2}>
                    {store.description}
                  </Text>
                )}
              </Pressable>
              <View style={styles.storeActions}>
                <Pressable onPress={openStore} accessibilityRole="button" style={({ pressed }) => [styles.storeButton, styles.storeButtonDark, pressed && { opacity: 0.8 }]}>
                  <View>
                    <StoreIcon size={16} strokeWidth={1.9} color={colors.white} />
                  </View>
                  <Text style={[styles.storeButtonText, { color: colors.white }]}>Voir la boutique</Text>
                </Pressable>
                {!isOwn && store.remoteId ? (
                  <Pressable onPress={onMessage} accessibilityRole="button" style={({ pressed }) => [styles.storeButton, pressed && { opacity: 0.7 }]}>
                    <View>
                      <MessageCircle size={16} strokeWidth={1.9} color={colors.text} />
                    </View>
                    <Text style={styles.storeButtonText}>Message</Text>
                  </Pressable>
                ) : null}
                {!isOwn && <FollowButton storeId={store.id} compact />}
              </View>
            </View>
          </View>
        )}

        {/* Articles similaires */}
        <ProductRail
          title={similar.samePrice ? 'Articles similaires au même prix' : 'Articles similaires'}
          subtitle={similar.samePrice ? `Autour de ${formatFCFA(product.price)}` : category ? `Dans la catégorie ${category.name}` : undefined}
          products={similar.items}
          actionLabel="Voir tout"
          onAction={() => router.push({ pathname: '/search', params: { category: product.categoryId } })}
        />
        <ProductRail
          title="Dans la même boutique"
          subtitle={store ? `Autres articles de ${store.name}` : undefined}
          products={fromStore}
          showStore={false}
          actionLabel={store ? 'Voir tout' : undefined}
          onAction={openStore}
        />
      </ScrollView>

      {/* Barre d'achat translucide */}
      <View style={[styles.buyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <GlassSurface borderRadius={0} />
        {choiceError ? (
          <View style={styles.choiceError}>
            <Text style={styles.choiceErrorText}>{choiceError}</Text>
          </View>
        ) : null}
        {soldOut ? (
          <View style={styles.salesSoon}>
            <Text style={styles.salesSoonText}>Ce produit est épuisé pour le moment.</Text>
          </View>
        ) : product.salesEnabled === false ? (
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
              style={{ flex: 1.6, paddingHorizontal: 12 }}
            />
            <PrimaryButton label="Acheter" variant={isDark ? 'light' : 'caramel'} onPress={() => onAdd(true)} style={{ flex: 1, paddingHorizontal: 12 }} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.screen,
    paddingBottom: 10,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  search: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },

  top: { paddingHorizontal: spacing.screen, paddingTop: 12, paddingBottom: 12, gap: 10 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  storeName: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text, flexShrink: 1 },
  visitLink: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.caramel, marginTop: 1 },
  title: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 24, color: colors.text },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingValue: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  ratingCount: { fontFamily: fonts.regular, fontSize: 13, color: colors.caramel },

  galleryBadge: { position: 'absolute', left: 12, top: 12, backgroundColor: colors.promo, borderRadius: radii.xs, paddingHorizontal: 9, paddingVertical: 4 },
  galleryBadgeText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  galleryActions: { position: 'absolute', right: 12, top: 12, gap: 10 },

  section: { paddingHorizontal: spacing.screen, marginTop: spacing.xl },
  dealTag: { alignSelf: 'flex-start', fontFamily: fonts.bold, fontSize: 12, color: colors.white, backgroundColor: colors.promo, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.xs, overflow: 'hidden', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', columnGap: 8 },
  percent: { fontFamily: fonts.regular, fontSize: 28, lineHeight: 34, color: colors.promo, letterSpacing: -0.5 },
  amount: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 34, color: colors.text, letterSpacing: -0.8 },
  currency: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 5, marginLeft: -3 },
  oldRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 10, rowGap: 6, marginTop: 6 },
  oldLabel: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textSecondary },
  oldValue: { textDecorationLine: 'line-through' },
  saving: { backgroundColor: colors.dangerBg, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  savingText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.promo },
  offer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.caramel,
    backgroundColor: colors.tintSoft,
  },
  couponOn: { borderColor: colors.successBorder, backgroundColor: colors.successBg },
  couponButton: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.buttonPrimary },
  couponButtonOn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.successBorder },
  couponButtonText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },
  offerTitle: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.cognac },
  offerText: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.chocolate, marginTop: 1 },
  stock: { fontFamily: fonts.semibold, fontSize: 15, color: IN_STOCK, marginTop: spacing.md },

  blockTitle: { ...typography.h3, marginBottom: 10 },
  blockTitleInline: { ...typography.h3 },
  variantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  variantActive: { borderColor: colors.text, borderWidth: 2 },
  variantPrice: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
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
  blockValue: { fontFamily: fonts.regular, color: colors.textSecondary },
  colorChip: { flexDirection: 'row', gap: 8 },
  colorActive: { borderColor: colors.text, borderWidth: 2 },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(25,25,25,0.18)' },
  sizeActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  sizeText: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },

  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  stepButton: { width: 44, height: 42, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 30, textAlign: 'center', fontFamily: fonts.bold, fontSize: 16, color: colors.text },

  infoCard: { marginHorizontal: spacing.screen, paddingHorizontal: 14, paddingVertical: 4, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  infoDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  infoTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  infoText: { ...typography.caption, fontSize: 13, color: colors.textSoft, marginTop: 1 },

  description: { ...typography.body, lineHeight: 23, color: colors.textBody },
  more: { fontFamily: fonts.semibold, fontSize: 14, color: colors.caramel },
  table: { borderRadius: radii.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 12, backgroundColor: colors.surface },
  tableRowAlt: { backgroundColor: colors.backgroundAlt },
  tableLabel: { width: 118, fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  tableValue: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, color: colors.textBody },

  storeCard: { borderRadius: radii.lg, backgroundColor: colors.surface, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadows.soft },
  storeBanner: { height: 96, backgroundColor: colors.champagne },
  storeBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 14 },
  storeAvatar: { borderRadius: 34, marginTop: -26, ...shadows.soft },
  storeCardName: { fontFamily: fonts.bold, fontSize: 16.5, color: colors.text, flexShrink: 1 },
  storeDescription: { ...typography.caption, fontSize: 13, lineHeight: 18, paddingHorizontal: 14, marginTop: 10 },
  storeActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 14 },
  storeButton: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  storeButtonDark: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  storeButtonText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },

  choiceError: { position: 'absolute', left: 16, right: 16, top: -38, alignItems: 'center' },
  choiceErrorText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.white, backgroundColor: colors.promo, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, overflow: 'hidden' },
  salesSoon: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.tint,
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
