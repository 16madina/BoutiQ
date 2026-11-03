import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { StyleSheet, Text } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useTabBarBottomOffset } from '@/components/FloatingTabBar';
import { PressableScale } from '@/components/PressableScale';
import { colors, fonts, layout, radii, shadows } from '@/theme';
import { haptics } from '@/utils/haptics';

/** Bouton flottant « Ajouter un produit », toujours visible au-dessus de la barre d'onglets. */
export function AddProductFab() {
  const bottom = useTabBarBottomOffset() + layout.tabBarHeight + 14;
  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.wrap, { bottom }]}>
      <PressableScale
        onPress={() => {
          haptics.medium();
          router.push('/product-editor');
        }}
        activeScale={0.94}
        accessibilityRole="button"
        accessibilityLabel="Ajouter un produit"
        style={styles.fab}
      >
        <Plus size={21} color={colors.white} strokeWidth={2.4} />
        <Text style={styles.text}>Ajouter un produit</Text>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16 },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 54,
    paddingHorizontal: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.buttonPrimary,
    ...shadows.floating,
  },
  text: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
});
