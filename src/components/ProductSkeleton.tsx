import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii } from '@/theme';

function usePulse() {
  const v = useSharedValue(0.55);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [v]);
  return useAnimatedStyle(() => ({ opacity: v.value }));
}

export function SkeletonBlock({ style }: { style?: ViewStyle }) {
  const pulse = usePulse();
  return <Animated.View style={[styles.block, style, pulse]} />;
}

/** Carte fantôme aux proportions d'une vraie carte produit. */
export function ProductSkeleton({ width, aspect = 1 }: { width: number; aspect?: number }) {
  const pulse = usePulse();
  return (
    <Animated.View style={[styles.card, { width }, pulse]}>
      <View style={[styles.image, { height: width * aspect }]} />
      <View style={styles.info}>
        <View style={[styles.line, { width: '78%' }]} />
        <View style={[styles.line, { width: '55%', height: 12 }]} />
        <View style={[styles.line, { width: '44%', height: 9 }]} />
      </View>
    </Animated.View>
  );
}

const SKELETON_ASPECTS = [
  [1.0, 0.78, 0.7, 1.1],
  [1.45, 1.0, 0.82, 0.9],
  [1.15, 1.3, 0.85, 1.0],
];

/** Grille masonry fantôme affichée au premier chargement. */
export function MasonrySkeleton({ columns, cardWidth, gap }: { columns: number; cardWidth: number; gap: number }) {
  return (
    <View style={[styles.grid, { gap }]}>
      {Array.from({ length: columns }).map((_, c) => (
        <View key={c} style={{ gap }}>
          {SKELETON_ASPECTS[c % SKELETON_ASPECTS.length].map((a, i) => (
            <ProductSkeleton key={i} width={cardWidth} aspect={a} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.skeleton, borderRadius: radii.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  image: { backgroundColor: colors.skeleton, borderRadius: radii.lg },
  info: { padding: 11, gap: 7 },
  line: { height: 11, borderRadius: 6, backgroundColor: colors.skeleton },
  grid: { flexDirection: 'row', justifyContent: 'center' },
});
