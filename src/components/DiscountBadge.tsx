import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/theme';

export function DiscountBadge({ percent, size = 'sm' }: { percent: number; size?: 'sm' | 'md' }) {
  return (
    <View style={[styles.badge, size === 'md' && styles.badgeMd]}>
      <Text style={[styles.text, size === 'md' && styles.textMd]}>-{percent}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.promo,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeMd: { paddingHorizontal: 9, paddingVertical: 4 },
  text: { color: colors.white, fontFamily: fonts.bold, fontSize: 11 },
  textMd: { fontSize: 13 },
});
