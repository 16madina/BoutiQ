import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CollectionsEditor } from '@/components/seller/CollectionsEditor';
import { IdDocumentField } from '@/components/seller/IdDocumentField';
import { OnboardingScaffold } from '@/components/seller/OnboardingScaffold';
import { StorePreviewCard } from '@/components/seller/StorePreviewCard';
import { useSeller } from '@/store/useSeller';
import { colors, fonts } from '@/theme';
import { haptics } from '@/utils/haptics';
import { defaultBanner } from '@/utils/storeDefaults';

/** Étape 3 — Terminer : aperçu, collections, pièce d'identité (facultative), création. */
export default function FinishStep() {
  const draft = useSeller((s) => s.draft);
  const updateDraft = useSeller((s) => s.updateDraft);
  const updateDetails = useSeller((s) => s.updateDraftDetails);
  const createStoreFromDraft = useSeller((s) => s.createStoreFromDraft);

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
      intro={<Text style={styles.intro}>Dernière vérification : voici votre vitrine.</Text>}
    >
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
        <Text style={styles.label}>Collections</Text>
        <Text style={styles.hint}>Rangez vos produits par rayon. Touchez une suggestion pour l’ajouter.</Text>
        <CollectionsEditor value={draft.collections} onChange={(collections) => updateDraft({ collections })} categoryId={draft.categoryId} />
      </View>

      <IdDocumentField uri={draft.details.idDocument?.uri} onPick={(idDocument) => updateDetails({ idDocument })} />
      <Text style={styles.later}>Pas de pièce sous la main ? Créez votre boutique maintenant et ajoutez-la plus tard.</Text>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.textSecondary, textAlign: 'center' },
  card: { padding: 16, gap: 10, borderRadius: 24, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  later: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, textAlign: 'center', marginTop: -10 },
});
