import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Props<T extends string> {
  tabs: { id: T; label: string; badge?: number }[];
  value: T;
  onChange: (id: T) => void;
}

/**
 * En-tête d'onglet à plusieurs titres, tous au même format (grand titre) :
 * celui qu'on regarde est foncé et souligné, les autres sont clairs et se touchent.
 * Ex. « Catégories  Boutiques », « Commandes  Activité ».
 */
export function TitleTabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.row, { paddingTop: insets.top + spacing.sm }]} accessibilityRole="tablist">
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <Pressable
            key={t.id}
            onPress={() => {
              if (on) return;
              haptics.selection();
              onChange(t.id);
            }}
            hitSlop={6}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t.badge ? `${t.label}, ${t.badge} nouveau${t.badge > 1 ? 'x' : ''}` : t.label}
            style={styles.tab}
          >
            <View style={styles.labelRow}>
              <Text style={[typography.h1, !on && { color: colors.textMuted }]}>{t.label}</Text>
              {t.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t.badge > 9 ? '9+' : t.badge}</Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.line, on && { backgroundColor: colors.caramel }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 22, paddingHorizontal: spacing.screen, paddingBottom: spacing.md, backgroundColor: colors.background },
  tab: { gap: 5 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  line: { height: 3, width: 28, borderRadius: 2, backgroundColor: 'transparent' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.promo, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },
});
