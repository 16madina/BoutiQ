import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { DEMO_DATA, feedProducts, peekProducts } from '@/api/catalog';
import { useRemoteCatalog } from '@/api/remoteCatalog';
import { PressableScale } from '@/components/PressableScale';
import { POSTERS, type Poster } from '@/data/posters';
import { colors, fonts, radii, shadows, spacing } from '@/theme';
import type { Product } from '@/types';
import { discountPercent } from '@/utils/format';
import { photoUrl, productImageUri } from '@/utils/images';

const GAP = 12;

function PhotoPoster({ poster, width, height }: { poster: Extract<Poster, { kind: 'photo' }>; width: number; height: number }) {
  const photoTop = Math.round(height * 0.34);
  return (
    <PressableScale
      activeScale={0.98}
      onPress={() => router.push(poster.link)}
      accessibilityLabel={`${poster.kicker}. ${poster.title.replace('\n', ' ')}`}
      style={[styles.poster, { width, height, backgroundColor: poster.background }]}
    >
      <Image
        source={{ uri: photoUrl(poster.photoId, width, (height - photoTop) / width) }}
        style={[styles.photo, { top: photoTop }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={250}
      />
      {/* Fondu de la couleur de l'affiche vers la photo */}
      <LinearGradient
        colors={[poster.background, `${poster.background}00`]}
        style={[styles.fade, { top: photoTop - 1 }]}
      />
      <View style={styles.head}>
        <Text style={styles.kicker} numberOfLines={1}>
          {poster.kicker}
        </Text>
        <Text style={styles.title} numberOfLines={3}>
          {poster.title}
        </Text>
      </View>
    </PressableScale>
  );
}

function GridTile({ product, showDiscount, size }: { product: Product; showDiscount: boolean; size: number }) {
  const percent = showDiscount ? discountPercent(product.price, product.oldPrice) : null;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
      accessibilityLabel={percent ? `${product.name}, ${percent} % de rabais` : product.name}
      style={({ pressed }) => [styles.tile, { width: size, height: size }, pressed && { opacity: 0.85 }]}
    >
      <Image
        source={{ uri: productImageUri(product, size, 1) }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
      />
      {percent ? (
        <View style={styles.tileBadge}>
          <Text style={styles.tileBadgeText}>-{percent}{' '}%</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function GridPoster({ poster, width, height }: { poster: Extract<Poster, { kind: 'grid' }>; width: number; height: number }) {
  const products = useMemo(() => peekProducts(poster.productIds), [poster.productIds]);
  const pad = 12;
  const tileGap = 8;
  const tile = Math.floor((width - pad * 2 - tileGap) / 2);
  return (
    <View style={[styles.poster, { width, height, backgroundColor: poster.background, padding: pad }]}>
      <Pressable onPress={() => router.push(poster.link)} accessibilityRole="link" style={({ pressed }) => [styles.gridHead, pressed && { opacity: 0.8 }]}>
        <Text style={[styles.title, styles.gridTitle]} numberOfLines={3}>
          {poster.title}
        </Text>
      </Pressable>
      <View style={[styles.grid, { gap: tileGap }]}>
        {products.slice(0, 4).map((p) => (
          <GridTile key={p.id} product={p} showDiscount={poster.showDiscount} size={tile} />
        ))}
      </View>
      <Pressable onPress={() => router.push(poster.link)} accessibilityRole="link" hitSlop={8} style={styles.more}>
        <Text style={styles.moreText}>Voir plus</Text>
        <ArrowRight size={15} color={colors.white} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

/**
 * Affiches à montrer. Sans le catalogue de démonstration, les affiches photo restent ;
 * une affiche « grille » n'apparaît que s'il y a 4 vrais produits pour la remplir.
 */
function useLivePosters(): Poster[] {
  const syncedAt = useRemoteCatalog((s) => s.syncedAt);
  return useMemo(() => {
    if (DEMO_DATA) return POSTERS;
    const promos = feedProducts({ onlyPromo: true, sort: 'discount' });
    const all = feedProducts({ sort: 'relevance' });
    let promoStart = 0;
    let recentUsed = false;
    const result: Poster[] = [];
    for (const p of POSTERS) {
      // Les affiches photo sont de la décoration : elles restent toujours visibles.
      if (p.kind === 'photo') {
        result.push(p);
        continue;
      }
      const source = p.showDiscount ? promos.slice(promoStart, promoStart + 4) : recentUsed ? [] : all.slice(0, 4);
      if (source.length < 4) continue;
      if (p.showDiscount) promoStart += 4;
      else recentUsed = true;
      const [a, b, c, d] = source.map((x) => x.id);
      result.push({ ...p, productIds: [a, b, c, d] });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncedAt]);
}

/** Rangée d'affiches verticales (façon vitrine de grand magasin), à faire défiler horizontalement. */
export function PosterRail() {
  const posters = useLivePosters();
  const { width: screen } = useWindowDimensions();
  // Une affiche et demie visible sur téléphone : on comprend tout de suite que ça défile.
  const width = Math.min(Math.round((screen - spacing.screen) * 0.64), 280);
  const height = Math.round(width * 1.5);
  if (posters.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={width + GAP}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: GAP, paddingBottom: 6 }}
    >
      {posters.map((p) =>
        p.kind === 'photo' ? (
          <PhotoPoster key={p.id} poster={p} width={width} height={height} />
        ) : (
          <GridPoster key={p.id} poster={p} width={width} height={height} />
        ),
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  poster: { borderRadius: radii.lg, overflow: 'hidden', ...shadows.card },
  photo: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fade: { position: 'absolute', left: 0, right: 0, height: 70 },
  head: { paddingHorizontal: 16, paddingTop: 16 },
  kicker: { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255,255,255,0.88)' },
  title: { fontFamily: fonts.bold, fontSize: 25, lineHeight: 28, letterSpacing: -0.6, color: colors.white, marginTop: 6 },
  gridHead: { minHeight: 64, marginBottom: 10 },
  gridTitle: { fontSize: 22, lineHeight: 25, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { borderRadius: radii.sm, overflow: 'hidden', backgroundColor: colors.white },
  tileBadge: { position: 'absolute', left: 6, bottom: 6, backgroundColor: colors.promo, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tileBadgeText: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.white },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto', alignSelf: 'flex-start' },
  moreText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.white },
});
