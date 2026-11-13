import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ArrowDown, ArrowUp, Check, ChevronLeft, Eye, Package, RotateCcw, Star } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { syncStoreExtras } from '@/api/sellerSync';
import { buildOwnStorefront, getStorefrontSections, resolveOwnSettings } from '@/api/storefront';
import { supabase } from '@/lib/supabase';
import { CircleIconButton } from '@/components/CircleIconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { CollectionsEditor } from '@/components/seller/CollectionsEditor';
import { FormField } from '@/components/seller/FormField';
import { LogoPicker, PhotosPicker } from '@/components/seller/ImagePickers';
import { SheetAction, StoreSheet } from '@/components/storefront/StoreSheet';
import { StoreHero } from '@/components/storefront/StoreHero';
import { CatalogPreview, StorefrontBody } from '@/components/storefront/StorefrontBody';
import { TemplatePicker } from '@/components/storefront/TemplatePicker';
import { uid } from '@/store/persist';
import { useSeller } from '@/store/useSeller';
import { TEMPLATES, templateForCategory } from '@/storefront/templates';
import { colors, fonts, radii, shadows, spacing } from '@/theme';
import type { SellerStore } from '@/types/seller';
import type { StorefrontSettings } from '@/types/storefront';
import { formatFCFA } from '@/utils/format';
import { haptics } from '@/utils/haptics';

type Tab = 'modele' | 'couleur' | 'identite' | 'collections' | 'vedettes';
const TABS: { id: Tab; label: string }[] = [
  { id: 'modele', label: 'Modèle' },
  { id: 'couleur', label: 'Couleur' },
  { id: 'identite', label: 'Textes et photos' },
  { id: 'collections', label: 'Collections' },
  { id: 'vedettes', label: 'Vedettes' },
];
const MAX_FEATURED = 6;

/**
 * « Personnaliser ma boutique » : aperçu en direct de la vraie vitrine + réglages essentiels.
 * Les modifications restent un brouillon jusqu'à « Enregistrer ».
 */
export default function CustomizeStore() {
  const store = useSeller((s) => s.store);
  if (!store) return <Redirect href="/open-store" />;
  return <Editor saved={store} />;
}

function Editor({ saved }: { saved: SellerStore }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const details = useSeller((s) => s.details);
  const products = useSeller((s) => s.products);
  const updateStore = useSeller((s) => s.updateStore);

  const [draft, setDraft] = useState<SellerStore>(saved);
  // « Ma boutique » ouvre directement la bonne rubrique (ex. /customize?tab=identite).
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === params.tab) ? (params.tab as Tab) : 'modele');
  const [leaving, setLeaving] = useState(false);

  const settings = resolveOwnSettings(draft, details);
  const template = TEMPLATES[settings.template];
  const recommended = templateForCategory(draft.categoryId);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const setStorefront = (patch: Partial<StorefrontSettings>) =>
    setDraft((d) => ({ ...d, storefront: { ...resolveOwnSettings(d, details), contactPhone: undefined, ...d.storefront, ...patch } }));

  const chooseTemplate = (id: StorefrontSettings['template']) => {
    // La couleur suit le modèle, sauf si le vendeur en a choisi une autre.
    const keepAccent = settings.accentColor !== TEMPLATES[settings.template].defaultAccent;
    setStorefront({ template: id, accentColor: keepAccent ? settings.accentColor : TEMPLATES[id].defaultAccent });
  };

  const resetTemplate = () => {
    haptics.medium();
    setStorefront({ template: recommended, accentColor: TEMPLATES[recommended].defaultAccent });
  };

  const save = () => {
    haptics.success();
    updateStore({
      name: draft.name.trim() || saved.name,
      description: draft.description,
      logo: draft.logo,
      banner: draft.banner,
      banners: draft.banners,
      collections: draft.collections,
      storefront: draft.storefront,
    });
    // Boutique déjà en ligne : réglages, collections et photos mis à jour dans Supabase.
    const remoteId = useSeller.getState().store?.remoteId;
    if (remoteId) {
      syncStoreExtras(remoteId).catch(() => {});
      supabase?.from('stores').update({ name: draft.name.trim() || saved.name, description: draft.description.slice(0, 280) }).eq('id', remoteId).then(() => {});
    }
  };

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/seller'));

  // Aperçu : la vraie vitrine, calculée à partir du brouillon.
  const previewWidth = width - spacing.screen * 2;
  const sf = useMemo(() => buildOwnStorefront(draft, details, products), [draft, details, products]);
  const sections = useMemo(() => getStorefrontSections(sf), [sf]);
  const previewHeight = Math.round(Math.min(Math.max(height * 0.44, 280), 460));

  const published = products.filter((p) => p.status === 'published' && p.photos.length > 0);
  const featured = settings.featuredProductIds;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <CircleIconButton size={40} onPress={() => (dirty ? setLeaving(true) : leave())} accessibilityLabel="Retour">
          <ChevronLeft size={22} strokeWidth={1.8} color={colors.text} />
        </CircleIconButton>
        <Text style={styles.title} numberOfLines={1}>
          Personnaliser ma boutique
        </Text>
        <CircleIconButton size={40} onPress={() => router.push({ pathname: '/store/[id]', params: { id: saved.slug } })} accessibilityLabel="Voir ma vitrine publique">
          <Eye size={19} strokeWidth={1.8} color={colors.text} />
        </CircleIconButton>
      </View>

      {/* Aperçu en direct */}
      <View style={[styles.preview, { height: previewHeight }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <View pointerEvents="none">
            <StoreHero sf={sf} width={previewWidth} topInset={0} onContact={() => {}} onShare={() => {}} />
            <StorefrontBody sf={sf} sections={sections} width={previewWidth} preview />
            <CatalogPreview sf={sf} width={previewWidth} />
          </View>
        </ScrollView>
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Aperçu en direct</Text>
        </View>
      </View>

      {/* Onglets */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={{ flexGrow: 0, flexShrink: 0 }}>
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              onPress={() => {
                haptics.selection();
                setTab(t.id);
              }}
              style={[styles.tab, active && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabText, active && { color: colors.white }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={[styles.panel, { paddingBottom: 110 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View key={tab} entering={FadeIn.duration(200)} style={{ gap: spacing.lg }}>
          {tab === 'modele' && (
            <>
              <Text style={styles.hint}>{template.hint}</Text>
              <View style={{ marginHorizontal: -spacing.screen }}>
                <TemplatePicker value={settings.template} onChange={chooseTemplate} recommended={recommended} accent={settings.accentColor} />
              </View>
              <Text style={styles.note}>Changer de modèle ne modifie ni vos produits, ni vos commandes.</Text>
            </>
          )}

          {tab === 'couleur' && (
            <>
              <Text style={styles.hint}>La couleur principale colore les boutons, les titres et les étiquettes de votre vitrine.</Text>
              <View style={styles.swatches}>
                {[...new Set([template.defaultAccent, ...template.suggestedAccents])].map((hex) => {
                  const active = hex.toUpperCase() === settings.accentColor.toUpperCase();
                  return (
                    <Pressable
                      key={hex}
                      onPress={() => {
                        haptics.selection();
                        setStorefront({ accentColor: hex });
                      }}
                      style={[styles.swatchRing, active && { borderColor: hex }]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Couleur ${hex}${hex === template.defaultAccent ? ', couleur du modèle' : ''}`}
                    >
                      <View style={[styles.swatch, { backgroundColor: hex }]}>{active && <Check size={18} color={colors.white} strokeWidth={3} />}</View>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.note}>Le premier rond est la couleur d’origine du modèle {template.shortLabel}.</Text>
            </>
          )}

          {tab === 'identite' && (
            <>
              <View style={{ gap: 12 }}>
                <Text style={styles.label}>Photos de la bannière</Text>
                <Text style={[styles.note, { marginTop: -6 }]}>Jusqu’à 5 photos : elles défilent en haut de votre vitrine. La première est la photo principale.</Text>
                <PhotosPicker
                  max={5}
                  value={draft.banners?.length ? draft.banners : draft.banner ? [draft.banner] : []}
                  onChange={(banners) => setDraft((d) => ({ ...d, banners, banner: banners[0] }))}
                />
                <Text style={[styles.label, { marginTop: 6 }]}>Logo</Text>
                <LogoPicker value={draft.logo} onChange={(logo) => setDraft((d) => ({ ...d, logo }))} size={84} />
              </View>
              <FormField label="Nom de la boutique" value={draft.name} onChangeText={(name) => setDraft((d) => ({ ...d, name }))} maxLength={40} />
              <FormField
                label="Description"
                value={draft.description}
                onChangeText={(t) => setDraft((d) => ({ ...d, description: t.slice(0, 280) }))}
                placeholder="Ce qui rend votre boutique unique, en une ou deux phrases."
                multiline
              />
              <FormField
                label="Phrase d’accroche"
                optional
                value={settings.tagline ?? ''}
                onChangeText={(t) => setStorefront({ tagline: t.slice(0, 60) })}
                placeholder="Ex. Le wax, à la manière de Dakar"
                hint="Affichée sous le nom, sur la bannière."
              />
              <FormField
                label="Message promotionnel"
                optional
                value={settings.promoMessage ?? ''}
                onChangeText={(t) => setStorefront({ promoMessage: t.slice(0, 80) })}
                placeholder={`Ex. ${template.promoExample}`}
                hint="Mis en avant en haut de votre vitrine. Laissez vide pour ne rien afficher."
              />
            </>
          )}

          {tab === 'collections' && (
            <>
              <Text style={styles.hint}>Rangez vos produits par rayon. Une collection sans produit reste cachée aux clients.</Text>
              <CollectionsEditor
                categoryId={draft.categoryId}
                suggestions={template.suggestedCollections}
                value={draft.collections.map((c) => c.name)}
                onChange={(names) =>
                  setDraft((d) => ({
                    ...d,
                    collections: names.map((name) => d.collections.find((c) => c.name === name) ?? { id: uid('col'), name }),
                  }))
                }
              />
              {draft.collections.length > 1 && (
                <View style={styles.list}>
                  <Text style={styles.label}>Ordre d’affichage</Text>
                  {draft.collections.map((c, i) => {
                    const count = products.filter((p) => p.collectionId === c.id && p.status === 'published').length;
                    const move = (dir: -1 | 1) => {
                      haptics.selection();
                      setDraft((d) => {
                        const next = [...d.collections];
                        [next[i], next[i + dir]] = [next[i + dir], next[i]];
                        return { ...d, collections: next };
                      });
                    };
                    return (
                      <View key={c.id} style={styles.listRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle}>{c.name}</Text>
                          <Text style={styles.rowSub}>{count ? `${count} produit${count > 1 ? 's' : ''}` : 'Vide · cachée aux clients'}</Text>
                        </View>
                        <OrderButton disabled={i === 0} onPress={() => move(-1)} label={`Monter ${c.name}`} icon={<ArrowUp size={17} color={colors.text} strokeWidth={2} />} />
                        <OrderButton
                          disabled={i === draft.collections.length - 1}
                          onPress={() => move(1)}
                          label={`Descendre ${c.name}`}
                          icon={<ArrowDown size={17} color={colors.text} strokeWidth={2} />}
                        />
                      </View>
                    );
                  })}
                </View>
              )}
              <Text style={styles.note}>Pour ranger un produit, ouvrez sa fiche et choisissez sa collection.</Text>
            </>
          )}

          {tab === 'vedettes' &&
            (published.length === 0 ? (
              <View style={styles.emptyBox}>
                <Package size={26} color={colors.cognac} strokeWidth={1.6} />
                <Text style={styles.rowTitle}>Aucun produit en ligne</Text>
                <Text style={[styles.hint, { textAlign: 'center' }]}>Publiez un produit pour pouvoir le mettre en avant sur votre vitrine.</Text>
                <PrimaryButton label="Ajouter un produit" onPress={() => router.push('/product-editor')} style={{ alignSelf: 'stretch', marginTop: 6 }} />
              </View>
            ) : (
              <>
                <Text style={styles.hint}>
                  Choisissez jusqu’à {MAX_FEATURED} produits à mettre en avant, dans l’ordre de vos touches. ({featured.length}/{MAX_FEATURED})
                </Text>
                <View style={styles.list}>
                  {published.map((p) => {
                    const pos = featured.indexOf(p.id);
                    const on = pos >= 0;
                    const full = !on && featured.length >= MAX_FEATURED;
                    return (
                      <Pressable
                        key={p.id}
                        disabled={full}
                        onPress={() => {
                          haptics.selection();
                          setStorefront({ featuredProductIds: on ? featured.filter((id) => id !== p.id) : [...featured, p.id] });
                        }}
                        style={({ pressed }) => [styles.listRow, (pressed || full) && { opacity: 0.55 }]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on, disabled: full }}
                      >
                        <Image source={{ uri: p.photos[0]?.uri }} style={styles.thumb} contentFit="cover" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle} numberOfLines={1}>
                            {p.name}
                          </Text>
                          <Text style={styles.rowSub}>{formatFCFA(p.price)}</Text>
                        </View>
                        <View style={[styles.star, on && { backgroundColor: sf.palette.accent, borderColor: sf.palette.accent }]}>
                          {on ? (
                            <Text style={[styles.starNum, { color: sf.palette.onAccent }]}>{pos + 1}</Text>
                          ) : (
                            <Star size={16} color={colors.textSecondary} strokeWidth={1.8} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ))}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable onPress={resetTemplate} style={styles.reset} accessibilityRole="button" accessibilityLabel={`Revenir au modèle initial : ${TEMPLATES[recommended].shortLabel}`}>
          <RotateCcw size={16} color={colors.text} strokeWidth={1.9} />
          <Text style={styles.resetText} numberOfLines={2}>
            Modèle initial
          </Text>
        </Pressable>
        <PrimaryButton label={dirty ? 'Enregistrer' : 'Enregistré'} onPress={save} disabled={!dirty} style={{ flex: 1 }} />
      </View>

      <StoreSheet visible={leaving} title="Enregistrer vos modifications ?" subtitle="Sinon, votre vitrine reste comme avant." onClose={() => setLeaving(false)}>
        <SheetAction
          icon={<Check size={20} color={colors.cognac} strokeWidth={2} />}
          label="Enregistrer et quitter"
          onPress={() => {
            save();
            setLeaving(false);
            leave();
          }}
        />
        <SheetAction
          icon={<RotateCcw size={18} color={colors.white} strokeWidth={2} />}
          label="Quitter sans enregistrer"
          tint={colors.promo}
          onPress={() => {
            setLeaving(false);
            leave();
          }}
        />
      </StoreSheet>
    </KeyboardAvoidingView>
  );
}

function OrderButton({ icon, onPress, disabled, label }: { icon: ReactNode; onPress: () => void; disabled: boolean; label: string }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.order, disabled && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.screen, paddingBottom: 10 },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 18, color: colors.text, textAlign: 'center' },
  preview: {
    marginHorizontal: spacing.screen,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  liveTag: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(23,23,23,0.72)',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#6DD58C' },
  liveText: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.white },
  tabs: { gap: 8, paddingHorizontal: spacing.screen, paddingTop: 14, paddingBottom: 4 },
  tab: { paddingHorizontal: 15, height: 38, borderRadius: radii.pill, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  tabText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  panel: { paddingHorizontal: spacing.screen, paddingTop: 16 },
  hint: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  note: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: colors.textMuted },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatchRing: { padding: 3, borderRadius: 30, borderWidth: 2, borderColor: 'transparent' },
  swatch: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 2, padding: 6, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  rowSub: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, marginTop: 1 },
  order: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundAlt },
  thumb: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.backgroundAlt },
  star: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  starNum: { fontFamily: fonts.bold, fontSize: 14 },
  emptyBox: { alignItems: 'center', gap: 8, padding: 22, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.screen,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  reset: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 52, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  resetText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
});
