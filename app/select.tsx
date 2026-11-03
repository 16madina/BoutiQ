import { Check, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CATEGORIES } from '@/data/demo';
import { CITIES } from '@/data/places';
import { COUNTRIES } from '@/store/useAuth';
import { usePicker, type PickerKind } from '@/store/usePicker';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';
import { normalize } from '@/utils/format';

type Option = { value: string; label: string; caption?: string; emoji?: string };

const TITLES: Record<PickerKind, string> = {
  category: 'Catégorie principale',
  city: 'Ville de la boutique',
  country: 'Pays',
  collection: 'Collection',
};

function optionsFor(kind: PickerKind, custom?: string[]): Option[] {
  switch (kind) {
    case 'category':
      return CATEGORIES.map((c) => ({ value: c.id, label: c.name, emoji: c.emoji ?? (c.icon === 'sofa' ? '🛋️' : '📱') }));
    case 'city':
      return CITIES.map((c) => ({ value: `${c.city}|${c.country}`, label: c.city, caption: c.country }));
    case 'country':
      return COUNTRIES.map((c) => ({ value: c.code, label: c.name, caption: c.dial, emoji: c.flag }));
    case 'collection':
      return [{ value: '', label: 'Aucune collection' }, ...(custom ?? []).map((c) => ({ value: c, label: c }))];
  }
}

/** Bottom sheet natif de sélection (formSheet avec poignée et paliers). */
export default function SelectSheet() {
  const kind = usePicker((s) => s.kind) ?? 'category';
  const selected = usePicker((s) => s.selected);
  const custom = usePicker((s) => s.options);
  const choose = usePicker((s) => s.choose);
  const [q, setQ] = useState('');

  const all = useMemo(() => optionsFor(kind, custom), [kind, custom]);
  const options = useMemo(() => {
    const n = normalize(q);
    return n ? all.filter((o) => normalize(`${o.label} ${o.caption ?? ''}`).includes(n)) : all;
  }, [all, q]);
  const searchable = all.length > 8;

  return (
    <View style={styles.sheet}>
      <Text style={[typography.h2, styles.title]}>{TITLES[kind]}</Text>
      {searchable && (
        <View style={styles.search}>
          <Search size={18} color={colors.textSecondary} strokeWidth={1.8} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Rechercher…"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.caramel}
            style={styles.searchInput}
          />
        </View>
      )}
      <FlatList
        data={options}
        keyExtractor={(o) => o.value || 'none'}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const active = item.value === selected || (kind === 'city' && selected === item.value.split('|')[0]);
          return (
            <Pressable
              onPress={() => {
                haptics.selection();
                choose(item.value);
              }}
              style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && { opacity: 0.7 }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              {item.emoji ? <Text style={styles.emoji}>{item.emoji}</Text> : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{item.label}</Text>
                {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
              </View>
              {active && <Check size={20} color={colors.caramel} strokeWidth={2.4} />}
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={[styles.caption, { textAlign: 'center', marginTop: 24 }]}>Aucun résultat</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.md, paddingHorizontal: 4 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15.5, color: colors.text, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 12, borderRadius: radii.md },
  rowActive: { backgroundColor: colors.backgroundAlt },
  emoji: { fontSize: 22 },
  label: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  caption: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 1 },
});
