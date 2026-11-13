import { router } from 'expo-router';
import { Check, ChevronRight, FlaskConical } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pullSellerData, submitForReviewOnline } from '@/api/sellerSync';
import { PrimaryButton } from '@/components/PrimaryButton';
import { supabaseEnabled } from '@/lib/supabase';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormField } from '@/components/seller/FormField';
import { IdDocumentField } from '@/components/seller/IdDocumentField';
import { STATUS_META, StatusBadge } from '@/components/seller/StatusBadge';
import { computeMissing, REQUIREMENT_LABELS, useSeller, type VerificationRequirement } from '@/store/useSeller';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

const FIX_ROUTES: Partial<Record<VerificationRequirement, '/customize' | '/product-editor'>> = {
  logo: '/customize',
  product: '/product-editor',
};

/** Vérification du vendeur : condition d'activation des ventes et paiements. */
export default function VerificationScreen() {
  const insets = useSafeAreaInsets();
  const store = useSeller((s) => s.store);
  const details = useSeller((s) => s.details);
  const updateDetails = useSeller((s) => s.updateDetails);
  const submitForReview = useSeller((s) => s.submitForReview);
  const demoReview = useSeller((s) => s.demoReview);
  const products = useSeller((s) => s.products);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  if (!store) return null;

  const send = async () => {
    if (busyRef.current) return;
    const stillMissing = computeMissing(store, details, products);
    if (stillMissing.length) {
      setMessage({ ok: false, text: `Il manque encore : ${stillMissing.map((m) => REQUIREMENT_LABELS[m].toLowerCase()).join(', ')}.` });
      return;
    }
    // Sans Supabase (démo) : envoi simulé sur l'appareil.
    if (!supabaseEnabled) {
      submitForReview();
      haptics.success();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await submitForReviewOnline();
      haptics.success();
      setMessage({ ok: true, text: 'Demande envoyée. L’équipe BoutiQ vérifie votre boutique, en général sous 48 h.' });
    } catch (e) {
      haptics.medium();
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const missing = computeMissing(store, details, products);

  const meta = STATUS_META[store.status];
  const canSubmit = store.status === 'draft' || store.status === 'rejected';
  const all: VerificationRequirement[] = ['identity', 'idDocument', 'logo', 'product'];

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Vérification" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: 140 + insets.bottom, gap: spacing.xl }}>
        <Animated.View entering={FadeInDown.duration(350)} style={[styles.statusCard, { backgroundColor: meta.bg }]}>
          <StatusBadge status={store.status} size="md" />
          <Text style={styles.statusText}>{store.status === 'rejected' && store.rejectionReason ? store.rejectionReason : meta.message}</Text>
        </Animated.View>

        <View style={styles.card}>
          <Text style={typography.h3}>Ce qu’il faut fournir</Text>
          {all.map((req) => {
            const done = !missing.includes(req);
            const fix = FIX_ROUTES[req];
            return (
              <Pressable key={req} disabled={done || !fix} onPress={() => fix && router.push(fix)} style={styles.reqRow}>
                <View style={[styles.reqCircle, done && styles.reqCircleDone]}>{done && <Check size={13} color={colors.white} strokeWidth={3} />}</View>
                <Text style={[styles.reqText, done && { color: colors.textSecondary }]}>{REQUIREMENT_LABELS[req]}</Text>
                {!done && fix && <ChevronRight size={17} color={colors.textSecondary} />}
              </Pressable>
            );
          })}
        </View>

        {canSubmit && (
          <View style={{ gap: spacing.lg }}>
            <FormField label="Nom et prénom" value={details?.fullName ?? ''} onChangeText={(fullName) => updateDetails({ fullName })} autoCapitalize="words" />
            <FormField label="Téléphone" value={details?.phone ?? ''} onChangeText={(phone) => updateDetails({ phone })} keyboardType="phone-pad" />
            <IdDocumentField uri={details?.idDocument?.uri} onPick={(idDocument) => updateDetails({ idDocument })} />
          </View>
        )}

        {message && (
          <View style={[styles.message, { backgroundColor: message.ok ? colors.successBg : colors.tint }]}>
            <Text style={[styles.messageText, { color: message.ok ? colors.successText : colors.chocolate }]}>{message.text}</Text>
          </View>
        )}

        {store.status === 'pending_review' && supabaseEnabled && (
          <Text style={styles.refresh} onPress={() => pullSellerData().catch(() => {})} accessibilityRole="button">
            Actualiser le statut
          </Text>
        )}

        {store.status === 'pending_review' && !supabaseEnabled && (
          <View style={styles.demo}>
            <View style={styles.demoHeader}>
              <FlaskConical size={17} color={colors.chocolate} strokeWidth={1.8} />
              <Text style={styles.demoTitle}>Simulation (démo)</Text>
            </View>
            <Text style={styles.demoText}>En production, la décision vient de l’équipe de modération BoutiQ.</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PrimaryButton label="Approuver" onPress={() => { demoReview('verified'); haptics.success(); }} style={{ flex: 1, height: 46 }} />
              <PrimaryButton label="Refuser" variant="light" onPress={() => { demoReview('rejected'); haptics.medium(); }} style={{ flex: 1, height: 46 }} />
            </View>
          </View>
        )}
      </ScrollView>

      {canSubmit && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <PrimaryButton
            label={busy ? 'Envoi en cours…' : store.status === 'rejected' ? 'Renvoyer pour vérification' : 'Envoyer pour vérification'}
            disabled={missing.length > 0 || busy}
            onPress={send}
          />
          {missing.length > 0 && <Text style={styles.footHint}>Complétez les éléments ci-dessus pour envoyer votre demande.</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  statusCard: { padding: 18, borderRadius: radii.lg, gap: 10 },
  statusText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textBody, lineHeight: 20 },
  card: { padding: 16, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: 4 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  reqCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  reqCircleDone: { backgroundColor: colors.caramel, borderColor: colors.caramel },
  reqText: { flex: 1, fontFamily: fonts.medium, fontSize: 14.5, color: colors.text },
  message: { padding: 14, borderRadius: radii.lg },
  messageText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  refresh: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.cognac, textAlign: 'center', paddingVertical: 6 },
  demo: { padding: 16, borderRadius: radii.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.sand, gap: 10 },
  demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  demoTitle: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.chocolate },
  demoText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.screen, paddingTop: 12, gap: 8, backgroundColor: colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  footHint: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, textAlign: 'center' },
});
