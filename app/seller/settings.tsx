import { router } from 'expo-router';
import { ArrowLeftRight, ChevronRight, Link2, MessageCircle, Paintbrush, Share2, ShieldCheck } from 'lucide-react-native';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getCategory } from '@/api/catalog';
import { resolveOwnSettings } from '@/api/storefront';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormField, SelectField } from '@/components/seller/FormField';
import { StatusBadge } from '@/components/seller/StatusBadge';
import { switchSpace } from '@/components/seller/SpaceSwitch';
import { shareAnywhere, shareOnWhatsApp, storeDisplayAddress, storeShareMessage } from '@/config/links';
import { usePicker, usePickerResult } from '@/store/usePicker';
import { useSeller } from '@/store/useSeller';
import { TEMPLATES } from '@/storefront/templates';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import type { CategoryId } from '@/types';

/** Paramètres de la boutique : chaque modification est enregistrée immédiatement. */
export default function SellerSettings() {
  const bottomSpace = useTabBarSpace();
  const store = useSeller((s) => s.store);
  const updateStore = useSeller((s) => s.updateStore);
  const openPicker = usePicker((s) => s.open);

  usePickerResult('category', (v) => updateStore({ categoryId: v as CategoryId }));
  usePickerResult('city', (v) => {
    const [city, country] = v.split('|');
    updateStore({ city, country });
  });

  if (!store) return null;
  const message = storeShareMessage(store.name, store.slug);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Ma boutique" back={false} large />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: bottomSpace + 20, gap: spacing.xl }} keyboardShouldPersistTaps="handled">
        {/* Adresse publique */}
        <View style={styles.card}>
          <Text style={typography.h3}>Adresse de votre boutique</Text>
          <View style={styles.address}>
            <Link2 size={17} color={colors.cognac} strokeWidth={1.8} />
            <Text style={styles.addressText} numberOfLines={1} selectable>
              {storeDisplayAddress(store.slug)}
            </Text>
          </View>
          <View style={styles.shareRow}>
            <Pressable onPress={() => shareOnWhatsApp(message)} style={[styles.shareBtn, { backgroundColor: colors.buttonPrimary }]}>
              <MessageCircle size={17} color={colors.white} strokeWidth={1.9} />
              <Text style={[styles.shareText, { color: colors.white }]}>WhatsApp</Text>
            </Pressable>
            <Pressable onPress={() => shareAnywhere(message)} style={styles.shareBtn}>
              <Share2 size={17} color={colors.text} strokeWidth={1.8} />
              <Text style={styles.shareText}>Autres réseaux</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>L’adresse est définitive pour que vos liens partagés restent valides.</Text>
        </View>

        {/* Vérification */}
        <Pressable onPress={() => router.push('/verification')} style={[styles.card, styles.rowCard]}>
          <ShieldCheck size={22} color={colors.cognac} strokeWidth={1.7} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={typography.h3}>Vérification</Text>
            <StatusBadge status={store.status} />
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </Pressable>

        {/* Apparence : modèle, couleurs, photos, collections, vedettes */}
        <Pressable onPress={() => router.push('/customize')} style={[styles.card, styles.rowCard, styles.customize]} accessibilityRole="button">
          <View style={styles.customizeIcon}>
            <Paintbrush size={20} color={colors.white} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[typography.h3, { color: colors.white }]}>Personnaliser ma boutique</Text>
            <Text style={styles.customizeText}>
              Modèle {TEMPLATES[resolveOwnSettings(store).template].shortLabel} · couleurs, photos, collections, vedettes
            </Text>
          </View>
          <ChevronRight size={18} color={colors.champagne} />
        </Pressable>

        {/* Informations */}
        <View style={{ gap: spacing.lg }}>
          <Text style={typography.h3}>Informations</Text>
          <FormField label="Nom de la boutique" value={store.name} onChangeText={(name) => updateStore({ name })} maxLength={40} />
          <SelectField
            label="Catégorie principale"
            value={getCategory(store.categoryId)?.name}
            placeholder="Choisir"
            onPress={() => openPicker('category', store.categoryId)}
          />
          <SelectField label="Ville" value={`${store.city}, ${store.country}`} placeholder="Choisir" onPress={() => openPicker('city', store.city)} />
          <FormField
            label="Description"
            value={store.description}
            onChangeText={(description) => updateStore({ description: description.slice(0, 280) })}
            multiline
          />
        </View>

        <Pressable onPress={() => switchSpace('buyer')} style={[styles.card, styles.rowCard]}>
          <ArrowLeftRight size={20} color={colors.cognac} strokeWidth={1.8} />
          <Text style={[styles.addressText, { fontFamily: fonts.semibold }]}>Passer à l’espace acheteur</Text>
          <ChevronRight size={18} color={colors.textSecondary} />
        </Pressable>

        <Text
          style={styles.danger}
          onPress={() =>
            Alert.alert('Supprimer la boutique ?', 'Démo : la boutique et ses produits seront effacés de cet appareil.', [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Supprimer',
                style: 'destructive',
                onPress: () => {
                  useSeller.setState({ store: null, details: null, products: [], storeViews: 0, space: 'buyer' });
                  router.replace('/');
                },
              },
            ])
          }
        >
          Supprimer la boutique (démo)
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  card: { padding: 16, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: 12 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  customize: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  customizeIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center' },
  customizeText: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.sand, lineHeight: 17 },
  address: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 48, borderRadius: radii.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  addressText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  shareRow: { flexDirection: 'row', gap: 10 },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: radii.pill, backgroundColor: '#F6E8D6', borderWidth: 1, borderColor: colors.champagne },
  shareText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  hint: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary },
  danger: { fontFamily: fonts.medium, fontSize: 14, color: colors.promo, textAlign: 'center', paddingVertical: 8 },
});
