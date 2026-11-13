import { Check, Plus, ShoppingCart } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useShop } from '@/store/useShop';
import { colors, shadows } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Props {
  productId: string;
  size?: number;
  /** Couleur de fond (vitrines : couleur de la boutique). */
  tint?: string;
  /** Couleur de l'icône. */
  iconColor?: string;
  /** Produit avec taille ou option à choisir : ouvre la fiche au lieu d'ajouter directement. */
  onChoose?: () => void;
}

/** Petit bouton circulaire « ajout au panier » posé sur l'image du produit. */
export function AddToCartButton({ productId, size = 34, tint, iconColor = colors.text, onChoose }: Props) {
  const addToCart = useShop((s) => s.addToCart);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const onPress = () => {
    if (onChoose) {
      haptics.light();
      onChoose();
      return;
    }
    addToCart(productId);
    haptics.success();
    scale.value = withSequence(withSpring(1.22, { damping: 7, stiffness: 420 }), withSpring(1, { damping: 12 }));
    rotate.value = withSequence(withTiming(-12, { duration: 90 }), withSpring(0, { damping: 6, stiffness: 300 }));
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1300);
  };

  const iconSize = size * 0.5;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Ajouter au panier"
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        tint ? { backgroundColor: tint } : null,
        added && { backgroundColor: colors.buttonPrimary },
      ]}
    >
      <Animated.View style={animatedStyle}>
        {added ? (
          <Check size={iconSize} strokeWidth={2.4} color={colors.white} />
        ) : (
          <View>
            <ShoppingCart size={iconSize} strokeWidth={1.8} color={iconColor} />
            <View style={[styles.plus, tint ? { backgroundColor: tint } : null]}>
              <Plus size={iconSize * 0.5} strokeWidth={3} color={iconColor} />
            </View>
          </View>
        )}
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
  plus: {
    position: 'absolute',
    top: -3,
    right: -4,
    backgroundColor: colors.overlayLight,
    borderRadius: 8,
  },
});
