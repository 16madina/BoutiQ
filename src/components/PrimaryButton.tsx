import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { colors, fonts, gradients, radii } from '@/theme';

interface Props {
  label: string;
  onPress: () => void;
  /** dark = noir profond · light = champagne · caramel = dégradé caramel/cognac */
  variant?: 'dark' | 'light' | 'caramel';
  icon?: ReactNode;
  /** Icône à droite (ex. flèche « Suivant → ») */
  trailingIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function PrimaryButton({ label, onPress, variant = 'dark', icon, trailingIcon, style, disabled }: Props) {
  const light = variant === 'light';
  const caramel = variant === 'caramel';
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[
        styles.button,
        light ? styles.light : caramel ? styles.caramel : styles.dark,
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {caramel && (
        <LinearGradient colors={gradients.activeTab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
      {icon ? <View>{icon}</View> : null}
      <Text style={[styles.label, light && { color: colors.text }]}>{label}</Text>
      {trailingIcon ? <View style={styles.trailing}>{trailingIcon}</View> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  dark: { backgroundColor: colors.buttonPrimary },
  light: { backgroundColor: colors.tint, borderWidth: 1, borderColor: colors.champagne },
  caramel: { backgroundColor: colors.caramel },
  label: { color: colors.white, fontFamily: fonts.semibold, fontSize: 16 },
  trailing: { position: 'absolute', right: 22 },
});
