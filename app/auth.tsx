import { router, useLocalSearchParams, type Href } from 'expo-router';
import { MessageSquareText, ShieldCheck, X } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/BrandLogo';
import { CircleIconButton } from '@/components/CircleIconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { FormField, SelectField } from '@/components/seller/FormField';
import { AUTH_DEMO_MODE, COUNTRIES, DEMO_OTP_CODE, useAuth, type CountryCode } from '@/store/useAuth';
import { usePicker, usePickerResult } from '@/store/usePicker';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

const RESEND_SECONDS = 30;

/** Connexion par SMS : numéro → code à 6 chiffres. */
export default function AuthScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const insets = useSafeAreaInsets();
  const requestOtp = useAuth((s) => s.requestOtp);
  const verifyOtp = useAuth((s) => s.verifyOtp);
  const openPicker = usePicker((s) => s.open);

  const [countryCode, setCountryCode] = useState<CountryCode>('CI');
  const [local, setLocal] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeInput = useRef<ComponentRef<typeof TextInput>>(null);
  const shake = useSharedValue(0);

  usePickerResult('country', (v) => setCountryCode(v as CountryCode));

  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  const digits = local.replace(/\D/g, '');
  const phoneValid = digits.length >= country.digits - 1 && digits.length <= country.digits + 1;
  const fullPhone = `${country.dial} ${digits}`;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const sendCode = async () => {
    if (!phoneValid) {
      setError(`Numéro à ${country.digits} chiffres attendu`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await requestOtp(fullPhone);
    } catch (e) {
      setLoading(false);
      setError((e as Error).message);
      return;
    }
    setLoading(false);
    haptics.light();
    setStep('code');
    setCode('');
    setCooldown(RESEND_SECONDS);
    setTimeout(() => codeInput.current?.focus(), 350);
  };

  const submitCode = async (value: string) => {
    setLoading(true);
    const ok = await verifyOtp(fullPhone, value);
    setLoading(false);
    if (!ok) {
      haptics.medium();
      setError('Code incorrect. Vérifiez le SMS reçu.');
      shake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
      setCode('');
      return;
    }
    haptics.success();
    router.replace((next as Href) ?? '/account');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <CircleIconButton size={40} onPress={() => (step === 'code' ? setStep('phone') : router.back())} accessibilityLabel="Retour">
          <X size={20} strokeWidth={1.8} color={colors.text} />
        </CircleIconButton>
      </View>

      <View style={styles.body}>
        <Animated.View entering={FadeInDown.duration(350)}>
          <BrandLogo size={40} showTagline={false} />
        </Animated.View>

        {step === 'phone' ? (
          <Animated.View key="phone" entering={FadeInDown.duration(350)} style={{ gap: spacing.xl }}>
            <View>
              <Text style={typography.h1}>Connexion</Text>
              <Text style={styles.subtitle}>Entrez votre numéro : nous vous envoyons un code par SMS. Pas de mot de passe à retenir.</Text>
            </View>
            <SelectField
              label="Pays"
              value={`${country.name} (${country.dial})`}
              placeholder="Choisir"
              leading={<Text style={{ fontSize: 20 }}>{country.flag}</Text>}
              onPress={() => openPicker('country', countryCode)}
            />
            <FormField
              label="Numéro de téléphone"
              value={local}
              onChangeText={(t) => {
                setLocal(t.replace(/[^\d ]/g, ''));
                setError(null);
              }}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              placeholder={'0'.repeat(country.digits).replace(/(\d{2})(?=\d)/g, '$1 ')}
              prefix={<Text style={styles.dial}>{country.dial}</Text>}
              error={error}
              onSubmitEditing={sendCode}
              returnKeyType="send"
            />
            <PrimaryButton label={loading ? 'Envoi…' : 'Recevoir le code'} onPress={sendCode} disabled={loading || digits.length === 0} />
            <View style={styles.reassure}>
              <ShieldCheck size={16} color={colors.cognac} strokeWidth={1.8} />
              <Text style={styles.reassureText}>Votre numéro n’est jamais affiché publiquement.</Text>
            </View>
          </Animated.View>
        ) : (
          <Animated.View key="code" entering={FadeInRight.duration(320)} style={{ gap: spacing.xl }}>
            <View>
              <Text style={typography.h1}>Code reçu par SMS</Text>
              <Text style={styles.subtitle}>
                Saisissez le code à 6 chiffres envoyé au <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>{fullPhone}</Text>
              </Text>
            </View>

            {AUTH_DEMO_MODE && (
              <View style={styles.demo}>
                <MessageSquareText size={18} color={colors.chocolate} strokeWidth={1.8} />
                <Text style={styles.demoText}>
                  Mode démo : aucun SMS n’est envoyé. Code : <Text style={{ fontFamily: fonts.bold }}>{DEMO_OTP_CODE}</Text>
                </Text>
              </View>
            )}

            <Pressable onPress={() => codeInput.current?.focus()} accessibilityLabel="Saisir le code">
              <Animated.View style={[styles.codeRow, shakeStyle]}>
                {Array.from({ length: 6 }).map((_, i) => {
                  const filled = i < code.length;
                  const current = i === code.length;
                  return (
                    <View key={i} style={[styles.codeBox, current && styles.codeBoxActive, filled && styles.codeBoxFilled]}>
                      <Text style={styles.codeDigit}>{code[i] ?? ''}</Text>
                    </View>
                  );
                })}
              </Animated.View>
              <TextInput
                ref={codeInput}
                value={code}
                onChangeText={(t) => {
                  const v = t.replace(/\D/g, '').slice(0, 6);
                  setCode(v);
                  setError(null);
                  if (v.length === 6) submitCode(v);
                }}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                autoFocus
                style={styles.hiddenInput}
                caretHidden
              />
            </Pressable>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton label={loading ? 'Vérification…' : 'Valider'} onPress={() => submitCode(code)} disabled={loading || code.length < 6} />
            <Text
              onPress={cooldown > 0 ? undefined : sendCode}
              style={[styles.resend, cooldown > 0 && { color: colors.textMuted }]}
              accessibilityRole="button"
            >
              {cooldown > 0 ? `Renvoyer le code dans ${cooldown} s` : 'Renvoyer le code'}
            </Text>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  top: { paddingHorizontal: spacing.screen },
  body: { paddingHorizontal: spacing.screen + 4, paddingTop: spacing.lg, gap: spacing.xxl },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, marginTop: 6, lineHeight: 21 },
  dial: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  reassure: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  reassureText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  demo: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radii.md, backgroundColor: '#F6E8D6', borderWidth: 1, borderColor: colors.champagne },
  demoText: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, color: colors.chocolate },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  codeBox: {
    flex: 1,
    aspectRatio: 0.85,
    maxWidth: 56,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: { borderColor: colors.caramel, borderWidth: 2 },
  codeBoxFilled: { backgroundColor: colors.surface, borderColor: colors.champagne },
  codeDigit: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  error: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.promo, textAlign: 'center', marginTop: -8 },
  resend: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.cognac, textAlign: 'center' },
});
