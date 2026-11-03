import { Heart } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { useIsFavorite, useShop } from '@/store/useShop';
import { colors, shadows } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Props {
  productId: string;
  size?: number;
}

export function FavoriteButton({ productId, size = 34 }: Props) {
  const isFavorite = useIsFavorite(productId);
  const toggleFavorite = useShop((s) => s.toggleFavorite);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPress = () => {
    const nowFavorite = toggleFavorite(productId);
    if (nowFavorite) haptics.medium();
    else haptics.light();
    scale.value = withSequence(
      withSpring(nowFavorite ? 1.28 : 0.85, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 260 }),
    );
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: isFavorite }}
      accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Animated.View style={animatedStyle}>
        <Heart
          size={size * 0.53}
          strokeWidth={1.8}
          color={isFavorite ? colors.favorite : colors.text}
          fill={isFavorite ? colors.favorite : 'transparent'}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
});
