import { Image } from 'expo-image';
import { router } from 'expo-router';
import { BadgeCheck } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { FollowButton } from '@/components/FollowButton';
import { StoreAvatar } from '@/components/StoreAvatar';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import type { Store } from '@/types';
import { formatCount } from '@/utils/format';
import { storeBannerUri } from '@/utils/images';

import { FeedHeader } from './FeedHeader';

const openStore = (id: string) => router.push({ pathname: '/store/[id]', params: { id } });

function StoreCard({ store, width, coverHeight, feature }: { store: Store; width: number; coverHeight: number; feature?: boolean }) {
  const cover = storeBannerUri(store, width, coverHeight / width);
  const place = [store.city, store.country].filter(Boolean).join(', ');
  return (
    <Pressable onPress={() => openStore(store.id)} accessibilityRole="link" accessibilityLabel={`Visiter la boutique ${store.name}`} style={({ pressed }) => [styles.card, { width }, pressed && { opacity: 0.9 }]}>
      <View style={{ height: coverHeight, backgroundColor: store.logoColor }}>
        {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={220} /> : null}
      </View>
      <View style={styles.body}>
        <View style={styles.logo}>
          <StoreAvatar store={store} size={feature ? 56 : 46} />
        </View>
        <View style={styles.nameRow}>
          <Text style={[styles.name, feature && { fontSize: 18 }]} numberOfLines={1}>
            {store.name}
          </Text>
          {store.verified ? <BadgeCheck size={feature ? 17 : 15} color={colors.caramel} strokeWidth={2} /> : null}
        </View>
        <Text style={typography.caption} numberOfLines={1}>
          {[place, store.followers > 0 ? `${formatCount(store.followers)} abonné${store.followers > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
        </Text>
        {feature && store.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {store.description}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <View style={styles.visit}>
            <Text style={styles.visitText}>Visiter la boutique</Text>
          </View>
          {feature ? <FollowButton storeId={store.id} compact /> : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Format D — boutiques à découvrir : en carrousel, une grande à l'honneur, ou deux côte à côte. */
export function StoreDiscoverySection({ title, layout, stores }: { title: string; layout: 'carousel' | 'feature' | 'pair'; stores: Store[] }) {
  const { width } = useWindowDimensions();
  const inner = width - spacing.screen * 2;
  const seeAll = () => router.push({ pathname: '/categories', params: { view: 'stores' } });
  return (
    <View>
      <FeedHeader title={title} onAction={seeAll} actionLabel="Voir toutes les boutiques" />
      {layout === 'carousel' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: 12 }}>
          {stores.map((s) => (
            <StoreCard key={s.id} store={s} width={Math.min(230, inner * 0.68)} coverHeight={104} />
          ))}
        </ScrollView>
      ) : layout === 'feature' ? (
        <View style={{ paddingHorizontal: spacing.screen }}>
          <StoreCard store={stores[0]} width={inner} coverHeight={150} feature />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: spacing.screen }}>
          {stores.slice(0, 2).map((s) => (
            <StoreCard key={s.id} store={s} width={Math.floor((inner - 10) / 2)} coverHeight={92} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  body: { paddingHorizontal: 12, paddingBottom: 12, gap: 3 },
  logo: { marginTop: -24, marginBottom: 4, alignSelf: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 15.5, color: colors.text },
  description: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19, color: colors.textSoft, marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  visit: { height: 34, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  visitText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
});
