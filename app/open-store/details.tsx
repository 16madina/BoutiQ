import { router } from 'expo-router';
import { Lock, Phone } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { getCategory } from '@/api/catalog';
import { FormField, SegmentedChoice, SelectField } from '@/components/seller/FormField';
import { OnboardingScaffold } from '@/components/seller/OnboardingScaffold';
import { useAuth } from '@/store/useAuth';
import { usePicker, usePickerResult } from '@/store/usePicker';
import { useSeller } from '@/store/useSeller';
import { colors, fonts } from '@/theme';
import type { CategoryId } from '@/types';
import type { SellerType } from '@/types/seller';
import { haptics } from '@/utils/haptics';

const DESCRIPTION_MAX = 280;

/** Étape 2 — Détails : ce que vend la boutique, où, et qui la tient. */
export default function DetailsStep() {
  const draft = useSeller((s) => s.draft);
  const updateDraft = useSeller((s) => s.updateDraft);
  const updateDetails = useSeller((s) => s.updateDraftDetails);
  const phone = useAuth((s) => s.session?.phone);
  const openPicker = usePicker((s) => s.open);
  const details = draft.details;

  usePickerResult('category', (v) => updateDraft({ categoryId: v as CategoryId }));
  usePickerResult('city', (v) => {
    const [city, country] = v.split('|');
    updateDraft({ city, country });
  });

  useEffect(() => {
    if (phone && !details.phone) updateDetails({ phone, whatsapp: details.whatsapp || phone });
  }, [phone, details.phone, details.whatsapp, updateDetails]);

  const sameWhatsapp = details.whatsapp === details.phone;
  const canContinue =
    !!draft.categoryId &&
    !!draft.city &&
    details.fullName.trim().length >= 3 &&
    details.phone.replace(/\D/g, '').length >= 8 &&
    (details.sellerType === 'individual' || (details.businessName ?? '').trim().length >= 2);

  return (
    <OnboardingScaffold step={2} ctaDisabled={!canContinue} onNext={() => router.push('/open-store/finish')}>
      <Text style={styles.section}>Votre boutique</Text>
      <SelectField
        label="Que vendez-vous ?"
        required
        value={draft.categoryId ? getCategory(draft.categoryId)?.name : undefined}
        placeholder="Choisir une catégorie"
        onPress={() => openPicker('category', draft.categoryId)}
      />
      <SelectField
        label="Ville"
        required
        value={draft.city ? `${draft.city}, ${draft.country}` : undefined}
        placeholder="Où êtes-vous situé ?"
        onPress={() => openPicker('city', draft.city)}
      />
      <View>
        <FormField
          label="Description"
          optional
          value={draft.description}
          onChangeText={(t) => updateDraft({ description: t.slice(0, DESCRIPTION_MAX) })}
          placeholder="Ce qui rend votre boutique unique, en une ou deux phrases."
          multiline
        />
        <Text style={styles.counter}>
          {draft.description.length}/{DESCRIPTION_MAX}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={{ gap: 4 }}>
        <Text style={styles.section}>Vous</Text>
        <View style={styles.privacy}>
          <Lock size={13} color={colors.textSecondary} strokeWidth={1.8} />
          <Text style={styles.privacyText}>Informations privées, jamais affichées sur votre vitrine.</Text>
        </View>
      </View>
      <FormField
        label="Nom et prénom"
        required
        value={details.fullName}
        onChangeText={(t) => updateDetails({ fullName: t })}
        placeholder="Comme sur votre pièce d’identité"
        autoCapitalize="words"
        textContentType="name"
        autoComplete="name"
      />
      <SegmentedChoice<SellerType>
        label="Vous vendez en tant que"
        value={details.sellerType}
        onChange={(v) => updateDetails({ sellerType: v })}
        options={[
          { value: 'individual', label: 'Particulier', caption: 'Commerçant, artisan' },
          { value: 'business', label: 'Entreprise', caption: 'Société enregistrée' },
        ]}
      />
      {details.sellerType === 'business' && (
        <Animated.View entering={FadeIn.duration(250)}>
          <FormField
            label="Nom de l’entreprise"
            required
            value={details.businessName ?? ''}
            onChangeText={(t) => updateDetails({ businessName: t })}
            placeholder="Raison sociale"
          />
        </Animated.View>
      )}
      <FormField
        label="Téléphone"
        required
        value={details.phone}
        onChangeText={(t) => updateDetails({ phone: t, whatsapp: sameWhatsapp ? t : details.whatsapp })}
        keyboardType="phone-pad"
        prefix={<Phone size={17} color={colors.textSecondary} strokeWidth={1.8} />}
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Même numéro pour WhatsApp</Text>
        <Switch
          value={sameWhatsapp}
          onValueChange={(v) => {
            haptics.selection();
            updateDetails({ whatsapp: v ? details.phone : '' });
          }}
          trackColor={{ true: colors.caramel, false: colors.border }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.border}
        />
      </View>
      {!sameWhatsapp && (
        <Animated.View entering={FadeIn.duration(250)}>
          <FormField
            label="Numéro WhatsApp"
            value={details.whatsapp}
            onChangeText={(t) => updateDetails({ whatsapp: t })}
            keyboardType="phone-pad"
            placeholder="+225 07 00 00 00 00"
          />
        </Animated.View>
      )}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  counter: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  privacyText: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 },
  switchLabel: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.text },
});
