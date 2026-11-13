import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BadgeCheck, MapPin, Search, Star, Store as StoreIcon, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { remoteStores, useRemoteCatalog } from '@/api/remoteCatalog';
import { toPublicStore } from '@/api/sellerCatalog';
import { EmptyState } from '@/components/EmptyState';
import { FollowButton } from '@/components/FollowButton';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StoreAvatar } from '@/components/StoreAvatar';
import { STORES } from '@/data/demo';
import { useSeller } from '@/store/useSeller';
import { useShop } from '@/store/useShop';
import { colors, fonts, radii, shadows, spacing, typography } from '@/theme';
import type { Store } from '@/types';
import { formatCount, normalize } from '@/utils/format';
import { storeBannerUri } from '@/utils/images';

type Filter = 'all' | 'followed' | 'verified';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'followed', label: 'Suivies' },
  { id: 'verified', label: 'Vérifiées' },
];

/** Toutes les boutiques : la sienne, les boutiques réelles (Supabase) et celles de démonstration. */
export default function StoresScreen() {
  const bottomSpace = useTabBarSpace();
  const own = useSeller((s) => s.store);
  const syncedAt = useRemoteCatalog((s) => s.syncedAt);
  const followed = useShop((s) => s.followedStores);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const all = useMemo<Store[]>(() => {
    const mine = own ? [toPublicStore(own)] : [];
    const remote = remoteStores().filter((s) => s.id !== own?.slug);
    const ids = new Set([...mine, ...remote].map((s) => s.id));
    return [...mine, ...remote, ...STORES.filter((s) => !ids.has(s.id))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [own, syncedAt]);

  const items = useMemo(() => {
    const needle = normalize(query);
    return all.filter((s) => {
      if (filter === 'followed' && !followed[s.id]) return false;
      if (filter === 'verified' && !s.verified) return false;
      return !needle || normalize(`${s.name} ${s.city} ${s.country} ${s.description}`).includes(needle);
    });
  }, [all, query, filter, followed]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Boutiques" back={false} large />
      <View style={styles.search}>
        <Search size={19} color={colors.text} strokeWidth={1.8} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une boutique ou une ville"
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
          returnKeyType="search"
          accessibilityLabel="Rechercher une boutique"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Effacer">
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = f.id === filter;
          const count = f.id === 'followed' ? all.filter((s) => followed[s.id]).length : f.id === 'verified' ? all.filter((s) => s.verified).length : all.length;
          return (
            <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[styles.filter, active && styles.filterActive]} accessibilityRole="tab" accessibilityState={{ selected: active }}>
              <Text style={[styles.filterText, active && { color: colors.white }]}>
                {f.label} · {count}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        data={items}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: bottomSpace, gap: 14 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            compact
            icon={StoreIcon}
            title={filter === 'followed' ? 'Vous ne suivez aucune boutique' : 'Aucune boutique trouvée'}
            message={filter === 'followed' ? 'Touchez « Suivre » sur une boutique pour être prévenu de ses nouveautés.' : 'Essayez un autre nom ou une autre ville.'}
          />
        }
        renderItem={({ item: store }) => {
          const banner = storeBannerUri(store, 360, 0.35);
          const isOwn = store.id === own?.slug;
          return (
            <PressableScale
              activeScale={0.98}
              onPress={() => router.push({ pathname: '/store/[id]', params: { id: store.id } })}
              accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
              accessibilityLabel={store.name}
              style={styles.card}
            >
              {banner ? (
                <Image source={{ uri: banner }} style={styles.banner} contentFit="cover" cachePolicy="memory-disk" transition={200} />
              ) : (
                <LinearGradient colors={[colors.champagne, colors.caramel]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner} />
              )}
              {isOwn && (
                <View style={styles.ownTag}>
                  <Text style={styles.ownText}>Ma boutique</Text>
                </View>
              )}
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
                    {store.reviewsCount > 0 && <Star size={13} color={colors.caramel} fill={colors.caramel} />}
                    <Text style={typography.caption}>
                      {store.reviewsCount > 0 ? `${store.rating.toFixed(1).replace('.', ',')} · ` : ''}
                      {store.followers > 0 ? `${formatCount(store.followers)} abonné${store.followers > 1 ? 's' : ''}` : 'Nouvelle boutique'}
                    </Text>
                  </View>
                  {store.city ? (
                    <View style={styles.meta}>
                      <MapPin size={13} color={colors.textSecondary} strokeWidth={1.8} />
                      <Text style={typography.caption}>
                        {store.city}, {store.country}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {!isOwn && <FollowButton storeId={store.id} compact />}
              </View>
            </PressableScale>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    marginHorizontal: spacing.screen,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 0 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.screen, paddingVertical: 12 },
  filter: { paddingHorizontal: 14, height: 36, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  filterActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  filterText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.soft,
  },
  banner: { height: 92, width: '100%', backgroundColor: colors.champagne },
  ownTag: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: 'rgba(23,23,23,0.72)' },
  ownText: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.white },
  body: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingTop: 10 },
  avatar: { marginTop: -34 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, flexShrink: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
});
