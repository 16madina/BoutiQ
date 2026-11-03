import { Check, Plus } from 'lucide-react-native';
import { StyleSheet, Text } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { useShop } from '@/store/useShop';
import { colors, fonts, radii } from '@/theme';
import { haptics } from '@/utils/haptics';

export function FollowButton({ storeId, compact }: { storeId: string; compact?: boolean }) {
  const following = useShop((s) => !!s.followedStores[storeId]);
  const toggleFollow = useShop((s) => s.toggleFollow);
  return (
    <PressableScale
      onPress={() => {
        haptics.light();
        toggleFollow(storeId);
      }}
      activeScale={0.94}
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      style={[styles.button, compact && styles.compact, following ? styles.following : styles.follow]}
    >
      {following ? (
        <Check size={15} strokeWidth={2.4} color={colors.cognac} />
      ) : (
        <Plus size={15} strokeWidth={2.4} color={colors.white} />
      )}
      <Text style={[styles.label, following && { color: colors.cognac }]}>{following ? 'Suivi' : 'Suivre'}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 20,
    borderRadius: radii.pill,
  },
  compact: { height: 34, paddingHorizontal: 14 },
  follow: { backgroundColor: colors.caramel },
  following: { backgroundColor: '#F6E8D6', borderWidth: 1, borderColor: colors.champagne },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white },
});
