import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { House, LayoutGrid, MessageCircle, Package, UserRound, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface, glassBorder } from '@/components/GlassSurface';
import { colors, fonts, gradients, layout, shadows } from '@/theme';
import { haptics } from '@/utils/haptics';

const ICONS: Record<string, LucideIcon> = {
  index: House,
  categories: LayoutGrid,
  orders: Package,
  messages: MessageCircle,
  account: UserRound,
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
  badges,
}: BottomTabBarProps & { icons?: Record<string, LucideIcon>; /** Nombre à afficher sur un onglet (ex. commandes à traiter). */ badges?: Record<string, number> }) {
  const bottom = useTabBarBottomOffset();
  const [barWidth, setBarWidth] = useState(0);

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
            accessibilityLabel={badges?.[route.name] ? `${label}, ${badges[route.name]} à traiter` : label}
            style={styles.tab}
          >
            <View>
              <Icon size={23} strokeWidth={focused ? 2 : 1.6} color={color} />
              {badges?.[route.name] ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badges[route.name] > 9 ? '9+' : badges[route.name]}</Text>
                </View>
              ) : null}
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
  badge: { position: 'absolute', top: -5, right: -10, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.promo, borderWidth: 1.5, borderColor: colors.white },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 12, color: colors.white },
});
