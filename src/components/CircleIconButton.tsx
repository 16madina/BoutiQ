import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { colors, layout, shadows } from '@/theme';

interface Props {
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
  size?: number;
  variant?: 'surface' | 'glass';
  style?: StyleProp<ViewStyle>;
}

export function CircleIconButton({
  onPress,
  accessibilityLabel,
  children,
  size = layout.headerButtonSize,
  variant = 'surface',
  style,
}: Props) {
  return (
    <PressableScale
      onPress={onPress}
      activeScale={0.9}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        variant === 'glass' ? styles.glass : styles.surface,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  surface: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.soft,
  },
  glass: { backgroundColor: colors.overlayLight, ...shadows.button },
});
