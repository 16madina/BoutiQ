import { router } from 'expo-router';
import { Bell, UserRound } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/BrandLogo';
import { CartIconButton } from '@/components/CartIconButton';
import { CircleIconButton } from '@/components/CircleIconButton';
import { PressableScale } from '@/components/PressableScale';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { initialsOf, useProfile } from '@/store/useProfile';
import { colors, fonts, layout, spacing } from '@/theme';

/** En-tête compact : logo, notifications, panier, avatar. */
export function AppHeader() {
  const size = layout.headerButtonSize;
  const unread = useUnreadNotifications();
  const initials = initialsOf(useProfile((s) => s.fullName));
  return (
    <View style={styles.row}>
      <BrandLogo />
      <View style={styles.actions}>
        <CircleIconButton onPress={() => router.push('/notifications')} accessibilityLabel={unread ? `Notifications, ${unread} non lues` : 'Notifications'}>
          <Bell size={21} strokeWidth={1.7} color={colors.text} />
          {unread > 0 && <View style={styles.dot} />}
        </CircleIconButton>
        <CartIconButton />
        <PressableScale
          onPress={() => router.push('/account')}
          activeScale={0.92}
          accessibilityRole="button"
          accessibilityLabel="Mon compte"
          style={[styles.avatarRing, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }]}
        >
          <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
            {initials ? <Text style={styles.initials}>{initials}</Text> : <UserRound size={20} color={colors.white} strokeWidth={1.8} />}
          </View>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.promo,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  avatar: { backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  avatarRing: {
    borderWidth: 2,
    borderColor: colors.champagne,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});
