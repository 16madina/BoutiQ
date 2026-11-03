import { router } from 'expo-router';
import { LayoutGrid, Smartphone, Sofa } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { CATEGORIES } from '@/data/demo';
import { colors, radii, spacing, typography } from '@/theme';
import type { Category } from '@/types';
import { haptics } from '@/utils/haptics';

const TILE = 66;

function CategoryIcon({ category }: { category: Category }) {
  if (category.emoji) return <Text style={styles.emoji}>{category.emoji}</Text>;
  const Icon = category.icon === 'sofa' ? Sofa : Smartphone;
  return <Icon size={30} strokeWidth={1.5} color={colors.text} />;
}

function Tile({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <PressableScale
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      activeScale={0.92}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.item}
    >
      <View style={styles.tile}>{children}</View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Catégories défilantes horizontalement (pictogramme sur fond crème + libellé). */
export function CategoryCarousel() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      decelerationRate="fast"
    >
      {CATEGORIES.map((c) => (
        <Tile key={c.id} label={c.name} onPress={() => router.push({ pathname: '/search', params: { category: c.id } })}>
          <CategoryIcon category={c} />
        </Tile>
      ))}
      <Tile label="Plus" onPress={() => router.navigate('/categories')}>
        <LayoutGrid size={30} strokeWidth={1.5} color={colors.text} />
      </Tile>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.screen - 4, gap: 4, paddingVertical: 4 },
  item: { width: 80, alignItems: 'center' },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radii.xl,
    backgroundColor: colors.backgroundAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 31, lineHeight: 38 },
  label: { ...typography.label, marginTop: 7 },
});
