import { router } from 'expo-router';
import { Banknote, CircleCheck, ShieldCheck, Smartphone, TriangleAlert } from 'lucide-react-native';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { groupCart, MOBILE_MONEY, placeOrders, saveProfile, type MobileMoney, type PaymentMethod } from '@/api/account';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormField } from '@/components/seller/FormField';
import { useProfile } from '@/store/useProfile';
import { useSeller } from '@/store/useSeller';
import { useShop } from '@/store/useShop';
import { colors, fonts, radii, shadows, spacing, typography } from '@/theme';
import { formatFCFA } from '@/utils/format';
import { haptics } from '@/utils/haptics';

/** Commander : adresse de livraison, mode de paiement, récapitulatif, confirmation. */
export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const cart = useShop((s) => s.cart);
  const removeLines = useShop((s) => s.removeLines);
  const ownSlug = useSeller((s) => s.store?.slug);
  const profile = useProfile();
  const groups = useMemo(() => groupCart(cart, ownSlug).filter((g) => g.state === 'orderable'), [cart, ownSlug]);
  const total = groups.reduce((n, g) => n + g.total, 0);

  const [name, setName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [city, setCity] = useState(profile.city);
  const [address, setAddress] = useState(profile.address);
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('cash_on_delivery');
  const [provider, setProvider] = useState<MobileMoney | undefined>();
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const errors = {
    name: name.trim().length < 2 ? 'Indiquez votre nom.' : null,
    phone: phone.replace(/\D/g, '').length < 8 ? 'Indiquez un numéro joignable.' : null,
    city: city.trim().length < 2 ? 'Indiquez votre ville.' : null,
    provider: payment === 'mobile_money' && !provider ? 'Choisissez votre service Mobile Money.' : null,
  };
  const valid = !Object.values(errors).some(Boolean);
  const err = (k: keyof typeof errors) => (showErrors ? errors[k] : null);

  const confirm = async () => {
    if (busyRef.current) return; // pas de double commande
    if (!valid) {
      setShowErrors(true);
      haptics.medium();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const ids = await placeOrders(groups, { name: name.trim(), phone: phone.trim(), city: city.trim(), address: address.trim() || undefined }, payment, provider, note.trim());
      removeLines(groups.flatMap((g) => g.lines));
      saveProfile({ fullName: name.trim(), phone: phone.trim(), city: city.trim(), address: address.trim() }).catch(() => {});
      haptics.success();
      setDone(ids.length);
    } catch (e) {
      haptics.medium();
      setError((e as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (done != null) {
    return (
      <View style={[styles.screen, styles.done, { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeInDown.duration(380)} style={{ alignItems: 'center', gap: 14 }}>
          <View style={styles.doneIcon}>
            <CircleCheck size={40} color="#3F6B3A" strokeWidth={1.8} />
          </View>
          <Text style={styles.doneTitle}>{done > 1 ? `${done} commandes envoyées !` : 'Commande envoyée !'}</Text>
          <Text style={styles.doneText}>
            Le vendeur va confirmer et vous livrer. Vous payez à la réception. Touchez « J’ai reçu ma commande » une fois livré.
          </Text>
        </Animated.View>
        <View style={{ alignSelf: 'stretch', gap: 10 }}>
          <PrimaryButton label="Suivre ma commande" onPress={() => router.replace('/orders')} variant="caramel" style={{ height: 56 }} />
          <Text style={styles.link} onPress={() => router.replace('/')} accessibilityRole="button">
            Continuer mes achats
          </Text>
        </View>
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Commander" />
        <EmptyState icon={ShieldCheck} title="Rien à commander" message="Les articles de votre panier ne peuvent pas encore être commandés." actionLabel="Retour au panier" onAction={() => router.back()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Commander" />
      <ScrollView contentContainerStyle={{ padding: spacing.screen, gap: 18, paddingBottom: 170 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <Section title="Livraison">
          <FormField label="Nom complet" required value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" error={err('name')} />
          <FormField label="Téléphone" required value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+225 07 00 00 00 00" hint="Le vendeur vous appelle pour la livraison." error={err('phone')} />
          <FormField label="Ville" required value={city} onChangeText={setCity} autoCapitalize="words" placeholder="Ex. Abidjan" error={err('city')} />
          <FormField label="Adresse ou repère" optional value={address} onChangeText={(t) => setAddress(t.slice(0, 160))} placeholder="Quartier, rue, à côté de…" />
          <FormField label="Message au vendeur" optional value={note} onChangeText={(t) => setNote(t.slice(0, 280))} placeholder="Ex. Livrer après 17 h" multiline />
        </Section>

        <Section title="Paiement">
          <Choice
            active={payment === 'cash_on_delivery'}
            onPress={() => setPayment('cash_on_delivery')}
            icon={<Banknote size={22} color={colors.cognac} strokeWidth={1.8} />}
            title="Espèces à la livraison"
            sub="Vous payez quand vous recevez votre commande."
          />
          <Choice
            active={payment === 'mobile_money'}
            onPress={() => setPayment('mobile_money')}
            icon={<Smartphone size={22} color={colors.cognac} strokeWidth={1.8} />}
            title="Mobile Money à la livraison"
            sub="Wave, Orange Money, MTN ou Moov, au moment de la livraison."
          />
          {payment === 'mobile_money' && (
            <Animated.View entering={FadeIn} style={styles.providers}>
              {MOBILE_MONEY.map((m) => {
                const active = provider === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      haptics.selection();
                      setProvider(m.id);
                    }}
                    style={[styles.provider, active && { borderColor: colors.text, borderWidth: 2 }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[styles.providerDot, { backgroundColor: m.color }]} />
                    <Text style={styles.providerText}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </Animated.View>
          )}
          {err('provider') ? <Text style={styles.error}>{err('provider')}</Text> : null}
          <View style={styles.trust}>
            <ShieldCheck size={18} color="#3F6B3A" strokeWidth={1.8} />
            <Text style={styles.trustText}>Vous ne payez rien maintenant. La vente est confirmée au vendeur quand vous touchez « J’ai reçu ma commande ».</Text>
          </View>
        </Section>

        <Section title="Récapitulatif">
          {groups.map((g) => (
            <View key={g.storeKey} style={styles.sumRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sumStore} numberOfLines={1}>
                  {g.storeName}
                </Text>
                <Text style={typography.caption}>
                  {g.lines.reduce((n, l) => n + l.quantity, 0)} article{g.lines.reduce((n, l) => n + l.quantity, 0) > 1 ? 's' : ''} · livré par la boutique
                </Text>
              </View>
              <Text style={styles.sumPrice}>{formatFCFA(g.total)}</Text>
            </View>
          ))}
          <View style={[styles.sumRow, styles.sumTotal]}>
            <Text style={typography.h3}>Total</Text>
            <Text style={[typography.price, { fontSize: 20 }]}>{formatFCFA(total)}</Text>
          </View>
          <Text style={typography.caption}>Frais de livraison éventuels à convenir avec le vendeur.</Text>
        </Section>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {error ? (
          <View style={styles.errorBox}>
            <TriangleAlert size={16} color={colors.promo} strokeWidth={2} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <PrimaryButton label={busy ? 'Envoi de la commande…' : `Confirmer la commande · ${formatFCFA(total)}`} onPress={confirm} disabled={busy} variant="caramel" style={{ height: 58 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Choice({ active, onPress, icon, title, sub }: { active: boolean; onPress: () => void; icon: ReactNode; title: string; sub: string }) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={[styles.choice, active && styles.choiceActive]}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={typography.caption}>{sub}</Text>
      </View>
      <View style={[styles.radio, active && styles.radioOn]}>{active && <View style={styles.radioDot} />}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  section: { gap: 14, padding: 16, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadows.soft },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  choiceActive: { borderColor: colors.text, borderWidth: 2 },
  choiceTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.text },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.text },
  providers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  provider: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  providerDot: { width: 14, height: 14, borderRadius: 7 },
  providerText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  trust: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radii.md, backgroundColor: '#E7EFDF' },
  trustText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: '#2F5A2B' },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sumStore: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  sumPrice: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  sumTotal: { paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, justifyContent: 'space-between' },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.promo },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 10, paddingHorizontal: spacing.screen, paddingTop: 12, backgroundColor: colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  errorText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13.5, color: colors.promo },
  done: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.screen + 4 },
  doneIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E7EFDF', alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontFamily: fonts.bold, fontSize: 26, color: colors.text, textAlign: 'center' },
  doneText: { fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 22, color: '#4A433E', textAlign: 'center' },
  link: { fontFamily: fonts.semibold, fontSize: 15, color: colors.cognac, textAlign: 'center', paddingVertical: 8 },
});
