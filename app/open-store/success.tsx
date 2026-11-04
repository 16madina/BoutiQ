import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { Check, ChevronRight, CircleCheck, Eye, MessageCircle, Package, PaintbrushVertical, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/PressableScale';
import { StoreLogoMark } from '@/components/seller/BrandingFields';
import { shareOnWhatsApp, storeShareMessage } from '@/config/links';
import { useSeller } from '@/store/useSeller';
import { colors, fonts, gradients, radii, shadows, spacing } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';

/** Éclats de confettis autour de la coche (angle en degrés, distance, rotation, couleur). */
const CONFETTI = [
  { a: -150, d: 92, r: 35, c: colors.caramel },
  { a: -120, d: 74, r: -40, c: '#E3A24F' },
  { a: -60, d: 78, r: 50, c: colors.caramel },
  { a: -30, d: 96, r: -25, c: '#E3A24F' },
  { a: 10, d: 88, r: 60, c: colors.cognac },
  { a: 170, d: 86, r: -55, c: colors.cognac },
  { a: -95, d: 100, r: 15, c: '#E3A24F' },
  { a: 200, d: 70, r: 30, c: colors.caramel },
];

function ConfettiPiece({ a, d, r, c, i }: { a: number; d: number; r: number; c: string; i: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(180 + i * 25, withSpring(1, { damping: 9, stiffness: 120 }));
  }, [p, i]);
  const rad = (a * Math.PI) / 180;
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(p.value * 1.5, 1),
    transform: [
      { translateX: Math.cos(rad) * d * p.value },
      { translateY: Math.sin(rad) * d * p.value },
      { rotate: `${r * p.value}deg` },
    ],
  }));
  return <Animated.View style={[styles.confetti, { backgroundColor: c }, style]} />;
}

function ActionRow({ icon: Icon, label, onPress, primary }: { icon: LucideIcon; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <PressableScale onPress={onPress} activeScale={0.97} accessibilityRole="button" style={[styles.action, primary ? styles.actionPrimary : styles.actionSecondary]}>
      {primary && <LinearGradient colors={gradients.activeTab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      {/* Enveloppé dans une View : sur le web, le dégradé positionné passerait devant le SVG */}
      <View>
        <Icon size={24} color={primary ? colors.white : colors.text} strokeWidth={1.6} />
      </View>
      <Text style={[styles.actionText, primary && { color: colors.white }]}>{label}</Text>
    </PressableScale>
  );
}

/** « Votre boutique est prête ! » */
export default function StoreCreated() {
  const insets = useSafeAreaInsets();
  const store = useSeller((s) => s.store);
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 11, stiffness: 180 });
  }, [scale]);
  const badge = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!store) return <Redirect href="/open-store" />;
  const openStore = () => router.replace({ pathname: '/store/[id]', params: { id: store.slug } });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: 32 + insets.bottom, paddingHorizontal: spacing.screen }} showsVerticalScrollIndicator={false}>
        <View style={styles.burst}>
          {CONFETTI.map((c, i) => (
            <ConfettiPiece key={i} {...c} i={i} />
          ))}
          <Animated.View style={[styles.check, badge]}>
            <Check size={38} color={colors.white} strokeWidth={2.6} />
          </Animated.View>
        </View>

        <Animated.Text entering={FadeInDown.delay(250)} style={styles.title}>
          {'Votre boutique\nest prête !'}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(330)} style={styles.subtitle}>
          Votre boutique a été créée avec succès.{'\n'}Vous pouvez maintenant ajouter vos produits.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(420)}>
          <Pressable onPress={openStore} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={`Voir ${store.name}`}>
            {store.banner ? (
              <Image source={{ uri: store.banner.uri }} style={styles.cardBanner} contentFit="cover" transition={200} />
            ) : (
              <View style={[styles.cardBanner, { backgroundColor: colors.champagne }]} />
            )}
            <View style={styles.cardBody}>
              <View style={styles.cardLogo}>
                <StoreLogoMark logo={store.logo} categoryId={store.categoryId} size={88} />
              </View>
              <View style={styles.cardRow}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {store.name}
                  </Text>
                  <View style={styles.activePill}>
                    <CircleCheck size={15} color="#3F6B3A" strokeWidth={2} />
                    <Text style={styles.activeText}>Boutique active</Text>
                  </View>
                </View>
                <ChevronRight size={24} color={colors.text} strokeWidth={1.8} />
              </View>
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(520)} style={{ gap: 12, marginTop: spacing.xl }}>
          <ActionRow
            primary
            icon={Package}
            label="Ajouter mes premiers produits"
            onPress={() => {
              router.replace('/seller');
              setTimeout(() => router.push('/product-editor'), 50);
            }}
          />
          <ActionRow
            icon={PaintbrushVertical}
            label="Personnaliser ma boutique"
            onPress={() => {
              router.replace('/seller');
              setTimeout(() => router.push('/customize'), 50);
            }}
          />
          <ActionRow icon={Eye} label="Voir ma boutique" onPress={openStore} />
          <Pressable onPress={() => shareOnWhatsApp(storeShareMessage(store.name, store.slug))} style={styles.share} accessibilityRole="button">
            <MessageCircle size={17} color={colors.cognac} strokeWidth={1.8} />
            <Text style={styles.shareText}>Partager sur WhatsApp</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  burst: { alignSelf: 'center', width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  confetti: { position: 'absolute', width: 15, height: 6, borderRadius: 3 },
  check: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center', ...shadows.card },
  title: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.6, color: colors.text, textAlign: 'center', marginTop: spacing.xxl },
  subtitle: { fontFamily: fonts.regular, fontSize: 15.5, color: '#4A433E', textAlign: 'center', marginTop: 12, lineHeight: 23 },
  card: { marginTop: spacing.xxl, borderRadius: radii.xl, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadows.card },
  cardBanner: { height: 120, width: '100%' },
  cardBody: { paddingHorizontal: 18, paddingBottom: 16 },
  cardLogo: { marginTop: -56, alignSelf: 'flex-start', borderRadius: 50, borderWidth: 4, borderColor: colors.surface, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  cardName: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, letterSpacing: -0.3 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: '#E7EFDF', borderWidth: 1, borderColor: '#B9CFA9' },
  activeText: { fontFamily: fonts.semibold, fontSize: 13, color: '#3F6B3A' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 16, height: 58, paddingHorizontal: 22, borderRadius: radii.lg, overflow: 'hidden' },
  actionPrimary: { backgroundColor: colors.caramel, ...shadows.button },
  actionSecondary: { backgroundColor: '#FBF1E4', borderWidth: 1, borderColor: colors.champagne },
  actionText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  share: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  shareText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.cognac },
});
