import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, House, LayoutGrid, Package, Store, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface, glassBorder } from '@/components/GlassSurface';
import { useShop } from '@/store/useShop';
import { colors, fonts, gradients, layout, shadows } from '@/theme';
import { haptics } from '@/utils/haptics';

const ICONS: Record<string, LucideIcon> = {
  index: House,
  categories: LayoutGrid,
  stores: Store,
  favorites: Heart,
  orders: Package,
};

const PILL_INSET = 4;
const SPRING = { damping: 20, stiffness: 220, mass: 0.8 };

/** Décalage de la barre par rapport au bas de l'écran (respecte l'indicateur d'accueil). */
export function useTabBarBottomOffset() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom - 6, 12);
}

/** Espace à réserver en bas des listes pour qu'aucun contenu ne passe sous la barre. */
export function useTabBarSpace() {
  return layout.tabBarHeight + useTabBarBottomOffset() + 20;
}

/** Barre d'onglets flottante, translucide, avec pastille active animée. */
export function FloatingTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  icons = ICONS,
}: BottomTabBarProps & { icons?: Record<string, LucideIcon> }) {
  const bottom = useTabBarBottomOffset();
  const [barWidth, setBarWidth] = useState(0);
  const favoritesCount = useShop((s) => Object.keys(s.favorites).length);

  const tabCount = state.routes.length;
  const tabWidth = barWidth / tabCount;
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (tabWidth > 0) translateX.value = withSpring(state.index * tabWidth, SPRING);
  }, [state.index, tabWidth, translateX]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  return (
    <View
      // Android : l'ombre (elevation) exige un fond opaque sur le conteneur.
      style={[styles.container, { bottom }, Platform.OS === 'android' && { backgroundColor: colors.surface }]}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      <GlassSurface borderRadius={layout.tabBarHeight / 2} />
      {barWidth > 0 && (
        <Animated.View style={[styles.pill, { width: tabWidth - PILL_INSET * 2 }, pillStyle]}>
          <LinearGradient
            colors={gradients.activeTab}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = typeof options.title === 'string' ? options.title : route.name;
        const Icon = icons[route.name] ?? House;
        const color = focused ? colors.white : colors.tabInactive;

        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            haptics.selection();
            navigateToTab(route.key);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={styles.tab}
          >
            <View>
              <Icon size={23} strokeWidth={focused ? 2 : 1.6} color={color} />
              {route.name === 'favorites' && favoritesCount > 0 && !focused && <View style={styles.dot} />}
            </View>
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: layout.tabBarSideMargin,
    right: layout.tabBarSideMargin,
    height: layout.tabBarHeight,
    borderRadius: layout.tabBarHeight / 2,
    flexDirection: 'row',
    alignItems: 'center',
    ...glassBorder,
    ...shadows.floating,
  },
  pill: {
    position: 'absolute',
    left: PILL_INSET,
    top: PILL_INSET,
    bottom: PILL_INSET,
    borderRadius: (layout.tabBarHeight - PILL_INSET * 2) / 2,
    overflow: 'hidden',
  },
  tab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontFamily: fonts.medium, fontSize: 10.5, letterSpacing: -0.2 },
  dot: {
    position: 'absolute',
    top: -1,
    right: -3,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.caramel,
  },
});
