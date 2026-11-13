import { Image } from 'expo-image';
import { Truck, X } from 'lucide-react-native';
import { Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/CircleIconButton';
import { ProductCard } from '@/components/ProductCard';
import { ProductPrice } from '@/components/ProductPrice';
import { colors, fonts, radii, spacing } from '@/theme';
import type { Product } from '@/types';
import type { ProductForm, SellerStore } from '@/types/seller';
import { formatFCFA } from '@/utils/format';

/** Le produit tel que les clients le verront : carte de la boutique, puis fiche. */
export function ProductPreview({ visible, form, store, onClose }: { visible: boolean; form: ProductForm; store: SellerStore; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cover = form.photos[0];
  const cardWidth = Math.floor((width - spacing.screen * 2 - spacing.gridGap) / 2);
  const product: Product = {
    id: `preview-${form.id}`,
    name: form.name.trim() || 'Nom du produit',
    description: form.description,
    price: form.price,
    oldPrice: form.oldPrice && form.oldPrice > form.price ? form.oldPrice : undefined,
    categoryId: form.categoryId,
    storeId: store.slug,
    photoId: '',
    imageUri: cover?.uri,
    aspect: cover ? Math.min(Math.max(cover.height / cover.width, 0.75), 1.45) : 1,
    rating: 0,
    reviewsCount: 0,
    createdRank: 0,
    salesEnabled: false,
    stock: form.stock,
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top + 6 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Aperçu</Text>
          <CircleIconButton size={40} onPress={onClose} accessibilityLabel="Fermer l’aperçu">
            <X size={20} color={colors.text} strokeWidth={2} />
          </CircleIconButton>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30, gap: 22 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 10, paddingHorizontal: spacing.screen }}>
            <Text style={styles.section}>Dans votre boutique</Text>
            {cover ? (
              <View pointerEvents="none">
                <ProductCard product={product} width={cardWidth} />
              </View>
            ) : (
              <Text style={styles.muted}>Ajoutez une photo pour voir la carte du produit.</Text>
            )}
          </View>

          <View style={{ gap: 12 }}>
            <Text style={[styles.section, { paddingHorizontal: spacing.screen }]}>Fiche du produit</Text>
            {cover ? (
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {form.photos.map((p, i) => (
                  <Image key={p.uri + i} source={{ uri: p.uri }} style={{ width, height: Math.round(width * 1.05) }} contentFit="cover" />
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.details}>
              <Text style={styles.name}>{product.name}</Text>
              <ProductPrice price={product.price} oldPrice={product.oldPrice} size="lg" />
              {form.stock === 0 && !form.variants?.length ? <Text style={styles.soldOut}>Épuisé</Text> : null}
              {form.variants?.length ? (
                <View style={{ gap: 6 }}>
                  <Text style={styles.label}>Choix</Text>
                  {form.variants.map((v) => (
                    <View key={v.id} style={styles.variantRow}>
                      <Text style={styles.variantLabel}>{v.label || 'Variante'}</Text>
                      <Text style={styles.variantPrice}>{v.stock > 0 ? formatFCFA(v.price) : 'Épuisé'}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {form.sizes?.length ? <Chips label="Tailles" items={form.sizes} /> : null}
              {form.colors?.length ? <Chips label="Couleurs" items={form.colors} /> : null}
              {form.description ? <Text style={styles.description}>{form.description}</Text> : null}
              <View style={styles.delivery}>
                <Truck size={18} color={colors.cognac} strokeWidth={1.7} />
                <Text style={styles.deliveryText}>{form.deliveryNote?.trim() || 'Livraison à convenir avec le vendeur'}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Chips({ label, items }: { label: string; items: string[] }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {items.map((s) => (
          <View key={s} style={styles.chip}>
            <Text style={styles.chipText}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.screen, paddingBottom: 10 },
  title: { fontFamily: fonts.bold, fontSize: 21, color: colors.text },
  section: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: colors.cognac },
  muted: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  details: { paddingHorizontal: spacing.screen, gap: 14 },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, letterSpacing: -0.3 },
  soldOut: { alignSelf: 'flex-start', fontFamily: fonts.bold, fontSize: 12.5, color: colors.white, backgroundColor: colors.text, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, overflow: 'hidden' },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' },
  chipText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  variantRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  variantLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  variantPrice: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  description: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textBody },
  delivery: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: radii.md, backgroundColor: colors.backgroundAlt },
  deliveryText: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
});
