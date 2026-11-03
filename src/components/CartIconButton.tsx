import { router } from 'expo-router';
import { ShoppingCart } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { CircleIconButton } from '@/components/CircleIconButton';
import { useCartCount } from '@/store/useShop';
import { colors, fonts } from '@/theme';

/** Icône panier avec compteur qui « rebondit » à chaque ajout. */
export function CartIconButton({ variant = 'surface' }: { variant?: 'surface' | 'glass' }) {
  const count = useCartCount();
  const prev = useRef(count);
  const bump = useSharedValue(1);

  useEffect(() => {
    if (count > prev.current) {
      bump.value = withSequence(withSpring(1.35, { damping: 6, stiffness: 400 }), withSpring(1, { damping: 10 }));
    }
    prev.current = count;
  }, [count, bump]);

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));

  return (
    <CircleIconButton
      variant={variant}
      onPress={() => router.push('/cart')}
      accessibilityLabel={`Panier, ${count} article${count > 1 ? 's' : ''}`}
    >
      <ShoppingCart size={21} strokeWidth={1.7} color={colors.text} />
      {count > 0 && (
        <Animated.View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </Animated.View>
      )}
    </CircleIconButton>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.caramel,
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontFamily: fonts.bold, fontSize: 10.5 },
});
