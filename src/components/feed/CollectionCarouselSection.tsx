import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { CollectionCard } from '@/feed/types';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import { discountPercent, formatFCFA } from '@/utils/format';
import { productImageUri } from '@/utils/images';

import { FeedHeader } from './FeedHeader';

const PAD = 14;
const GAP = 10;

function openCollection(card: CollectionCard) {
  router.push({ pathname: '/search', params: card.link.promo ? { promo: '1' } : { category: card.link.category ?? '' } });
}

/** Format B — grandes cartes de quatre produits (2 × 2) qui défilent sur le côté. */
export function CollectionCarouselSection({ title, cards }: { title: string; cards: CollectionCard[] }) {
  const { width } = useWindowDimensions();
  // La carte suivante dépasse à droite pour inviter à faire défiler.
  const cardWidth = Math.min(width - 68, 360);
  // 2 px : la bordure de la carte, sinon la deuxième vignette passe à la ligne.
  const tile = Math.floor((cardWidth - PAD * 2 - GAP - 2) / 2);
  return (
    <View>
      <FeedHeader title={title} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardWidth + 12} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: 12 }}>
        {cards.map((card) => (
          <View key={card.id} style={[styles.card, { width: cardWidth }]}>
            <Pressable onPress={() => openCollection(card)} accessibilityRole="link" accessibilityLabel={`${card.title} : tout voir`} style={({ pressed }) => [styles.head, pressed && { opacity: 0.6 }]}>
              <Text style={styles.title} numberOfLines={1}>
                {card.title}
              </Text>
              <ChevronRight size={20} strokeWidth={1.9} color={colors.text} />
            </Pressable>
            <View style={styles.grid}>
              {card.products.map((p) => {
                const percent = discountPercent(p.price, p.oldPrice);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
                    accessibilityLabel={`${p.name}, ${formatFCFA(p.price)}`}
                    style={({ pressed }) => [styles.tile, { width: tile }, pressed && { opacity: 0.85 }]}
                  >
                    <Image source={{ uri: productImageUri(p, tile, 1) }} style={{ width: tile, height: tile, backgroundColor: colors.placeholder }} contentFit="cover" cachePolicy="memory-disk" transition={200} />
                    <View style={styles.tileBody}>
                      {percent ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{percent} % de rabais</Text>
                        </View>
                      ) : null}
                      <Text style={typography.price} numberOfLines={1}>
                        {formatFCFA(p.price)}
                      </Text>
                      {!percent ? (
                        <Text style={styles.name} numberOfLines={1}>
                          {p.name}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: PAD },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: { borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.backgroundAlt },
  tileBody: { paddingHorizontal: 8, paddingVertical: 8, gap: 4, minHeight: 58 },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.promo, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },
  name: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
});
