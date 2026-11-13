import { router } from 'expo-router';
import { ArrowLeftRight } from 'lucide-react-native';
import { StyleSheet, Text } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { useSeller } from '@/store/useSeller';
import { colors, fonts, radii } from '@/theme';
import { haptics } from '@/utils/haptics';

/** Bascule acheteur ⇄ vendeur, sans déconnexion (même session). */
export function switchSpace(to: 'buyer' | 'seller') {
  haptics.medium();
  useSeller.getState().setSpace(to);
  if (router.canDismiss()) router.dismissAll();
  router.replace(to === 'seller' ? '/seller' : '/');
}

export function SpaceSwitchPill({ to }: { to: 'buyer' | 'seller' }) {
  return (
    <PressableScale
      onPress={() => switchSpace(to)}
      activeScale={0.94}
      style={styles.pill}
      accessibilityRole="button"
      accessibilityLabel={to === 'buyer' ? 'Passer à l’espace acheteur' : 'Passer à l’espace vendeur'}
    >
      <ArrowLeftRight size={15} color={colors.chocolate} strokeWidth={2} />
      <Text style={styles.text}>{to === 'buyer' ? 'Acheteur' : 'Vendeur'}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 13,
    borderRadius: radii.pill,
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: colors.champagne,
  },
  text: { fontFamily: fonts.semibold, fontSize: 13, color: colors.chocolate },
});
