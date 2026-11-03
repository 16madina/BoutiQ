import { Image } from 'expo-image';
import { router } from 'expo-router';
import { BadgeCheck, MapPin, Star } from 'lucide-react-native';
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native';

import { FollowButton } from '@/components/FollowButton';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StoreAvatar } from '@/components/StoreAvatar';
import { STORES } from '@/data/demo';
import { colors, fonts, radii, shadows, spacing, typography } from '@/theme';
import { formatCount } from '@/utils/format';
import { storeBannerUri } from '@/utils/images';

export default function StoresScreen() {
  const bottomSpace = useTabBarSpace();
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Boutiques" back={false} large />
      <FlatList
        data={STORES}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: bottomSpace, gap: 14 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: store }) => (
          <PressableScale
            activeScale={0.98}
            onPress={() => router.push({ pathname: '/store/[id]', params: { id: store.id } })}
            accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
            accessibilityLabel={store.name}
            style={styles.card}
          >
            <Image source={{ uri: storeBannerUri(store, 360, 0.35) }} style={styles.banner} contentFit="cover" cachePolicy="memory-disk" transition={200} />
            <View style={styles.body}>
              <View style={styles.avatar}>
                <StoreAvatar store={store} size={52} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {store.name}
                  </Text>
                  {store.verified && <BadgeCheck size={16} color={colors.caramel} strokeWidth={2} />}
                </View>
                <View style={styles.meta}>
                  <Star size={13} color={colors.caramel} fill={colors.caramel} />
                  <Text style={typography.caption}>
                    {store.rating.toFixed(1).replace('.', ',')} · {formatCount(store.followers)} abonnés
                  </Text>
                </View>
                <View style={styles.meta}>
                  <MapPin size={13} color={colors.textSecondary} strokeWidth={1.8} />
                  <Text style={typography.caption}>
                    {store.city}, {store.country}
                  </Text>
                </View>
              </View>
              <FollowButton storeId={store.id} compact />
            </View>
          </PressableScale>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.soft,
  },
  banner: { height: 92, backgroundColor: colors.champagne },
  body: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingTop: 10 },
  avatar: { marginTop: -34 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, flexShrink: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
});
