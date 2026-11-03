import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { FavoriteButton } from '@/components/FavoriteButton';
import { PressableScale } from '@/components/PressableScale';
import { ProductPrice } from '@/components/ProductPrice';
import { colors, fonts, spacing } from '@/theme';
import type { Product } from '@/types';
import type { StorefrontCollection, StorefrontPalette, StorefrontTemplate } from '@/types/storefront';
import { haptics } from '@/utils/haptics';
import { productImageUri } from '@/utils/images';

/* ------------------------------------------------------------- Titre */

export function StoreSectionTitle({
  title,
  kicker,
  template,
  palette,
  right,
}: {
  title: string;
  kicker?: string;
  template: StorefrontTemplate;
  palette: StorefrontPalette;
  right?: ReactNode;
}) {
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        {kicker ? <Text style={[styles.kicker, { color: palette.accentInk }]}>{kicker}</Text> : null}
        <Text
          style={[styles.title, { fontFamily: template.titleFont === 'serif' ? fonts.serif : fonts.bold }]}
          accessibilityRole="header"
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

/* ------------------------------------------------------- Collections */

const SHAPES = {
  portrait: { w: 150, h: 200 },
  landscape: { w: 230, h: 140 },
  square: { w: 132, h: 132 },
  round: { w: 92, h: 92 },
} as const;

export function CollectionShowcase({
  collections,
  template,
  palette,
  selectedId,
  onSelect,
}: {
  collections: StorefrontCollection[];
  template: StorefrontTemplate;
  palette: StorefrontPalette;
  selectedId?: string;
  onSelect: (c: StorefrontCollection | null) => void;
}) {
  const shape = SHAPES[template.collectionShape];
  const round = template.collectionShape === 'round';
  const overlayLabel = !round;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} decelerationRate="fast">
      {collections.map((c, i) => {
        const active = c.id === selectedId;
        return (
          <Animated.View key={c.id} entering={FadeInRight.delay(60 * i).springify().damping(18)}>
            <PressableScale
              onPress={() => {
                haptics.selection();
                onSelect(active ? null : c);
              }}
              activeScale={0.96}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Collection ${c.name}, ${c.count} article${c.count > 1 ? 's' : ''}`}
              style={{ width: shape.w, alignItems: round ? 'center' : undefined, gap: 8 }}
            >
              <View
                style={[
                  styles.cover,
                  {
                    width: shape.w,
                    height: shape.h,
                    borderRadius: round ? shape.w / 2 : template.radius,
                    borderColor: active ? palette.accent : 'transparent',
                  },
                ]}
              >
                {c.coverUri ? (
                  <Image source={{ uri: c.coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.accentSoft }]} />
                )}
                {overlayLabel && (
                  <>
                    <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
                    <View style={styles.coverLabel}>
                      <Text style={styles.coverName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={styles.coverCount}>
                        {c.count} article{c.count > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </>
                )}
              </View>
              {round && (
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.roundName, active && { color: palette.accentInk }]} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.roundCount}>{c.count}</Text>
                </View>
              )}
            </PressableScale>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

/* -------------------------------------------------- Rangée de produits */

export function ProductRail({
  products,
  template,
  palette,
  size = 'md',
  badge,
}: {
  products: Product[];
  template: StorefrontTemplate;
  palette: StorefrontPalette;
  size?: 'md' | 'lg';
  /** Pastille posée sur chaque photo (« Nouveau »…). */
  badge?: string;
}) {
  const width = size === 'lg' ? 236 : 168;
  const ratio = size === 'lg' ? 1.28 : 1.22;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} decelerationRate="fast">
      {products.map((p, i) => {
        const soldOut = (p.stock ?? 1) <= 0;
        return (
          <Animated.View key={p.id} entering={FadeInRight.delay(50 * i).springify().damping(18)} style={{ width }}>
            <PressableScale
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
              activeScale={0.97}
              accessibilityRole="button"
              accessibilityLabel={p.name}
              style={{ gap: 9 }}
            >
              <View style={[styles.railPhoto, { width, height: Math.round(width * ratio), borderRadius: template.radius }]}>
                <Image
                  source={{ uri: productImageUri(p, width, ratio) }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={250}
                  cachePolicy="memory-disk"
                  recyclingKey={p.id}
                />
                {badge && !soldOut ? (
                  <View style={[styles.pill, { backgroundColor: palette.accent }]}>
                    <Text style={[styles.pillText, { color: palette.onAccent }]}>{badge}</Text>
                  </View>
                ) : null}
                {soldOut ? (
                  <View style={[styles.pill, { backgroundColor: 'rgba(25,25,25,0.78)' }]}>
                    <Text style={[styles.pillText, { color: '#FFF9F1' }]}>Épuisé</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ gap: 4, paddingHorizontal: 2 }}>
                <Text style={styles.railName} numberOfLines={1}>
                  {p.name}
                </Text>
                <ProductPrice price={p.price} oldPrice={p.oldPrice} />
              </View>
            </PressableScale>
            <View style={styles.railHeart}>
              <FavoriteButton productId={p.id} size={32} />
            </View>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.screen, marginBottom: 14, gap: 12 },
  kicker: { fontFamily: fonts.bold, fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontSize: 23, color: colors.text, letterSpacing: -0.4 },
  rail: { paddingHorizontal: spacing.screen, gap: 12 },
  cover: { overflow: 'hidden', backgroundColor: colors.backgroundAlt, borderWidth: 2 },
  coverLabel: { position: 'absolute', left: 12, right: 12, bottom: 11 },
  coverName: { fontFamily: fonts.bold, fontSize: 16, color: '#FFF9F1' },
  coverCount: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,249,241,0.85)' },
  roundName: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  roundCount: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  railPhoto: { overflow: 'hidden', backgroundColor: colors.backgroundAlt },
  railName: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.text },
  railHeart: { position: 'absolute', top: 10, right: 10 },
  pill: { position: 'absolute', left: 10, top: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontFamily: fonts.bold, fontSize: 11.5, letterSpacing: 0.2 },
});
