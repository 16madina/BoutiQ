import { router } from 'expo-router';
import { Check, Link2, TriangleAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BannerField, LogoField } from '@/components/seller/BrandingFields';
import { FormField } from '@/components/seller/FormField';
import { OnboardingScaffold } from '@/components/seller/OnboardingScaffold';
import { storeDisplayAddress } from '@/config/links';
import { useSeller } from '@/store/useSeller';
import { colors, fonts } from '@/theme';
import { checkSlug, slugify, suggestSlug } from '@/utils/slug';

/** Étape 1 — Identité : nom, logo, bannière (maquette « Créer ma boutique »). */
export default function IdentityStep() {
  const draft = useSeller((s) => s.draft);
  const updateDraft = useSeller((s) => s.updateDraft);
  const [editSlug, setEditSlug] = useState(false);

  const slugCheck = useMemo(() => checkSlug(draft.slug), [draft.slug]);
  const canContinue = draft.name.trim().length >= 2 && slugCheck.ok;

  const onName = (name: string) => {
    const patch: Partial<typeof draft> = { name };
    if (!draft.slugEdited) {
      const base = slugify(name);
      patch.slug = base.length >= 3 && !checkSlug(base).ok ? suggestSlug(base) : base;
    }
    updateDraft(patch);
  };

  return (
    <OnboardingScaffold step={1} ctaDisabled={!canContinue} onNext={() => router.push('/open-store/details')}>
      <View style={{ gap: 8 }}>
        <FormField
          label="Nom de votre boutique"
          required
          value={draft.name}
          onChangeText={onName}
          placeholder="Ex. Maison Élégance"
          maxLength={40}
          autoCapitalize="words"
          returnKeyType="done"
        />
        {draft.slug.length > 0 && !editSlug && (
          <Animated.View entering={FadeIn} style={styles.addressRow}>
            {slugCheck.ok ? (
              <Check size={14} color={colors.success} strokeWidth={2.6} />
            ) : (
              <TriangleAlert size={14} color={colors.promo} strokeWidth={2} />
            )}
            <Text style={[styles.address, !slugCheck.ok && { color: colors.promo }]} numberOfLines={1}>
              {slugCheck.ok ? storeDisplayAddress(draft.slug) : slugCheck.reason}
            </Text>
            <Text style={styles.edit} onPress={() => setEditSlug(true)} accessibilityRole="button">
              Modifier
            </Text>
          </Animated.View>
        )}
        {editSlug && (
          <Animated.View entering={FadeIn}>
            <FormField
              label="Adresse publique"
              value={draft.slug}
              onChangeText={(t) => updateDraft({ slug: slugify(t.replace(/ /g, '-')) || t.toLowerCase(), slugEdited: true })}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              prefix={<Link2 size={17} color={colors.textSecondary} strokeWidth={1.8} />}
              error={draft.slug && !slugCheck.ok ? slugCheck.reason : null}
              hint="Lettres, chiffres et tirets. Elle ne pourra plus changer ensuite."
              onBlur={() => slugCheck.ok && setEditSlug(false)}
            />
          </Animated.View>
        )}
      </View>

      <LogoField value={draft.logo} onChange={(logo) => updateDraft({ logo })} categoryId={draft.categoryId} />
      <BannerField value={draft.banner} onChange={(banner) => updateDraft({ banner })} categoryId={draft.categoryId} />
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  address: { flex: 1, fontFamily: fonts.medium, fontSize: 12.5, color: colors.caramel },
  edit: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.text, textDecorationLine: 'underline' },
});
