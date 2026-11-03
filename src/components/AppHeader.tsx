import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/BrandLogo';
import { CartIconButton } from '@/components/CartIconButton';
import { CircleIconButton } from '@/components/CircleIconButton';
import { PressableScale } from '@/components/PressableScale';
import { DEMO_USER } from '@/data/demo';
import { colors, layout, spacing } from '@/theme';
import { photoUrl } from '@/utils/images';

/** En-tête compact : logo, notifications, panier, avatar. */
export function AppHeader({ hasUnreadNotifications = true }: { hasUnreadNotifications?: boolean }) {
  const size = layout.headerButtonSize;
  return (
    <View style={styles.row}>
      <BrandLogo />
      <View style={styles.actions}>
        <CircleIconButton onPress={() => router.push('/notifications')} accessibilityLabel="Notifications">
          <Bell size={21} strokeWidth={1.7} color={colors.text} />
          {hasUnreadNotifications && <View style={styles.dot} />}
        </CircleIconButton>
        <CartIconButton />
        <PressableScale
          onPress={() => router.push('/account')}
          activeScale={0.92}
          accessibilityRole="button"
          accessibilityLabel="Mon compte"
          style={[styles.avatarRing, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }]}
        >
          <Image
            source={{ uri: photoUrl(DEMO_USER.avatarPhotoId, size, 1) }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            cachePolicy="memory-disk"
            transition={200}
          />
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
  avatarRing: {
    borderWidth: 2,
    borderColor: colors.champagne,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});
