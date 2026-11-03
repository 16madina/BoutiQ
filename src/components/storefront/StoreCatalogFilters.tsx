import { Check, Search, SlidersHorizontal, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getCategory } from '@/api/catalog';
import { PressableScale } from '@/components/PressableScale';
import { StoreSheet } from '@/components/storefront/StoreSheet';
import { PRICE_RANGES, type SearchFilters } from '@/store/useShop';
import { colors, fonts, radii, spacing } from '@/theme';
import type { CategoryId, SortOption } from '@/types';
import type { StorefrontPalette } from '@/types/storefront';
import { haptics } from '@/utils/haptics';

export interface StoreFilters {
  categoryId?: CategoryId;
  priceRange: SearchFilters['priceRange'];
  inStockOnly: boolean;
  onlyPromo: boolean;
  sort: SortOption;
}

export const DEFAULT_STORE_FILTERS: StoreFilters = { priceRange: 'all', inStockOnly: false, onlyPromo: false, sort: 'relevance' };

/** Nombre de filtres actifs (pour la pastille du bouton « Filtres »). */
export function activeFilterCount(f: StoreFilters) {
  return (f.categoryId ? 1 : 0) + (f.priceRange !== 'all' ? 1 : 0) + (f.inStockOnly ? 1 : 0) + (f.onlyPromo ? 1 : 0) + (f.sort !== 'relevance' ? 1 : 0);
}

const SORTS: { id: SortOption; label: string }[] = [
  { id: 'relevance', label: 'Les plus récents' },
  { id: 'price_asc', label: 'Prix : du moins cher au plus cher' },
  { id: 'price_desc', label: 'Prix : du plus cher au moins cher' },
  { id: 'discount', label: 'Meilleures réductions' },
];

/* ---------------------------------------------------- Champ de recherche */

export function StoreSearchField({
  value,
  onChange,
  storeName,
  palette,
}: {
  value: string;
  onChange: (v: string) => void;
  storeName: string;
  palette: StorefrontPalette;
}) {
  return (
    <View style={[styles.search, value ? { borderColor: palette.accent } : null]}>
      <Search size={19} color={colors.text} strokeWidth={1.8} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={`Rechercher dans ${storeName}`}
        placeholderTextColor={colors.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
        selectionColor={palette.accent}
        style={styles.searchInput}
        accessibilityLabel={`Rechercher dans ${storeName}`}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Effacer la recherche">
          <X size={18} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------- Puces + bouton Filtres */

export function StoreFilterBar({
  filters,
  onChange,
  categories,
  palette,
  onOpenSheet,
}: {
  filters: StoreFilters;
  onChange: (f: StoreFilters) => void;
  categories: CategoryId[];
  palette: StorefrontPalette;
  onOpenSheet: () => void;
}) {
  const count = activeFilterCount(filters);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bar}>
      <PressableScale
        onPress={() => {
          haptics.light();
          onOpenSheet();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Filtres${count ? `, ${count} actifs` : ''}`}
        style={[styles.chip, styles.filterChip, count > 0 && { borderColor: palette.accent }]}
      >
        <SlidersHorizontal size={16} color={colors.text} strokeWidth={1.9} />
        <Text style={styles.chipText}>Filtres</Text>
        {count > 0 && (
          <View style={[styles.count, { backgroundColor: palette.accent }]}>
            <Text style={[styles.countText, { color: palette.onAccent }]}>{count}</Text>
          </View>
        )}
      </PressableScale>
      <Chip label="Disponible" active={filters.inStockOnly} palette={palette} onPress={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })} />
      <Chip label="Promotions" active={filters.onlyPromo} palette={palette} onPress={() => onChange({ ...filters, onlyPromo: !filters.onlyPromo })} />
      {categories.length > 1 &&
        categories.map((id) => (
          <Chip
            key={id}
            label={getCategory(id)?.name ?? id}
            active={filters.categoryId === id}
            palette={palette}
            onPress={() => onChange({ ...filters, categoryId: filters.categoryId === id ? undefined : id })}
          />
        ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress, palette }: { label: string; active: boolean; onPress: () => void; palette: StorefrontPalette }) {
  return (
    <PressableScale
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && { backgroundColor: palette.accent, borderColor: palette.accent }]}
    >
      {active && <Check size={14} color={palette.onAccent} strokeWidth={2.6} />}
      <Text style={[styles.chipText, active && { color: palette.onAccent }]}>{label}</Text>
    </PressableScale>
  );
}

/* --------------------------------------------------- Feuille des filtres */

export function StoreFilterSheet({
  visible,
  onClose,
  filters,
  onChange,
  categories,
  palette,
  resultCount,
}: {
  visible: boolean;
  onClose: () => void;
  filters: StoreFilters;
  onChange: (f: StoreFilters) => void;
  categories: CategoryId[];
  palette: StorefrontPalette;
  resultCount: number;
}) {
  return (
    <StoreSheet
      visible={visible}
      onClose={onClose}
      title="Filtrer les articles"
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => onChange(DEFAULT_STORE_FILTERS)}
            style={[styles.footerBtn, styles.footerSecondary]}
            accessibilityRole="button"
          >
            <Text style={styles.footerSecondaryText}>Tout effacer</Text>
          </Pressable>
          <Pressable onPress={onClose} style={[styles.footerBtn, { flex: 1.6, backgroundColor: colors.buttonPrimary }]} accessibilityRole="button">
            <Text style={styles.footerPrimaryText}>
              Voir {resultCount} article{resultCount > 1 ? 's' : ''}
            </Text>
          </Pressable>
        </View>
      }
    >
      {categories.length > 1 && (
        <Group title="Catégorie">
          <View style={styles.wrap}>
            <Chip label="Toutes" active={!filters.categoryId} palette={palette} onPress={() => onChange({ ...filters, categoryId: undefined })} />
            {categories.map((id) => (
              <Chip key={id} label={getCategory(id)?.name ?? id} active={filters.categoryId === id} palette={palette} onPress={() => onChange({ ...filters, categoryId: id })} />
            ))}
          </View>
        </Group>
      )}

      <Group title="Prix (FCFA)">
        {(Object.keys(PRICE_RANGES) as SearchFilters['priceRange'][]).map((key) => (
          <Option key={key} label={PRICE_RANGES[key].label} selected={filters.priceRange === key} palette={palette} onPress={() => onChange({ ...filters, priceRange: key })} />
        ))}
      </Group>

      <Group title="Disponibilité">
        <Option label="Seulement les articles disponibles" selected={filters.inStockOnly} palette={palette} square onPress={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })} />
        <Option label="Seulement les promotions" selected={filters.onlyPromo} palette={palette} square onPress={() => onChange({ ...filters, onlyPromo: !filters.onlyPromo })} />
      </Group>

      <Group title="Trier par">
        {SORTS.map((s) => (
          <Option key={s.id} label={s.label} selected={filters.sort === s.id} palette={palette} onPress={() => onChange({ ...filters, sort: s.id })} />
        ))}
      </Group>
    </StoreSheet>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6, marginBottom: 10 }}>
      <Text style={styles.groupTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Option({
  label,
  selected,
  onPress,
  palette,
  square,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  palette: StorefrontPalette;
  square?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole={square ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.optionText}>{label}</Text>
      <View
        style={[
          styles.tick,
          { borderRadius: square ? 7 : 12 },
          selected && { backgroundColor: palette.accent, borderColor: palette.accent },
        ]}
      >
        {selected && <Check size={14} color={palette.onAccent} strokeWidth={3} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    marginHorizontal: spacing.screen,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  searchInput: { flex: 1, height: '100%', fontFamily: fonts.medium, fontSize: 15, color: colors.text, padding: 0 },
  bar: { paddingHorizontal: spacing.screen, gap: 8, paddingVertical: 2 },
  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChip: { paddingLeft: 12 },
  chipText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  count: { minWidth: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  countText: { fontFamily: fonts.bold, fontSize: 11 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, marginBottom: 2 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 46, gap: 12 },
  optionText: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  tick: { width: 24, height: 24, borderWidth: 1.5, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  footerBtn: { flex: 1, height: 52, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  footerSecondary: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  footerSecondaryText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  footerPrimaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
});
