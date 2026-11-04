import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { getCategory } from '@/api/catalog';
import { CollectionsEditor } from '@/components/seller/CollectionsEditor';
import { IdDocumentField } from '@/components/seller/IdDocumentField';
import { OnboardingScaffold } from '@/components/seller/OnboardingScaffold';
import { StorePreviewCard } from '@/components/seller/StorePreviewCard';
import { TemplatePicker } from '@/components/storefront/TemplatePicker';
import { TEMPLATES, templateForCategory } from '@/storefront/templates';
import { useSeller } from '@/store/useSeller';
import { colors, fonts } from '@/theme';
import { haptics } from '@/utils/haptics';
import { defaultBanner } from '@/utils/storeDefaults';

/** Étape 3 — Terminer : modèle de boutique, aperçu, collections (facultatives), pièce d'identité, création. */
export default function FinishStep() {
  const draft = useSeller((s) => s.draft);
  const updateDraft = useSeller((s) => s.updateDraft);
  const updateDetails = useSeller((s) => s.updateDraftDetails);
  const createStoreFromDraft = useSeller((s) => s.createStoreFromDraft);

  const recommended = templateForCategory(draft.categoryId);
  const templateId = draft.template ?? recommended;
  const template = TEMPLATES[templateId];
  const categoryName = draft.categoryId ? getCategory(draft.categoryId)?.name : undefined;

  const create = () => {
    // Sans bannière choisie, la photo proposée devient la bannière de la boutique.
    if (!draft.banner) updateDraft({ banner: defaultBanner(draft.categoryId) });
    createStoreFromDraft();
    haptics.success();
    router.replace('/open-store/success');
  };

  return (
    <OnboardingScaffold
      step={3}
      ctaLabel="Créer ma boutique"
      onNext={create}
      card={false}
      intro={<Text style={styles.intro}>Dernière étape : le style de votre boutique.</Text>}
    >
      <View style={styles.card}>
        <Text style={styles.label}>Modèle de boutique</Text>
        <Text style={styles.hint}>
          {templateId === recommended
            ? `Nous vous conseillons le modèle ${template.shortLabel}${categoryName ? `, pensé pour la catégorie ${categoryName}` : ''}. Gardez-le ou choisissez-en un autre.`
            : template.hint}
        </Text>
        <View style={styles.bleed}>
          <TemplatePicker value={templateId} onChange={(t) => updateDraft({ template: t })} recommended={recommended} />
        </View>
        <Text style={styles.later}>Vous pourrez changer de modèle et de couleur à tout moment, sans perdre vos produits.</Text>
      </View>

      <StorePreviewCard
        name={draft.name}
        slug={draft.slug}
        city={draft.city}
        categoryId={draft.categoryId}
        description={draft.description}
        logo={draft.logo}
        banner={draft.banner ?? defaultBanner(draft.categoryId)}
        collections={draft.collections}
      />

      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Collections</Text>
          <Text style={styles.optional}>Facultatif</Text>
        </View>
        <Text style={styles.hint}>Rangez vos produits par rayon, maintenant ou plus tard depuis « Personnaliser ma boutique ».</Text>
        <CollectionsEditor
          value={draft.collections}
          onChange={(collections) => updateDraft({ collections })}
          categoryId={draft.categoryId}
          suggestions={template.suggestedCollections}
        />
      </View>

      <IdDocumentField uri={draft.details.idDocument?.uri} onPick={(idDocument) => updateDetails({ idDocument })} />
      <Text style={[styles.later, { marginTop: -10 }]}>Pas de pièce sous la main ? Créez votre boutique maintenant et ajoutez-la plus tard.</Text>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.textSecondary, textAlign: 'center' },
  card: { padding: 16, gap: 10, borderRadius: 24, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: 'hidden' },
  bleed: { marginHorizontal: -16, marginTop: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  optional: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textMuted },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  later: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, textAlign: 'center' },
});
