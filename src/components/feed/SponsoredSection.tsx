import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowRight, BadgeCheck, Info, Star } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { trackAd } from '@/feed/campaigns';
import type { Campaign } from '@/feed/types';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import type { Product, Store } from '@/types';
import { discountPercent, formatFCFA } from '@/utils/format';
import { photoUrl, productImageUri, storeBannerUri } from '@/utils/images';

const HEIGHT = 216;

interface Props {
  campaign: Campaign;
  product?: Product;
  store: Store;
  /** Image à gauche, texte à droite. */
  flip: boolean;
}

/**
 * Format C — grande annonce sponsorisée, pleine largeur : texte d'un côté, photo de l'autre.
 * Toujours signalée par la mention « Sponsorisé ».
 */
export function SponsoredSection({ campaign, product, store, flip }: Props) {
  const image = product ? productImageUri(product, 220, 1.2) : (storeBannerUri(store, 220, 1.2) ?? (store.bannerPhotoId ? photoUrl(store.bannerPhotoId, 220, 1.2) : undefined));
  const percent = product ? discountPercent(product.price, product.oldPrice) : null;

  const open = () => {
    trackAd(campaign, 'click');
    if (campaign.kind === 'product' && product) router.push({ pathname: '/product/[id]', params: { id: product.id, ad: campaign.id } });
    else router.push({ pathname: '/store/[id]', params: { id: store.id } });
  };

  const about = () =>
    Alert.alert('Annonce sponsorisée', `${store.name} paie pour mettre cette annonce en avant sur l’accueil. Le prix et le produit sont ceux de la boutique.`);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={open} accessibilityRole="link" accessibilityLabel={`Annonce sponsorisée de ${store.name} : ${campaign.headline}`} style={({ pressed }) => [styles.card, flip && { flexDirection: 'row-reverse' }, pressed && { opacity: 0.9 }]}>
        <View style={styles.text}>
          <View style={styles.storeRow}>
            <Text style={styles.store} numberOfLines={1}>
              {store.name}
            </Text>
            {store.verified ? <BadgeCheck size={14} color={colors.caramel} strokeWidth={2} /> : null}
          </View>
          <Text style={styles.headline} numberOfLines={3}>
            {campaign.headline}
          </Text>
          {campaign.tagline ? (
            <Text style={styles.tagline} numberOfLines={2}>
              {campaign.tagline}
            </Text>
          ) : null}
          {product && product.reviewsCount > 0 ? (
            <View style={styles.rating}>
              <Text style={styles.ratingValue}>{product.rating.toFixed(1).replace('.', ',')}</Text>
              <Star size={13} color={colors.gold} fill={colors.gold} strokeWidth={1.6} />
              <Text style={styles.ratingCount}>{product.reviewsCount}</Text>
            </View>
          ) : null}
          {product ? (
            <View style={styles.priceRow}>
              <Text style={[typography.price, { fontSize: 17 }]}>{formatFCFA(product.price)}</Text>
              {percent && product.oldPrice ? <Text style={styles.old}>{formatFCFA(product.oldPrice)}</Text> : null}
            </View>
          ) : null}
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{campaign.cta}</Text>
            <ArrowRight size={16} strokeWidth={2} color={colors.cognac} />
          </View>
        </View>
        <View style={styles.photo}>{image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={220} /> : null}</View>
      </Pressable>
      <Pressable onPress={about} hitSlop={8} accessibilityRole="button" accessibilityLabel="Pourquoi je vois cette annonce" style={styles.mention}>
        <Text style={styles.mentionText}>{campaign.demo ? 'Sponsorisé · exemple' : 'Sponsorisé'}</Text>
        <Info size={13} strokeWidth={1.8} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.screen },
  card: { flexDirection: 'row', height: HEIGHT, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  text: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'center', gap: 5 },
  photo: { flex: 1, backgroundColor: colors.placeholder },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  store: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  headline: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 23, letterSpacing: -0.3, color: colors.text },
  tagline: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17, color: colors.textSoft },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingValue: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  ratingCount: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 8 },
  old: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, textDecorationLine: 'line-through' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  ctaText: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.cognac },
  mention: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, paddingTop: 6 },
  mentionText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
});
