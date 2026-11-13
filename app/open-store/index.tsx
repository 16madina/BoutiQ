import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { ArrowLeft, ArrowRight, CircleCheck, Package, type LucideIcon } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/store/useAuth';
import { useSeller, useSellerHydrated } from '@/store/useSeller';
import { colors, fonts, radii, shadows, spacing } from '@/theme';
import { photoUrl } from '@/utils/images';
import { OPEN_STORE_HERO } from '@/utils/storeDefaults';

const BENEFITS: { icon: LucideIcon; text: string }[] = [
  { icon: Package, text: 'Votre boutique en ligne' },
  { icon: CircleCheck, text: 'Publiez vos produits facilement' },
  { icon: CircleCheck, text: 'Recevez vos commandes' },
  { icon: CircleCheck, text: 'Suivez vos ventes et vos revenus' },
];

/** « Ouvrez votre boutique » — premier écran du parcours vendeur. */
export default function OpenStoreIntro() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const hydrated = useSellerHydrated();
  const session = useAuth((s) => s.session);
  const store = useSeller((s) => s.store);
  const draftName = useSeller((s) => s.draft.name);

  if (hydrated && store) return <Redirect href="/seller" />;

  const heroHeight = Math.min(Math.round(width * 0.82), 360);
  const start = () => {
    if (!session) router.push({ pathname: '/auth', params: { next: '/open-store/identity' } });
    else router.push('/open-store/identity');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft size={24} strokeWidth={1.8} color={colors.text} />
        </Pressable>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.titles}>
          <Text style={styles.title}>Ouvrez votre boutique</Text>
          <Text style={styles.subtitle}>Vendez vos produits en quelques minutes,{'\n'}sans compétences techniques.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={[styles.hero, { height: heroHeight }]}>
          <LinearGradient colors={['#F3E2CC', '#EAD5BC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Image
            source={{ uri: photoUrl(OPEN_STORE_HERO, width, heroHeight / width) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={{ top: '20%', left: '50%' }}
            transition={300}
          />
          <LinearGradient
            colors={[colors.background, colors.backgroundClear, colors.backgroundClear, colors.backgroundVeil, colors.background]}
            locations={[0, 0.14, 0.55, 0.88, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).duration(450)} style={styles.benefits}>
          {BENEFITS.map(({ icon: Icon, text }) => (
            <View key={text} style={styles.benefit}>
              <Icon size={24} color={colors.cognac} strokeWidth={1.6} />
              <Text style={styles.benefitText}>{text}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PrimaryButton
          variant="caramel"
          label={draftName ? 'Reprendre ma boutique' : 'Créer ma boutique'}
          onPress={start}
          trailingIcon={<ArrowRight size={22} color={colors.white} strokeWidth={2} />}
          style={styles.cta}
        />
        {!session && <Text style={styles.footNote}>Connexion rapide par SMS, sans mot de passe</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  back: { marginLeft: spacing.screen + 4, alignSelf: 'flex-start', paddingVertical: 8 },
  titles: { alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  title: { fontFamily: fonts.bold, fontSize: 30, color: colors.text, letterSpacing: -0.6, textAlign: 'center' },
  subtitle: { fontFamily: fonts.regular, fontSize: 15.5, color: colors.textSoft, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  hero: { marginTop: spacing.xl, overflow: 'hidden' },
  benefits: {
    marginHorizontal: spacing.screen,
    marginTop: -40,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 11 },
  benefitText: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.screen, paddingTop: 12, gap: 8, backgroundColor: colors.background },
  cta: { height: 58, ...shadows.button },
  footNote: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, textAlign: 'center' },
});
