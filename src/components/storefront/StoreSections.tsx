import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { FavoriteButton } from '@/components/FavoriteButton';
import { PressableScale } from '@/components/PressableScale';
import { ProductPrice } from '@/components/ProductPrice';
import { collectionEmoji } from '@/storefront/collectionIcons';
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
  onSeeAll,
}: {
  title: string;
  kicker?: string;
  template: StorefrontTemplate;
  palette: StorefrontPalette;
  right?: ReactNode;
  /** Affiche « Voir tout » à droite du titre. */
  onSeeAll?: () => void;
}) {
  const serif = template.titleFont === 'serif';
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        {kicker && template.kickers ? <Text style={[styles.kicker, { color: palette.accentInk }]}>{kicker}</Text> : null}
        <Text
          style={[styles.title, { fontFamily: serif ? fonts.serif : fonts.bold, fontSize: template.kickers ? 23 : 21 }]}
          accessibilityRole="header"
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      {right ??
        (onSeeAll ? (
          <Text style={[styles.seeAll, { color: template.kickers ? palette.accentInk : colors.text }]} onPress={onSeeAll} accessibilityRole="button">
            Voir tout
          </Text>
        ) : null)}
    </View>
  );
}

/* ------------------------------------------------------- Collections */

interface ShowcaseProps {
  collections: StorefrontCollection[];
  template: StorefrontTemplate;
  palette: StorefrontPalette;
  selectedId?: string;
  onSelect: (c: StorefrontCollection | null) => void;
  /** Largeur de l'écran (grilles et cartes). */
  width: number;
}

/** Rayons de la boutique, présentés selon le modèle (icônes, vignettes, cartes photo, grille). */
export function CollectionShowcase(props: ShowcaseProps) {
  const { collections, template, width } = props;
  const shape = template.collectionShape;

  if (shape === 'emoji-grid') {
    const gap = 10;
    const cell = Math.floor((width - spacing.screen * 2 - gap * 2) / 3);
    return (
      <View style={[styles.grid, { gap }]}>
        {collections.slice(0, 6).map((c, i) => (
          <CollectionItem key={c.id} c={c} i={i} {...props} size={cell} />
        ))}
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.rail, shape !== 'photo-card' && { gap: 14 }]} decelerationRate="fast">
      {collections.map((c, i) => (
        <CollectionItem key={c.id} c={c} i={i} {...props} size={shape === 'photo-card' ? Math.floor((width - spacing.screen * 2 - 12) / 2) : 0} />
      ))}
    </ScrollView>
  );
}

function CollectionItem({ c, i, template, palette, selectedId, onSelect, size }: ShowcaseProps & { c: StorefrontCollection; i: number; size: number }) {
  const active = c.id === selectedId;
  const shape = template.collectionShape;
  const press = () => {
    haptics.selection();
    onSelect(active ? null : c);
  };
  const a11y = {
    accessibilityRole: 'button' as const,
    accessibilityState: { selected: active },
    accessibilityLabel: `Rayon ${c.name}, ${c.count} article${c.count > 1 ? 's' : ''}`,
  };
  const label = (
    <Text style={[styles.itemLabel, active && { color: palette.accentInk, fontFamily: fonts.bold }]} numberOfLines={1}>
      {c.name}
    </Text>
  );
  const photo = c.coverUri ? <Image source={{ uri: c.coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} /> : null;
  const ring = { borderColor: active ? palette.accent : 'transparent', borderWidth: 2 };

  let body: ReactNode;
  switch (shape) {
    case 'photo-card': {
      body = (
        <View style={[styles.photoCard, { width: size, height: Math.round(size * 1.18), borderRadius: template.radius }, ring]}>
          {photo ?? <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.accentSoft }]} />}
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} locations={[0.5, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.photoCardLabel}>
            <Text style={styles.photoCardName} numberOfLines={1}>
              {c.name}
            </Text>
            <Text style={styles.photoCardCount}>
              {c.count} article{c.count > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      );
      break;
    }
    case 'round': {
      // Beauté : photo ronde, nom et nombre d'articles dessous (inchangé).
      body = (
        <View style={{ width: 92, alignItems: 'center', gap: 8 }}>
          <View style={[styles.roundPhoto, ring]}>{photo ?? <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.accentSoft }]} />}</View>
          <View style={{ alignItems: 'center' }}>
            {label}
            <Text style={styles.itemCount}>
              {c.count} article{c.count > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      );
      break;
    }
    case 'square': {
      // Électronique : vignette photo carrée, nom posé dessus.
      body = (
        <View style={[styles.photoCard, { width: 132, height: 132, borderRadius: template.radius }, ring]}>
          {photo ?? <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.accentSoft }]} />}
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.photoCardLabel}>
            <Text style={[styles.photoCardName, { fontFamily: fonts.bold, fontSize: 16 }]} numberOfLines={1}>
              {c.name}
            </Text>
            <Text style={styles.photoCardCount}>
              {c.count} article{c.count > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      );
      break;
    }
    case 'tile': {
      // Alimentation : vignette photo arrondie, nom et nombre d'articles dessous.
      body = (
        <View style={{ width: 100, alignItems: 'center', gap: 8 }}>
          <View style={[styles.tilePhoto, { borderRadius: template.radius }, ring]}>{photo ?? <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.accentSoft }]} />}</View>
          <View style={{ alignItems: 'center' }}>
            {label}
            <Text style={styles.itemCount}>
              {c.count} article{c.count > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      );
      break;
    }
    case 'emoji-circle': {
      const emoji = collectionEmoji(c.name);
      body = (
        <View style={styles.iconItem}>
          <View style={[styles.circle, { backgroundColor: palette.accentSoft }, ring]}>{emoji ? <Text style={styles.emoji}>{emoji}</Text> : photo}</View>
          {label}
        </View>
      );
      break;
    }
    case 'emoji-grid': {
      const emoji = collectionEmoji(c.name);
      body = (
        <View style={[styles.gridCell, { width: size, height: Math.round(size * 0.88), backgroundColor: palette.accentSoft }, ring]}>
          <View style={styles.gridIcon}>{emoji ? <Text style={styles.emoji}>{emoji}</Text> : <View style={styles.gridPhoto}>{photo}</View>}</View>
          {label}
        </View>
      );
      break;
    }
  }

  return (
    <Animated.View entering={FadeInRight.delay(50 * i).springify().damping(18)}>
      <PressableScale onPress={press} activeScale={0.95} {...a11y}>
        {body}
      </PressableScale>
    </Animated.View>
  );
}

/* -------------------------------------------------- Rangée de produits */

export function ProductRail({
  products,
  template,
  palette,
  size = 'md',
  badge,
  width,
}: {
  products: Product[];
  template: StorefrontTemplate;
  palette: StorefrontPalette;
  size?: 'md' | 'lg';
  /** Pastille posée sur chaque photo (« Nouveau »…), cartes classiques. */
  badge?: string;
  /** Largeur de l'écran : cartes deux par deux pour les modèles des maquettes. */
  width?: number;
}) {
  if (template.productStyle !== 'classic' && width && size === 'md') {
    const cardW = Math.floor((width - spacing.screen * 2 - 12) / 2);
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} decelerationRate="fast" snapToInterval={Platform.OS === 'web' ? undefined : cardW + 12}>
        {products.map((p, i) => (
          <Animated.View key={p.id} entering={FadeInRight.delay(40 * i).springify().damping(18)}>
            <StoreProductCard product={p} width={cardW} template={template} palette={palette} />
          </Animated.View>
        ))}
      </ScrollView>
    );
  }

  const cardWidth = size === 'lg' ? 236 : 168;
  const ratio = size === 'lg' ? 1.28 : 1.22;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} decelerationRate="fast">
      {products.map((p, i) => {
        const soldOut = (p.stock ?? 1) <= 0;
        return (
          <Animated.View key={p.id} entering={FadeInRight.delay(50 * i).springify().damping(18)} style={{ width: cardWidth }}>
            <PressableScale
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
              activeScale={0.97}
              accessibilityRole="button"
              accessibilityLabel={p.name}
              style={{ gap: 9 }}
            >
              <View style={[styles.railPhoto, { width: cardWidth, height: Math.round(cardWidth * ratio), borderRadius: template.radius }]}>
                <Image
                  source={{ uri: productImageUri(p, cardWidth, ratio) }}
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
                {soldOut ? <SoldOut /> : null}
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

function SoldOut() {
  return (
    <View style={[styles.pill, { backgroundColor: 'rgba(25,25,25,0.78)' }]}>
      <Text style={[styles.pillText, { color: '#FFF9F1' }]}>Épuisé</Text>
    </View>
  );
}

/** Carte produit des sections, deux par deux (Éditorial, Mode, Généraliste). */
function StoreProductCard({ product: p, width, template }: { product: Product; width: number; template: StorefrontTemplate; palette: StorefrontPalette }) {
  const soldOut = (p.stock ?? 1) <= 0;
  const boxed = template.productStyle === 'clean';
  const ratio = boxed ? 1 : 1.28;
  return (
    <View style={{ width }}>
      <PressableScale
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
        activeScale={0.97}
        accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
        accessibilityLabel={p.name}
        style={[boxed && styles.boxed, boxed && { borderRadius: template.radius }]}
      >
        <View style={[styles.cardPhoto, { height: Math.round((boxed ? width - 12 : width) * ratio), borderRadius: boxed ? template.radius - 4 : template.radius }]}>
          <Image source={{ uri: productImageUri(p, width, ratio) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} cachePolicy="memory-disk" recyclingKey={p.id} />
          {soldOut ? <SoldOut /> : null}
        </View>
        <View style={[styles.cardInfo, boxed && { paddingHorizontal: 4, paddingBottom: 4 }]}>
          <Text style={styles.cardName} numberOfLines={1}>
            {p.name}
          </Text>
          <ProductPrice price={p.price} oldPrice={p.oldPrice} />
        </View>
      </PressableScale>
      <View style={[styles.cardHeart, boxed && { top: 12, right: 12 }]}>
        <FavoriteButton productId={p.id} size={30} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.screen, marginBottom: 14, gap: 12 },
  kicker: { fontFamily: fonts.bold, fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: colors.text, letterSpacing: -0.4 },
  seeAll: { fontFamily: fonts.semibold, fontSize: 13.5, paddingBottom: 3 },
  rail: { paddingHorizontal: spacing.screen, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.screen },

  itemLabel: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.text, textAlign: 'center', maxWidth: 84 },
  itemCount: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  iconItem: { alignItems: 'center', gap: 7, width: 72 },
  circle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  emoji: { fontSize: 31, lineHeight: 38 },
  tilePhoto: { width: 100, height: 100, overflow: 'hidden', backgroundColor: colors.backgroundAlt },
  roundPhoto: { width: 92, height: 92, borderRadius: 46, overflow: 'hidden', backgroundColor: colors.backgroundAlt },
  photoCard: { overflow: 'hidden', backgroundColor: colors.backgroundAlt },
  photoCardLabel: { position: 'absolute', left: 12, right: 12, bottom: 11 },
  photoCardName: { fontFamily: fonts.serif, fontSize: 18, color: '#FFF9F1' },
  photoCardCount: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,249,241,0.85)' },
  gridCell: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
  },
  gridIcon: { height: 40, alignItems: 'center', justifyContent: 'center' },
  gridPhoto: { width: 40, height: 40, borderRadius: 10, overflow: 'hidden' },

  railPhoto: { overflow: 'hidden', backgroundColor: colors.backgroundAlt },
  railName: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.text },
  railHeart: { position: 'absolute', top: 10, right: 10 },
  pill: { position: 'absolute', left: 10, top: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontFamily: fonts.bold, fontSize: 11.5, letterSpacing: 0.2 },

  boxed: { padding: 6, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  cardPhoto: { overflow: 'hidden', backgroundColor: colors.backgroundAlt },
  cardInfo: { gap: 4, paddingTop: 9, paddingHorizontal: 2 },
  cardName: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 18, color: colors.text },
  cardHeart: { position: 'absolute', top: 8, right: 8 },
});
