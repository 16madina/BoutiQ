import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing, typography } from '@/theme';
import type { Product } from '@/types';
import { discountPercent, formatFCFA } from '@/utils/format';
import { productImageUri } from '@/utils/images';

import { FeedHeader } from './FeedHeader';

const CARD = 148;

/**
 * Format F — offres : bande colorée de produits à prix réduit ou à petit prix.
 * Aucun compte à rebours : les produits n'ont pas (encore) de date de fin d'offre.
 */
export function DealsSection({ title, subtitle, products }: { title: string; subtitle?: string; products: Product[] }) {
  return (
    <View style={styles.band}>
      <FeedHeader title={title} subtitle={subtitle} onAction={() => router.push({ pathname: '/search', params: { promo: '1' } })} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: 10 }}>
        {products.map((p) => {
          const percent = discountPercent(p.price, p.oldPrice);
          return (
            <Pressable
              key={p.id}
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
              accessibilityLabel={`${p.name}, ${formatFCFA(p.price)}`}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}
            >
              <View style={styles.image}>
                <Image source={{ uri: productImageUri(p, CARD, 1) }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
              </View>
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>
                  {p.name}
                </Text>
                {percent ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{percent} % de rabais</Text>
                  </View>
                ) : null}
                <Text style={typography.price} numberOfLines={1}>
                  {formatFCFA(p.price)}
                </Text>
                {percent && p.oldPrice ? (
                  <Text style={styles.saving} numberOfLines={1}>
                    Économisez {formatFCFA(p.oldPrice - p.price)}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: colors.backgroundAlt, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  card: { width: CARD, borderRadius: radii.md, backgroundColor: colors.surface, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  image: { width: CARD, height: CARD, backgroundColor: colors.placeholder },
  body: { padding: 10, gap: 4 },
  name: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.promo, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },
  saving: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.promo },
});
