import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  scrollTo,
  type SharedValue,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/PressableScale';
import { BANNERS } from '@/data/demo';
import { colors, fonts, gradients, radii, shadows, spacing, typography } from '@/theme';
import type { Banner } from '@/types';
import { photoUrl } from '@/utils/images';

const AUTOPLAY_MS = 5000;

function Dot({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const d = Math.min(Math.abs(progress.value - index), 1);
    return {
      width: interpolate(d, [0, 1], [9, 7]),
      height: interpolate(d, [0, 1], [9, 7]),
      backgroundColor: interpolateColor(d, [0, 1], [colors.chocolate, colors.sand]),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

function Slide({ banner, width, height }: { banner: Banner; width: number; height: number }) {
  return (
    <View style={{ width: width + spacing.screen * 2, paddingHorizontal: spacing.screen }}>
      <PressableScale
        activeScale={0.985}
        onPress={() => router.push(banner.link)}
        accessibilityRole="button"
        accessibilityLabel={`${banner.title.replace('\n', ' ')} — ${banner.cta}`}
        style={[styles.card, { width, height }]}
      >
        <Image
          source={{ uri: photoUrl(banner.photoId, width, height / width) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={{ left: `${Math.round(banner.focusX * 100)}%`, top: '30%' }}
          cachePolicy="memory-disk"
          transition={300}
        />
        <LinearGradient
          colors={gradients.bannerOverlay}
          locations={[0, 0.38, 0.68]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <Text style={typography.bannerTitle}>{banner.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {banner.subtitle}
          </Text>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{banner.cta}</Text>
            <ArrowRight size={17} strokeWidth={2} color={colors.chocolate} />
          </View>
        </View>
      </PressableScale>
    </View>
  );
}

/** Bannière carrousel : photo lifestyle, dégradé caramel/brun, pagination animée. */
export function PromoBanner() {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - spacing.screen * 2;
  const cardHeight = Math.min(Math.max(Math.round(cardWidth * 0.5), 168), 250);
  const pageWidth = screenWidth;

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const progress = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const dragging = useRef(false);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      progress.value = e.contentOffset.x / pageWidth;
    },
  });

  // Défilement programmatique exécuté sur le thread UI.
  const target = useSharedValue({ x: 0, n: 0 });
  useAnimatedReaction(
    () => target.value.n,
    (n, prev) => {
      if (prev !== null && n !== prev) scrollTo(scrollRef, target.value.x, 0, true);
    },
  );

  const goTo = useCallback(
    (i: number) => {
      target.value = { x: i * pageWidth, n: target.value.n + 1 };
    },
    [pageWidth, target],
  );

  // Défilement automatique, mis en pause pendant que l'utilisateur fait glisser.
  useEffect(() => {
    const t = setInterval(() => {
      if (dragging.current) return;
      const next = (index + 1) % BANNERS.length;
      goTo(next);
      setIndex(next);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [index, goTo]);

  return (
    <View>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          dragging.current = true;
        }}
        onScrollEndDrag={() => {
          dragging.current = false;
        }}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth))}
      >
        {BANNERS.map((b) => (
          <Slide key={b.id} banner={b} width={cardWidth} height={cardHeight} />
        ))}
      </Animated.ScrollView>
      <View style={styles.dots} accessibilityRole="adjustable" accessibilityLabel={`Bannière ${index + 1} sur ${BANNERS.length}`}>
        {BANNERS.map((b, i) => (
          <Dot key={b.id} index={i} progress={progress} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.accentFill,
    ...shadows.card,
  },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 22, maxWidth: '78%' },
  subtitle: { fontFamily: fonts.regular, fontSize: 12.5, color: '#F6E8D6', marginTop: 8 },
  cta: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8E6CC',
    paddingHorizontal: 18,
    height: 40,
    borderRadius: radii.pill,
  },
  ctaText: { fontFamily: fonts.semibold, fontSize: 15, color: '#58351F' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 12, height: 10 },
  dot: { borderRadius: 5 },
});
