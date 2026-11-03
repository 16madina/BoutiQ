import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { PRICE_RANGES, useShop, type SearchFilters } from '@/store/useShop';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import type { SortOption } from '@/types';
import { haptics } from '@/utils/haptics';

const SORTS: { id: SortOption; label: string }[] = [
  { id: 'relevance', label: 'Pertinence' },
  { id: 'price_asc', label: 'Prix croissant' },
  { id: 'price_desc', label: 'Prix décroissant' },
  { id: 'discount', label: 'Meilleures remises' },
];

function Option({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={[styles.option, active && styles.optionActive]}
    >
      <Text style={[styles.optionText, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

/** Feuille de filtres native (formSheet iOS / Android, poignée et paliers). */
export default function FiltersSheet() {
  const filters = useShop((s) => s.filters);
  const setFilters = useShop((s) => s.setFilters);
  const resetFilters = useShop((s) => s.resetFilters);

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <Text style={typography.h2}>Filtres</Text>
        <Pressable onPress={resetFilters} hitSlop={10}>
          <Text style={styles.reset}>Réinitialiser</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.promoRow}>
          <View style={{ flex: 1 }}>
            <Text style={typography.h3}>En promotion</Text>
            <Text style={typography.caption}>Uniquement les articles à prix réduit</Text>
          </View>
          <Switch
            value={filters.onlyPromo}
            onValueChange={(v) => {
              haptics.selection();
              setFilters({ onlyPromo: v });
            }}
            trackColor={{ true: colors.caramel, false: colors.border }}
            thumbColor={colors.white}
            ios_backgroundColor={colors.border}
          />
        </View>

        <Text style={styles.label}>Prix (FCFA)</Text>
        <View style={styles.wrap}>
          {(Object.keys(PRICE_RANGES) as SearchFilters['priceRange'][]).map((k) => (
            <Option key={k} label={PRICE_RANGES[k].label} active={filters.priceRange === k} onPress={() => setFilters({ priceRange: k })} />
          ))}
        </View>

        <Text style={styles.label}>Trier par</Text>
        <View style={styles.wrap}>
          {SORTS.map((s) => (
            <Option key={s.id} label={s.label} active={filters.sort === s.id} onPress={() => setFilters({ sort: s.id })} />
          ))}
        </View>
      </ScrollView>

      <PrimaryButton label="Voir les résultats" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  reset: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.caramel },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { ...typography.h3, marginTop: spacing.xl, marginBottom: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    paddingHorizontal: 15,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  optionActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  optionText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
});
