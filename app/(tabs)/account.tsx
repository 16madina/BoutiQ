import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, type Href } from 'expo-router';
import {
  BadgeCheck,
  Bell,
  Camera,
  ChevronRight,
  Crown,
  Heart,
  LogOut,
  Mail,
  Package,
  Pencil,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchStoreOrders, pullProfile, saveAvatar } from '@/api/account';
import { signOutAccount } from '@/api/authAccount';
import { fetchIsAdmin } from '@/api/moderation';
import { displayUri, toPublicStore } from '@/api/sellerCatalog';
import { resolveOwnSettings } from '@/api/storefront';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { PressableScale } from '@/components/PressableScale';
import { pickImage } from '@/components/seller/ImagePickers';
import { switchSpace } from '@/components/seller/SpaceSwitch';
import { StatusBadge } from '@/components/seller/StatusBadge';
import { SheetAction, StoreSheet } from '@/components/storefront/StoreSheet';
import { useScreenStatusBar } from '@/hooks/useScreenStatusBar';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { useAuth } from '@/store/useAuth';
import { firstName, initialsOf, useProfile } from '@/store/useProfile';
import { useSeller } from '@/store/useSeller';
import { useCartCount, useShop } from '@/store/useShop';
import { TEMPLATES } from '@/storefront/templates';
import { colors, fonts, radii, shadows, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';
import { photoUrl } from '@/utils/images';

const NIGHT = '#0F0C09';
const GOLD = '#D9A848';
const GOLD_SOFT = '#F0CF8A';
const CREAM = '#FFF7EC';
const AVATAR = 108;

function MenuRow({ icon: Icon, label, count, onPress }: { icon: LucideIcon; label: string; count?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={count ? `${label}, ${count}` : label}>
      <Icon size={22} strokeWidth={1.7} color={colors.cognac} />
      <Text style={styles.rowText} numberOfLines={1}>
        {label}
      </Text>
      {count ? (
        <View style={styles.count}>
          <Text style={styles.countText}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
      <ChevronRight size={19} color={colors.text} strokeWidth={1.8} />
    </Pressable>
  );
}

function Stat({ icon: Icon, value, label, gold }: { icon: LucideIcon; value: string; label: string; gold?: boolean }) {
  return (
    <View style={styles.stat}>
      <Icon size={22} color={gold ? colors.gold : colors.cognac} strokeWidth={1.7} />
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

/** Profil : en-tête sombre et doré (photo, nom, e-mail), carte de la boutique, puis les raccourcis du compte. */
export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  useScreenStatusBar('light');

  const session = useAuth((s) => s.session);
  const store = useSeller((s) => s.store);
  const details = useSeller((s) => s.details);
  const published = useSeller((s) => s.products.filter((p) => p.status === 'published').length);
  const draftName = useSeller((s) => s.draft.name);
  const profile = useProfile();
  const favorites = useShop((s) => Object.keys(s.favorites).length);
  const cart = useCartCount();
  const unread = useUnreadNotifications();

  const [confirmOut, setConfirmOut] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [bannerFailed, setBannerFailed] = useState(false);
  // Entrée « Modération » : seulement pour les comptes de l'équipe BoutiQ (vérifié côté serveur).
  const [admin, setAdmin] = useState(false);
  const [orders, setOrders] = useState<number | null>(null);
  const remoteId = store?.remoteId;

  useFocusEffect(
    useCallback(() => {
      fetchIsAdmin().then(setAdmin);
      pullProfile().catch(() => {});
      if (remoteId) {
        fetchStoreOrders(remoteId)
          .then((list) => setOrders(list.filter((o) => o.status !== 'cancelled').length))
          .catch(() => {});
      }
    }, [remoteId]),
  );

  const hello = firstName(profile.fullName);
  const contact = session?.email ?? session?.phone ?? (profile.phone || undefined);
  const complete = !!profile.fullName && !!profile.phone && !!profile.city;
  const since = profile.memberSince ? new Date(profile.memberSince).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : null;

  const changePhoto = async () => {
    const img = await pickImage([1, 1]);
    if (!img) return;
    setNotice(null);
    try {
      await saveAvatar(img);
      haptics.success();
    } catch {
      setNotice('Photo gardée sur ce téléphone. Elle sera envoyée en ligne au retour de la connexion.');
    }
  };

  // Vignette de la boutique : sa bannière, sinon la belle photo de son modèle.
  const publicStore = store ? toPublicStore(store) : null;
  const template = store ? TEMPLATES[resolveOwnSettings(store, details).template] : null;
  const defaultBanner = template?.defaultHeroPhotoIds?.[0] ? photoUrl(template.defaultHeroPhotoIds[0], 120, 0.62) : undefined;
  const bannerUri = (!bannerFailed && displayUri(store?.banner)) || defaultBanner;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomSpace + 8 }} showsVerticalScrollIndicator={false} bounces={false}>
        {/* En-tête sombre et doré */}
        <LinearGradient colors={[NIGHT, '#1C1510', '#2B2016']} locations={[0, 0.55, 1]} style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.swoosh} pointerEvents="none" />
          <View style={styles.swooshThin} pointerEvents="none" />

          <View style={styles.topRow}>
            <Text style={styles.title} accessibilityRole="header">
              Profil
            </Text>
            <Text style={styles.brand} accessibilityLabel="BoutiQ">
              Bouti<Text style={{ color: GOLD }}>Q</Text>
            </Text>
            <View style={styles.topIcons}>
              <Pressable onPress={() => router.push('/notifications')} hitSlop={6} style={styles.topIcon} accessibilityRole="button" accessibilityLabel={`Notifications, ${unread} non lue${unread > 1 ? 's' : ''}`}>
                <Bell size={24} color={CREAM} strokeWidth={1.7} />
                {unread > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable onPress={() => router.push('/settings')} hitSlop={6} style={styles.topIcon} accessibilityRole="button" accessibilityLabel="Paramètres">
                <Settings size={24} color={CREAM} strokeWidth={1.7} />
              </Pressable>
            </View>
          </View>

          <Animated.View entering={FadeInDown.duration(380)} style={styles.identity}>
            <Pressable onPress={changePhoto} accessibilityRole="button" accessibilityLabel="Changer ma photo de profil">
              <LinearGradient colors={[GOLD_SOFT, GOLD, '#9C6B1E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ring}>
                <View style={styles.avatar}>
                  {profile.avatar?.uri ? (
                    <Image source={{ uri: displayUri(profile.avatar) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                  ) : initialsOf(profile.fullName) ? (
                    <Text style={styles.initials}>{initialsOf(profile.fullName)}</Text>
                  ) : (
                    <UserRound size={46} color={GOLD_SOFT} strokeWidth={1.4} />
                  )}
                </View>
              </LinearGradient>
              {store ? (
                <View style={styles.crown}>
                  <Crown size={17} color={NIGHT} strokeWidth={2} fill={GOLD} />
                </View>
              ) : null}
              <View style={styles.camera}>
                <Camera size={14} color={NIGHT} strokeWidth={2.2} />
              </View>
            </Pressable>

            <View style={{ flex: 1, gap: 5 }}>
              <View style={styles.helloRow}>
                <Text style={styles.hello} numberOfLines={1}>
                  Bonjour{hello ? ', ' : ''}
                  {hello ? <Text style={{ fontFamily: fonts.extrabold }}>{hello}</Text> : null}
                </Text>
                {session ? <BadgeCheck size={20} color={NIGHT} fill={GOLD} strokeWidth={2} accessibilityLabel="Compte confirmé" /> : null}
              </View>
              {contact ? (
                <View style={styles.contactRow}>
                  <Mail size={15} color={GOLD} strokeWidth={1.8} />
                  <Text style={styles.contact} numberOfLines={1}>
                    {contact}
                  </Text>
                </View>
              ) : null}
              {!session ? (
                <Text style={styles.link} onPress={() => router.push('/auth')} accessibilityRole="button">
                  Se connecter ou créer un compte ›
                </Text>
              ) : !complete ? (
                <Text style={styles.link} onPress={() => router.push('/profile')} accessibilityRole="button">
                  Compléter mon profil ›
                </Text>
              ) : since ? (
                <Text style={styles.since}>Membre depuis {since}</Text>
              ) : null}
            </View>

            <Pressable onPress={() => router.push('/profile')} hitSlop={6} style={styles.edit} accessibilityRole="button" accessibilityLabel="Modifier mes informations">
              <Pencil size={17} color={CREAM} strokeWidth={1.8} />
            </Pressable>
          </Animated.View>
        </LinearGradient>

        <View style={styles.body}>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          {/* Boutique */}
          {store && publicStore ? (
            <>
              <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.storeCard}>
                <Pressable
                  onPress={() => router.push({ pathname: '/store/[id]', params: { id: store.slug } })}
                  style={({ pressed }) => [styles.storeTop, pressed && { opacity: 0.8 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Voir ${store.name}`}
                >
                  <View style={styles.thumb}>
                    {bannerUri ? <Image source={{ uri: bannerUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} onError={() => setBannerFailed(true)} /> : null}
                    <View style={styles.thumbIcon}>
                      <Store size={17} color={GOLD} strokeWidth={2} />
                    </View>
                  </View>
                  <View style={{ flex: 1, gap: 7 }}>
                    <Text style={styles.storeName} numberOfLines={1}>
                      {store.name}
                    </Text>
                    <StatusBadge status={store.status} size="md" />
                  </View>
                  <ChevronRight size={22} color={colors.text} strokeWidth={1.8} />
                </Pressable>
                <View style={styles.stats}>
                  <Stat icon={ShoppingBag} value={String(published)} label={published > 1 ? 'Produits' : 'Produit'} />
                  <View style={styles.statDivider} />
                  <Stat icon={Package} value={orders == null ? '–' : String(orders)} label={orders != null && orders > 1 ? 'Commandes' : 'Commande'} />
                  <View style={styles.statDivider} />
                  <Stat icon={Users} value={String(publicStore.followers)} label={publicStore.followers > 1 ? 'Abonnés' : 'Abonné'} gold />
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(110).duration(380)}>
                <PressableScale onPress={() => switchSpace('seller')} activeScale={0.97} style={styles.sellerBtn} accessibilityRole="button">
                  <LinearGradient colors={['#2A2016', NIGHT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <View>
                    <Store size={24} color={GOLD} strokeWidth={1.9} />
                  </View>
                  <Text style={styles.sellerText}>Passer à l’espace vendeur</Text>
                  <View>
                    <ChevronRight size={22} color={CREAM} strokeWidth={2} />
                  </View>
                </PressableScale>
              </Animated.View>
            </>
          ) : (
            <Animated.View entering={FadeInDown.delay(60).duration(380)}>
              <PressableScale onPress={() => router.push('/open-store')} activeScale={0.97} style={[styles.sellerBtn, styles.openBtn]} accessibilityRole="button">
                <LinearGradient colors={['#2A2016', NIGHT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <View>
                  <Store size={26} color={GOLD} strokeWidth={1.9} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sellerText}>{draftName ? 'Terminer ma boutique' : 'Ouvrir ma boutique'}</Text>
                  <Text style={styles.openText}>Vendez partout en Afrique, gratuitement, depuis ce même compte.</Text>
                </View>
                <View>
                  <ChevronRight size={22} color={CREAM} strokeWidth={2} />
                </View>
              </PressableScale>
            </Animated.View>
          )}

          {/* Raccourcis du compte */}
          <Animated.View entering={FadeInDown.delay(160).duration(380)} style={styles.rows}>
            <MenuRow icon={Heart} label="Mes favoris" count={favorites} onPress={() => router.navigate('/favorites')} />
            <MenuRow icon={ShoppingCart} label="Mon panier" count={cart} onPress={() => router.navigate('/cart')} />
            <MenuRow icon={Bell} label="Notifications" count={unread} onPress={() => router.navigate('/notifications')} />
            <MenuRow icon={Package} label="Mes informations et livraison" onPress={() => router.navigate('/profile' as Href)} />
            {admin && <MenuRow icon={ShieldCheck} label="Modération des boutiques" onPress={() => router.navigate('/moderation')} />}
          </Animated.View>

          {session ? (
            <Pressable onPress={() => setConfirmOut(true)} style={styles.logout} accessibilityRole="button">
              <LogOut size={19} color={colors.cognac} strokeWidth={1.8} />
              <Text style={styles.logoutText}>Se déconnecter</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <StoreSheet
        visible={confirmOut}
        title="Se déconnecter ?"
        subtitle="Votre boutique, vos commandes et vos favoris restent enregistrés. Vous les retrouverez en vous reconnectant."
        onClose={() => setConfirmOut(false)}
      >
        <SheetAction
          icon={<LogOut size={18} color={colors.white} strokeWidth={2} />}
          tint={colors.promo}
          label="Se déconnecter"
          onPress={() => {
            setConfirmOut(false);
            setNotice(null);
            signOutAccount().catch((e) => setNotice((e as Error).message));
          }}
        />
        <SheetAction icon={<ChevronRight size={18} color={colors.cognac} strokeWidth={2} />} label="Annuler" onPress={() => setConfirmOut(false)} />
      </StoreSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  header: { paddingHorizontal: spacing.screen, paddingBottom: 64, overflow: 'hidden', borderBottomWidth: 2, borderBottomColor: 'rgba(217,168,72,0.55)' },
  // Deux anneaux dorés dans le coin, derrière les icônes : un reflet discret, sans gêner la lecture.
  swoosh: {
    position: 'absolute',
    right: -150,
    top: -130,
    width: 330,
    height: 330,
    borderRadius: 165,
    borderWidth: 26,
    borderColor: 'rgba(217,168,72,0.13)',
  },
  swooshThin: {
    position: 'absolute',
    right: -210,
    top: -190,
    width: 470,
    height: 470,
    borderRadius: 235,
    borderWidth: 1.5,
    borderColor: 'rgba(240,207,138,0.38)',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', height: 48 },
  title: { flex: 1, fontFamily: fonts.extrabold, fontSize: 27, letterSpacing: -0.5, color: CREAM },
  brand: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.4, color: CREAM },
  topIcons: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  topIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.promo, alignItems: 'center', justifyContent: 'center' },
  bellBadgeText: { fontFamily: fonts.bold, fontSize: 10.5, color: colors.white },

  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 },
  ring: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, padding: 3.5 },
  avatar: { flex: 1, borderRadius: AVATAR / 2, overflow: 'hidden', backgroundColor: '#2B2016', alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.bold, fontSize: 36, color: GOLD_SOFT },
  crown: { position: 'absolute', left: 0, top: -4, width: 30, height: 30, borderRadius: 15, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-18deg' }], borderWidth: 2, borderColor: NIGHT },
  camera: { position: 'absolute', right: 2, bottom: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: GOLD_SOFT, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: NIGHT },
  helloRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  hello: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 23, letterSpacing: -0.4, color: CREAM },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  contact: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 14.5, color: 'rgba(255,247,236,0.86)' },
  link: { fontFamily: fonts.semibold, fontSize: 14.5, color: GOLD },
  since: { fontFamily: fonts.regular, fontSize: 13.5, color: 'rgba(255,247,236,0.66)' },
  edit: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,247,236,0.35)', backgroundColor: 'rgba(255,247,236,0.08)', alignItems: 'center', justifyContent: 'center' },

  body: { paddingHorizontal: spacing.screen, gap: 16, marginTop: -40 },
  notice: { padding: 12, borderRadius: radii.md, backgroundColor: colors.tint, fontFamily: fonts.medium, fontSize: 13.5, color: colors.chocolate, lineHeight: 19 },

  storeCard: { borderRadius: 26, backgroundColor: colors.surface, padding: 12, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadows.card },
  storeTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumb: { width: 104, height: 66, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.champagne, alignItems: 'center', justifyContent: 'center' },
  thumbIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(15,12,9,0.78)', alignItems: 'center', justifyContent: 'center' },
  storeName: { fontFamily: fonts.bold, fontSize: 19, letterSpacing: -0.3, color: colors.text },
  stats: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, backgroundColor: colors.background, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: colors.sand },
  statValue: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  statLabel: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textSecondary },

  sellerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 60,
    paddingHorizontal: 22,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(217,168,72,0.7)',
    shadowColor: GOLD,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  sellerText: { flex: 1, fontFamily: fonts.bold, fontSize: 16.5, color: CREAM },
  openBtn: { height: undefined, paddingVertical: 18, borderRadius: 24 },
  openText: { fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,247,236,0.72)', marginTop: 3, lineHeight: 18 },

  rows: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 58,
    paddingLeft: 18,
    paddingRight: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.soft,
  },
  rowText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  count: { minWidth: 34, height: 26, paddingHorizontal: 9, borderRadius: 13, backgroundColor: colors.champagne, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: fonts.bold, fontSize: 13, color: colors.chocolate },

  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 12 },
  logoutText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.cognac },
});
