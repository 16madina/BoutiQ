import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

const LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * Surface « verre » à trois niveaux :
 * - iOS 26+ : Liquid Glass natif (expo-glass-effect)
 * - iOS antérieur / web : flou natif + voile ivoire
 * - Android : voile ivoire quasi opaque (le flou temps réel coûte cher sur le milieu de gamme)
 */
export function GlassSurface({ style, borderRadius }: { style?: StyleProp<ViewStyle>; borderRadius: number }) {
  const shape = [StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' as const }, style];

  if (LIQUID_GLASS) {
    return (
      <GlassView
        style={shape}
        glassEffectStyle="regular"
        colorScheme="light"
        tintColor="rgba(250,246,240,0.55)"
      />
    );
  }

  if (Platform.OS === 'android') {
    return <View style={[shape, styles.androidFill]} />;
  }

  return (
    <View style={shape}>
      <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.veil]} />
    </View>
  );
}

export const isLiquidGlass = LIQUID_GLASS;

const styles = StyleSheet.create({
  androidFill: { backgroundColor: 'rgba(255,252,248,0.97)' },
  veil: { backgroundColor: 'rgba(250,246,240,0.72)' },
});

export const glassBorder = {
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: LIQUID_GLASS ? 'rgba(255,255,255,0.6)' : colors.border,
};
