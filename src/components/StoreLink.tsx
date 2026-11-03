import { router } from 'expo-router';
import { BadgeCheck, Store as StoreIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { getStore } from '@/api/catalog';
import { colors, typography } from '@/theme';

interface Props {
  storeId: string;
  size?: 'sm' | 'md';
}

/** Nom de la boutique vendeuse — ouvre sa vitrine. */
export function StoreLink({ storeId, size = 'sm' }: Props) {
  const store = getStore(storeId);
  if (!store) return null;
  const md = size === 'md';
  return (
    <Pressable
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={() => router.push({ pathname: '/store/[id]', params: { id: storeId } })}
      accessibilityRole="link"
      accessibilityLabel={`Voir la boutique ${store.name}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.55 }]}
    >
      <StoreIcon size={md ? 16 : 13} strokeWidth={1.7} color={colors.textSecondary} />
      <Text style={[typography.caption, md && styles.textMd]} numberOfLines={1}>
        {store.name}
      </Text>
      {store.verified && md && <BadgeCheck size={15} color={colors.caramel} strokeWidth={2} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%' },
  textMd: { fontSize: 14.5, color: colors.text },
});
