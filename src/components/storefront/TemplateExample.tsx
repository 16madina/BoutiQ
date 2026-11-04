import { Check, X } from 'lucide-react-native';
import { useMemo, useRef, type ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStorefront, getStorefrontSections } from '@/api/storefront';
import { CircleIconButton } from '@/components/CircleIconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StoreHero } from '@/components/storefront/StoreHero';
import { CatalogPreview, StorefrontBody } from '@/components/storefront/StorefrontBody';
import { TEMPLATE_EXAMPLES } from '@/data/storefronts';
import { TEMPLATE_ORDER, TEMPLATES } from '@/storefront/templates';
import { colors, fonts, radii, spacing } from '@/theme';
import type { StorefrontTemplateId } from '@/types/storefront';
import { haptics } from '@/utils/haptics';

interface Props {
  /** Modèle affiché ; null = fenêtre fermée. */
  templateId: StorefrontTemplateId | null;
  /** Modèle actuellement choisi par le vendeur. */
  selected: StorefrontTemplateId;
  onBrowse: (id: StorefrontTemplateId) => void;
  onChoose: (id: StorefrontTemplateId) => void;
  onClose: () => void;
}

/**
 * Exemple complet d'un modèle : une boutique de démonstration affichée avec ce modèle,
 * telle que les clients la verront. Le vendeur peut passer d'un modèle à l'autre et choisir.
 */
export function TemplateExample({ templateId, selected, onBrowse, onChoose, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const sf = useMemo(() => (templateId ? getStorefront(TEMPLATE_EXAMPLES[templateId]) : undefined), [templateId]);
  const sections = useMemo(() => (sf ? getStorefrontSections(sf) : null), [sf]);
  const template = templateId ? TEMPLATES[templateId] : null;
  const isSelected = templateId === selected;

  return (
    <Modal visible={!!templateId} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top + 6 }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Modèle {template?.shortLabel}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              Exemple avec la boutique {sf?.store.name}
            </Text>
          </View>
          <CircleIconButton size={40} onPress={onClose} accessibilityLabel="Fermer l’exemple">
            <X size={20} strokeWidth={2} color={colors.text} />
          </CircleIconButton>
        </View>

        {/* Passer d'un modèle à l'autre sans fermer */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={styles.chips}>
          {TEMPLATE_ORDER.map((id) => {
            const active = id === templateId;
            return (
              <Pressable
                key={id}
                onPress={() => {
                  haptics.selection();
                  onBrowse(id);
                  scroll.current?.scrollTo({ y: 0, animated: false });
                }}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                {id === selected && <Check size={14} color={active ? colors.white : colors.text} strokeWidth={2.6} />}
                <Text style={[styles.chipText, active && { color: colors.white }]}>{TEMPLATES[id].shortLabel}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.frame}>
          {sf && sections && (
            <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Exemple non cliquable : seul le défilement est actif. */}
              <View pointerEvents="none">
                <StoreHero sf={sf} width={width} topInset={0} onContact={() => {}} onShare={() => {}} />
                <StorefrontBody sf={sf} sections={sections} width={width} preview />
                <CatalogPreview sf={sf} width={width} />
              </View>
            </ScrollView>
          )}
          <View style={styles.exampleTag} pointerEvents="none">
            <Text style={styles.exampleText}>Exemple · défilez pour tout voir</Text>
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Text style={styles.note}>Votre boutique gardera vos produits, vos photos et vos textes.</Text>
          <PrimaryButton
            label={isSelected ? 'Modèle déjà choisi' : `Choisir le modèle ${template?.shortLabel ?? ''}`}
            onPress={() => {
              if (!templateId) return;
              haptics.success();
              onChoose(templateId);
              onClose();
            }}
            disabled={isSelected}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.screen, paddingBottom: 8 },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  chips: { gap: 8, paddingHorizontal: spacing.screen, paddingBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, height: 36, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  chipText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  frame: { flex: 1, overflow: 'hidden', borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  exampleTag: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    paddingHorizontal: 12,
    height: 26,
    borderRadius: radii.pill,
    justifyContent: 'center',
    backgroundColor: 'rgba(23,23,23,0.72)',
  },
  exampleText: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.white },
  footer: { paddingHorizontal: spacing.screen, paddingTop: 10, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.background },
  note: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, textAlign: 'center' },
});
