import { router, useLocalSearchParams } from 'expo-router';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCategory } from '@/api/catalog';
import { DiscountBadge } from '@/components/DiscountBadge';
import { GlassSurface } from '@/components/GlassSurface';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormField, SelectField } from '@/components/seller/FormField';
import { PhotosPicker } from '@/components/seller/ImagePickers';
import { usePicker, usePickerResult } from '@/store/usePicker';
import { useSeller } from '@/store/useSeller';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import type { CategoryId } from '@/types';
import type { LocalImage } from '@/types/seller';
import { discountPercent } from '@/utils/format';
import { haptics } from '@/utils/haptics';

const toNumber = (t: string) => Number(t.replace(/\D/g, '')) || 0;
const groupDigits = (n: number) => (n ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');

/** Ajout / modification d'un produit. */
export default function ProductEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const store = useSeller((s) => s.store);
  const existing = useSeller((s) => (id ? s.products.find((p) => p.id === id) : undefined));
  const saveProduct = useSeller((s) => s.saveProduct);
  const deleteProduct = useSeller((s) => s.deleteProduct);
  const openPicker = usePicker((s) => s.open);

  const [photos, setPhotos] = useState<LocalImage[]>(existing?.photos ?? []);
  const [name, setName] = useState(existing?.name ?? '');
  const [price, setPrice] = useState(existing?.price ?? 0);
  const [oldPrice, setOldPrice] = useState(existing?.oldPrice ?? 0);
  const [categoryId, setCategoryId] = useState<CategoryId>(existing?.categoryId ?? store?.categoryId ?? 'mode');
  const [collectionId, setCollectionId] = useState<string | undefined>(existing?.collectionId);
  const [stock, setStock] = useState(existing?.stock ?? 1);
  const [description, setDescription] = useState(existing?.description ?? '');
  const [publish, setPublish] = useState(existing ? existing.status === 'published' : true);
  const [showErrors, setShowErrors] = useState(false);

  usePickerResult('category', (v) => setCategoryId(v as CategoryId));
  usePickerResult('collection', (v) => setCollectionId(store?.collections.find((c) => c.name === v)?.id));

  if (!store) return null;

  const errors = {
    photos: photos.length === 0 ? 'Ajoutez au moins une photo' : null,
    name: name.trim().length < 2 ? 'Indiquez le nom du produit' : null,
    price: price <= 0 ? 'Indiquez un prix' : null,
    oldPrice: oldPrice > 0 && oldPrice <= price ? 'Le prix barré doit être supérieur au prix de vente' : null,
  };
  const valid = !Object.values(errors).some(Boolean);
  const percent = discountPercent(price, oldPrice || undefined);
  const collectionName = store.collections.find((c) => c.id === collectionId)?.name;

  const save = (asDraft = false) => {
    if (!asDraft && !valid) {
      setShowErrors(true);
      haptics.medium();
      return;
    }
    if (asDraft && name.trim().length === 0 && photos.length === 0) {
      router.back();
      return;
    }
    saveProduct({
      id: existing?.id,
      name: name.trim(),
      description: description.trim(),
      price,
      oldPrice: oldPrice > price ? oldPrice : undefined,
      categoryId,
      collectionId,
      photos,
      stock,
      status: asDraft || !publish ? 'draft' : 'published',
    });
    haptics.success();
    router.back();
  };

  const err = (k: keyof typeof errors) => (showErrors ? errors[k] : null);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title={existing ? 'Modifier le produit' : 'Nouveau produit'}
        right={
          existing ? (
            <Pressable
              hitSlop={10}
              accessibilityLabel="Supprimer le produit"
              onPress={() =>
                Alert.alert('Supprimer ce produit ?', 'Il sera retiré de votre vitrine.', [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: () => {
                      deleteProduct(existing.id);
                      router.back();
                    },
                  },
                ])
              }
            >
              <Trash2 size={21} color={colors.promo} strokeWidth={1.7} />
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 150 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Photos</Text>
          <Text style={styles.hint}>Jusqu’à 6 photos lumineuses. La première sert de couverture.</Text>
          <PhotosPicker value={photos} onChange={setPhotos} />
          {err('photos') ? <Text style={styles.error}>{err('photos')}</Text> : null}
        </View>

        <FormField label="Nom du produit" value={name} onChangeText={setName} placeholder="Ex. Robe wax longue" maxLength={60} error={err('name')} />

        <View style={styles.priceRow}>
          <View style={{ flex: 1 }}>
            <FormField
              label="Prix"
              value={groupDigits(price)}
              onChangeText={(t) => setPrice(toNumber(t))}
              keyboardType="number-pad"
              placeholder="0"
              suffix={<Text style={styles.currency}>FCFA</Text>}
              error={err('price')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormField
              label="Prix barré"
              optional
              value={groupDigits(oldPrice)}
              onChangeText={(t) => setOldPrice(toNumber(t))}
              keyboardType="number-pad"
              placeholder="0"
              suffix={<Text style={styles.currency}>FCFA</Text>}
              error={err('oldPrice')}
            />
          </View>
        </View>
        {percent != null && (
          <View style={styles.promoRow}>
            <DiscountBadge percent={percent} size="md" />
            <Text style={styles.hint}>Affiché sur votre produit</Text>
          </View>
        )}

        <SelectField label="Catégorie" value={getCategory(categoryId)?.name} placeholder="Choisir" onPress={() => openPicker('category', categoryId)} />
        {store.collections.length > 0 && (
          <SelectField
            label="Collection"
            optional
            value={collectionName}
            placeholder="Aucune"
            onPress={() => openPicker('collection', collectionName, store.collections.map((c) => c.name))}
          />
        )}

        <View style={styles.stockRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Quantité en stock</Text>
            <Text style={styles.hint}>{stock === 0 ? 'Affiché comme épuisé' : 'Disponible à la vente'}</Text>
          </View>
          <View style={styles.stepper}>
            <Pressable onPress={() => { haptics.selection(); setStock((s) => Math.max(0, s - 1)); }} style={styles.stepBtn} accessibilityLabel="Diminuer le stock">
              <Minus size={16} color={colors.text} strokeWidth={2.2} />
            </Pressable>
            <Text style={styles.stepValue}>{stock}</Text>
            <Pressable onPress={() => { haptics.selection(); setStock((s) => s + 1); }} style={styles.stepBtn} accessibilityLabel="Augmenter le stock">
              <Plus size={16} color={colors.text} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        <FormField
          label="Description"
          optional
          value={description}
          onChangeText={(t) => setDescription(t.slice(0, 600))}
          placeholder="Matière, taille, conseils d’entretien…"
          multiline
        />

        <View style={styles.publishRow}>
          <View style={{ flex: 1 }}>
            <Text style={typography.h3}>Publier maintenant</Text>
            <Text style={styles.hint}>
              {store.status === 'verified'
                ? 'Visible sur votre vitrine et dans tout BoutiQ.'
                : 'Visible sur votre vitrine. Les ventes s’activent après vérification.'}
            </Text>
          </View>
          <Switch
            value={publish}
            onValueChange={(v) => {
              haptics.selection();
              setPublish(v);
            }}
            trackColor={{ true: colors.caramel, false: colors.border }}
            thumbColor={colors.white}
            ios_backgroundColor={colors.border}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <GlassSurface borderRadius={0} />
        <PrimaryButton label={publish ? (existing ? 'Enregistrer' : 'Publier le produit') : 'Enregistrer le brouillon'} onPress={() => save(!publish)} />
        {publish && !existing && (
          <Text style={styles.secondary} onPress={() => save(true)}>
            Enregistrer en brouillon
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screen + 2, paddingTop: spacing.sm, gap: spacing.xl },
  label: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  hint: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, lineHeight: 17 },
  error: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.promo },
  currency: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary },
  priceRow: { flexDirection: 'row', gap: 10 },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -10 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 5, borderRadius: radii.pill, backgroundColor: colors.backgroundAlt },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontFamily: fonts.bold, fontSize: 16, minWidth: 24, textAlign: 'center', color: colors.text },
  publishRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screen,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  secondary: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.cognac, textAlign: 'center', paddingVertical: 4 },
});
