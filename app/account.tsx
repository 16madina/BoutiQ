import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { ArrowLeftRight, ChevronRight, Heart, LogOut, Package, Phone, ShoppingCart, Store, type LucideIcon } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { toPublicStore } from '@/api/sellerCatalog';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBadge } from '@/components/seller/StatusBadge';
import { switchSpace } from '@/components/seller/SpaceSwitch';
import { StoreAvatar } from '@/components/StoreAvatar';
import { DEMO_USER } from '@/data/demo';
import { useAuth } from '@/store/useAuth';
import { useSeller } from '@/store/useSeller';
import { colors, fonts, radii, shadows, spacing, typography } from '@/theme';
import { photoUrl } from '@/utils/images';

const LINKS: { label: string; icon: LucideIcon; href: Href }[] = [
  { label: 'Mes commandes', icon: Package, href: '/orders' },
  { label: 'Mes favoris', icon: Heart, href: '/favorites' },
  { label: 'Mon panier', icon: ShoppingCart, href: '/cart' },
  { label: 'Boutiques', icon: Store, href: '/stores' },
];

export default function AccountScreen() {
  const session = useAuth((s) => s.session);
  const signOut = useAuth((s) => s.signOut);
  const store = useSeller((s) => s.store);
  const draftName = useSeller((s) => s.draft.name);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Mon compte" />
      <ScrollView contentContainerStyle={{ padding: spacing.screen, gap: spacing.lg, paddingBottom: 48 }}>
        <View style={styles.profile}>
          <Image source={{ uri: photoUrl(DEMO_USER.avatarPhotoId, 72, 1) }} style={styles.avatar} cachePolicy="memory-disk" />
          <View style={{ flex: 1 }}>
            <Text style={typography.h2}>Bonjour {DEMO_USER.firstName}</Text>
            {session ? (
              <View style={styles.phoneRow}>
                <Phone size={13} color={colors.textSecondary} strokeWidth={1.8} />
                <Text style={typography.caption}>{session.phone}</Text>
              </View>
            ) : (
              <Text style={styles.signIn} onPress={() => router.push('/auth')}>
                Se connecter par SMS
              </Text>
            )}
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
          <Pressable
            onPress={() =>
              Alert.alert('Se déconnecter ?', 'Votre boutique reste enregistrée sur cet appareil.', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Se déconnecter', style: 'destructive', onPress: signOut },
              ])
            }
            style={styles.logout}
          >
            <LogOut size={18} color={colors.textSecondary} strokeWidth={1.8} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: colors.champagne },
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
