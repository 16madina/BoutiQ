import { router } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { saveProfile } from '@/api/account';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormField } from '@/components/seller/FormField';
import { initialsOf, useProfile } from '@/store/useProfile';
import { colors, fonts, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

/** Mon profil : nom, téléphone, adresse de livraison (préremplit les commandes). */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [city, setCity] = useState(profile.city);
  const [address, setAddress] = useState(profile.address);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = fullName !== profile.fullName || phone !== profile.phone || city !== profile.city || address !== profile.address;

  const save = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await saveProfile({ fullName: fullName.trim(), phone: phone.trim(), city: city.trim(), address: address.trim() });
      haptics.success();
      setMessage({ ok: true, text: 'Profil enregistré.' });
    } catch (e) {
      // Gardé sur l'appareil même sans réseau.
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Mon profil" />
      <ScrollView contentContainerStyle={{ padding: spacing.screen, gap: spacing.lg, paddingBottom: 140 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initialsOf(fullName) || '?'}</Text>
          </View>
          <Text style={styles.hint}>Ces informations servent à vos livraisons. Elles ne sont visibles que par les boutiques où vous commandez.</Text>
        </View>
        <FormField label="Nom complet" value={fullName} onChangeText={setFullName} autoCapitalize="words" textContentType="name" placeholder="Ex. Aïcha Koné" />
        <FormField label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+225 07 00 00 00 00" />
        <FormField label="Ville" value={city} onChangeText={setCity} autoCapitalize="words" placeholder="Ex. Abidjan" />
        <FormField label="Adresse ou repère" optional value={address} onChangeText={(t) => setAddress(t.slice(0, 160))} placeholder="Quartier, rue, à côté de…" />
        {message && (
          <Animated.View entering={FadeIn} style={[styles.message, { backgroundColor: message.ok ? '#E7EFDF' : '#F6E8D6' }]}>
            {message.ok && <CircleCheck size={17} color="#3F6B3A" strokeWidth={2} />}
            <Text style={[styles.messageText, { color: message.ok ? '#2F5A2B' : colors.chocolate }]}>{message.text}</Text>
          </Animated.View>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <PrimaryButton label={busy ? 'Enregistrement…' : 'Enregistrer'} onPress={save} disabled={busy || !dirty} variant="caramel" style={{ height: 56 }} />
        {!dirty && message?.ok && (
          <Text style={styles.link} onPress={() => router.back()} accessibilityRole="button">
            Retour
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  avatarWrap: { alignItems: 'center', gap: 12, paddingVertical: 6 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.bold, fontSize: 30, color: colors.white },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18, paddingHorizontal: 12 },
  message: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  messageText: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 6, paddingHorizontal: spacing.screen, paddingTop: 12, backgroundColor: colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  link: { fontFamily: fonts.semibold, fontSize: 15, color: colors.cognac, textAlign: 'center', paddingVertical: 6 },
});
