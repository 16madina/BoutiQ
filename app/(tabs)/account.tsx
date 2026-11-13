import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { ArrowLeftRight, Bell, ChevronRight, Heart, LogOut, Phone, ShoppingCart, Store, UserRound, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { toPublicStore } from '@/api/sellerCatalog';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBadge } from '@/components/seller/StatusBadge';
import { switchSpace } from '@/components/seller/SpaceSwitch';
import { StoreAvatar } from '@/components/StoreAvatar';
import { useAuth } from '@/store/useAuth';
import { useSeller } from '@/store/useSeller';
import { colors, fonts, radii, shadows, spacing, typography } from '@/theme';
import { SheetAction, StoreSheet } from '@/components/storefront/StoreSheet';
import { firstName, initialsOf, useProfile } from '@/store/useProfile';

// Commandes et Boutiques sont des onglets : ici, ce qui n'a pas sa place dans la barre.
const LINKS: { label: string; icon: LucideIcon; href: Href }[] = [
  { label: 'Mes favoris', icon: Heart, href: '/favorites' },
  { label: 'Mon panier', icon: ShoppingCart, href: '/cart' },
  { label: 'Notifications', icon: Bell, href: '/notifications' },
  { label: 'Mes informations et ma livraison', icon: UserRound, href: '/profile' },
];

export default function AccountScreen() {
  const bottomSpace = useTabBarSpace();
  const session = useAuth((s) => s.session);
  const signOut = useAuth((s) => s.signOut);
  const store = useSeller((s) => s.store);
  const draftName = useSeller((s) => s.draft.name);
  const fullName = useProfile((s) => s.fullName);
  const profilePhone = useProfile((s) => s.phone);
  const [confirmOut, setConfirmOut] = useState(false);
  const hello = firstName(fullName);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Profil" back={false} large />
      <ScrollView contentContainerStyle={{ padding: spacing.screen, paddingTop: spacing.xs, gap: spacing.lg, paddingBottom: bottomSpace }}>
        <View style={styles.profile}>
          <Pressable onPress={() => router.push('/profile')} style={styles.avatar} accessibilityRole="button" accessibilityLabel="Modifier mon profil">
            {initialsOf(fullName) ? <Text style={styles.initials}>{initialsOf(fullName)}</Text> : <UserRound size={30} color={colors.white} strokeWidth={1.6} />}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={typography.h2}>{hello ? `Bonjour ${hello}` : 'Bonjour'}</Text>
            {session || profilePhone ? (
              <View style={styles.phoneRow}>
                <Phone size={13} color={colors.textSecondary} strokeWidth={1.8} />
                <Text style={typography.caption}>{session?.phone ?? profilePhone}</Text>
              </View>
            ) : null}
            {!session ? (
              <Text style={styles.signIn} onPress={() => router.push('/auth')}>
                Se connecter par SMS
              </Text>
            ) : !fullName ? (
              <Text style={styles.signIn} onPress={() => router.push('/profile')}>
                Compléter mon profil
              </Text>
            ) : null}
          </View>
        </View>

        {/* Espace vendeur */}
        {store ? (
          <Animated.View entering={FadeInDown.duration(350)} style={styles.sellerCard}>
            <View style={styles.sellerHeader}>
              <StoreAvatar store={toPublicStore(store)} size={50} />
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={styles.sellerName} numberOfLines={1}>
                  {store.name}
                </Text>
                <StatusBadge status={store.status} />
              </View>
            </View>
            <PrimaryButton
              label="Passer à l’espace vendeur"
              icon={<ArrowLeftRight size={18} color={colors.white} strokeWidth={2} />}
              onPress={() => switchSpace('seller')}
            />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(350)}>
            <PressableScale onPress={() => router.push('/open-store')} style={styles.openCard} accessibilityRole="button">
              <LinearGradient colors={['#8A542C', '#58351F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={styles.openIcon}>
                <Store size={26} color="#FFF7EC" strokeWidth={1.6} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.openTitle}>{draftName ? 'Terminer ma boutique' : 'Ouvrir ma boutique'}</Text>
                <Text style={styles.openText}>Vendez partout en Afrique, gratuitement, depuis ce même compte.</Text>
              </View>
              <ChevronRight size={20} color="#EAD5BC" />
            </PressableScale>
          </Animated.View>
        )}

        <View style={styles.list}>
          {LINKS.map(({ label, icon: Icon, href }) => (
            <Pressable key={label} onPress={() => router.navigate(href)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
              <Icon size={20} strokeWidth={1.7} color={colors.cognac} />
              <Text style={styles.rowText}>{label}</Text>
              <ChevronRight size={18} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>

        {session && (
          <Pressable onPress={() => setConfirmOut(true)} style={styles.logout} accessibilityRole="button">
            <LogOut size={18} color={colors.textSecondary} strokeWidth={1.8} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </Pressable>
        )}
      </ScrollView>
      <StoreSheet visible={confirmOut} title="Se déconnecter ?" subtitle="Votre boutique, vos commandes et vos favoris restent enregistrés." onClose={() => setConfirmOut(false)}>
        <SheetAction
          icon={<LogOut size={18} color={colors.white} strokeWidth={2} />}
          tint={colors.promo}
          label="Se déconnecter"
          onPress={() => {
            setConfirmOut(false);
            signOut();
          }}
        />
        <SheetAction icon={<ChevronRight size={18} color={colors.cognac} strokeWidth={2} />} label="Annuler" onPress={() => setConfirmOut(false)} />
      </StoreSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.bold, fontSize: 26, color: colors.white },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  signIn: { fontFamily: fonts.semibold, fontSize: 14, color: colors.caramel, marginTop: 3 },
  sellerCard: { padding: 16, gap: 14, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadows.soft },
  sellerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellerName: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  openCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: radii.xl, overflow: 'hidden', ...shadows.card },
  openIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,247,236,0.16)', alignItems: 'center', justifyContent: 'center' },
  openTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  openText: { fontFamily: fonts.regular, fontSize: 13, color: '#EAD5BC', marginTop: 3, lineHeight: 18 },
  list: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  logoutText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.textSecondary },
});
