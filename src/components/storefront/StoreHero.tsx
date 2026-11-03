import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, Check, MapPin, MessageCircle, Plus, Share2, Star, Truck } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/PressableScale';
import { StoreAvatar } from '@/components/StoreAvatar';
import type { Storefront } from '@/api/storefront';
import { useShop } from '@/store/useShop';
import { colors, fonts, radii, spacing } from '@/theme';
import { formatCount } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { storeBannerUri } from '@/utils/images';

interface Props {
  sf: Storefront;
  width: number;
  topInset: number;
  onContact: () => void;
  onShare: () => void;
}

const DARK_BG = '#14161A';

/** En-tête de la vitrine : grande bannière, logo, nom, accroche et actions. */
export function StoreHero({ sf, width, topInset, onContact, onShare }: Props) {
  const { store, template, palette, settings } = sf;
  const heroHeight = Math.round(width * template.heroRatio);
  const bannerUri = storeBannerUri(store, width, template.heroRatio);
  const immersive = template.heroLayout === 'immersive';
  const titleFamily = template.titleFont === 'serif' ? fonts.serif : fonts.extrabold;
  const dark = template.dark;
  const ink = dark || immersive ? '#FFF9F1' : colors.text;

  const banner = bannerUri ? (
    <Image source={{ uri: bannerUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} cachePolicy="memory-disk" />
  ) : (
    <LinearGradient colors={[palette.accentSoft, palette.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
  );

  const identity = (
    <Animated.View entering={FadeInDown.delay(80).springify().damping(18)} style={styles.identity}>
      <StoreAvatar store={store} size={immersive ? 64 : 72} />
      <View style={{ gap: 6 }}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, { fontFamily: titleFamily, color: ink, fontSize: template.titleFont === 'serif' ? 32 : 28 }]}
            numberOfLines={2}
            accessibilityRole="header"
          >
            {store.name}
          </Text>
          {store.verified && <BadgeCheck size={22} color={immersive || dark ? '#FFE3B8' : palette.accentInk} strokeWidth={2} />}
        </View>
        {settings.tagline ? (
          <Text style={[styles.tagline, { color: immersive || dark ? 'rgba(255,249,241,0.88)' : colors.textSecondary }]}>{settings.tagline}</Text>
        ) : null}
        <View style={styles.metaRow}>
          <MapPin size={14} color={immersive || dark ? '#FFE3B8' : palette.accentInk} strokeWidth={2} />
          <Text style={[styles.meta, { color: immersive || dark ? 'rgba(255,249,241,0.9)' : colors.text }]}>
            {store.city}, {store.country}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View>
      {immersive ? (
        <View style={{ width, height: heroHeight + topInset * 0.3 }}>
          {banner}
          <LinearGradient
            colors={['rgba(20,14,10,0.35)', 'rgba(20,14,10,0)', 'rgba(20,14,10,0.15)', 'rgba(20,14,10,0.82)']}
            locations={[0, 0.25, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>{identity}</View>
        </View>
      ) : (
        <>
          <View style={{ width, height: heroHeight }}>
            {banner}
            <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
          </View>
          <View style={[styles.darkBlock, { backgroundColor: dark ? DARK_BG : colors.background }]}>{identity}</View>
        </>
      )}

      {store.salesEnabled === false && (
        <View style={styles.pending}>
          <Text style={styles.pendingText}>Boutique en cours de vérification · achats bientôt disponibles</Text>
        </View>
      )}

      <View style={[styles.body, dark && !immersive && { backgroundColor: DARK_BG, paddingTop: 0 }]}>
        <View style={styles.stats}>
          <Stat
            dark={dark && !immersive}
            value={store.reviewsCount > 0 ? store.rating.toFixed(1).replace('.', ',') : '—'}
            label={store.reviewsCount > 0 ? `${formatCount(store.reviewsCount)} avis` : 'Nouvelle'}
            icon={<Star size={13} color={palette.accent} fill={palette.accent} />}
          />
          <Stat dark={dark && !immersive} value={formatCount(store.followers)} label="abonnés" />
          <Stat dark={dark && !immersive} value={store.verified ? 'Vérifiée' : 'Indépendante'} label="boutique" />
        </View>

        <View style={styles.actions}>
          <FollowStoreButton storeId={store.id} accent={palette.accent} onAccent={palette.onAccent} />
          <ActionButton dark={dark && !immersive} icon={<MessageCircle size={18} color={dark && !immersive ? '#FFF9F1' : colors.text} strokeWidth={1.8} />} label="Contacter" onPress={onContact} />
          <ActionButton dark={dark && !immersive} icon={<Share2 size={18} color={dark && !immersive ? '#FFF9F1' : colors.text} strokeWidth={1.8} />} label="Partager" onPress={onShare} />
        </View>

        <Text style={[styles.description, dark && !immersive && { color: 'rgba(255,249,241,0.85)' }]}>{store.description}</Text>
        <View style={[styles.delivery, { backgroundColor: dark && !immersive ? '#1F232A' : palette.accentSoft }]}>
          <Truck size={17} color={dark && !immersive ? '#9CC3F0' : palette.accentInk} strokeWidth={1.8} />
          <Text style={[styles.deliveryText, dark && !immersive && { color: '#E9EDF2' }]}>{store.delivery}</Text>
        </View>
      </View>
    </View>
  );
}

function Stat({ value, label, icon, dark }: { value: string; label: string; icon?: ReactNode; dark?: boolean }) {
  return (
    <View style={[styles.stat, dark && { backgroundColor: '#1F232A', borderColor: '#2A2F37' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon}
        <Text style={[styles.statValue, dark && { color: '#FFF9F1' }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={[styles.statLabel, dark && { color: '#A9B0BA' }]}>{label}</Text>
    </View>
  );
}

function ActionButton({ icon, label, onPress, dark }: { icon: ReactNode; label: string; onPress: () => void; dark?: boolean }) {
  return (
    <PressableScale
      onPress={() => {
        haptics.light();
        onPress();
      }}
      activeScale={0.95}
      accessibilityRole="button"
      style={[styles.secondary, dark && { backgroundColor: '#1F232A', borderColor: '#2A2F37' }]}
    >
      {icon}
      <Text style={[styles.secondaryText, dark && { color: '#FFF9F1' }]}>{label}</Text>
    </PressableScale>
  );
}

/** « Suivre » aux couleurs de la boutique. */
function FollowStoreButton({ storeId, accent, onAccent }: { storeId: string; accent: string; onAccent: string }) {
  const following = useShop((s) => !!s.followedStores[storeId]);
  const toggleFollow = useShop((s) => s.toggleFollow);
  return (
    <PressableScale
      onPress={() => {
        haptics.medium();
        toggleFollow(storeId);
      }}
      activeScale={0.95}
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      style={[styles.follow, following ? { backgroundColor: colors.surface, borderColor: accent, borderWidth: 1.5 } : { backgroundColor: accent }]}
    >
      {following ? <Check size={17} color={accent} strokeWidth={2.4} /> : <Plus size={17} color={onAccent} strokeWidth={2.4} />}
      <Text style={[styles.followText, { color: following ? accent : onAccent }]}>{following ? 'Suivie' : 'Suivre'}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  heroContent: { position: 'absolute', left: spacing.screen + 4, right: spacing.screen + 4, bottom: 22 },
  darkBlock: { paddingHorizontal: spacing.screen + 4, paddingTop: 18, paddingBottom: 6 },
  identity: { gap: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { letterSpacing: -0.6, lineHeight: 38, flexShrink: 1 },
  tagline: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontFamily: fonts.medium, fontSize: 13.5 },
  pending: { backgroundColor: '#F6E8D6', paddingVertical: 9, paddingHorizontal: spacing.screen },
  pendingText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.chocolate, textAlign: 'center' },
  body: { paddingHorizontal: spacing.screen, paddingTop: 18, paddingBottom: 6, gap: 16 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.text },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: 8 },
  follow: { flex: 1.15, height: 48, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  followText: { fontFamily: fonts.bold, fontSize: 15 },
  secondary: {
    flex: 1,
    height: 48,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  description: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: '#3A3430' },
  delivery: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: radii.md },
  deliveryText: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
});
