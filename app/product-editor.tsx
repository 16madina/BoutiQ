import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlignLeft,
  Boxes,
  CircleCheck,
  ChevronDown,
  Eye,
  Layers,
  LayoutList,
  Package,
  Palette,
  Percent,
  RotateCcw,
  Ruler,
  Sparkles,
  Store as StoreIcon,
  Trash2,
  TriangleAlert,
  Truck,
  WifiOff,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCategory } from '@/api/catalog';
import { assistantEnabled, suggestFromPhoto, type ProductSuggestion } from '@/api/productAssistant';
import { deleteProductEverywhere, syncProduct } from '@/api/sellerSync';
import { CircleIconButton } from '@/components/CircleIconButton';
import { DiscountBadge } from '@/components/DiscountBadge';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ColorsField, SizesField, StockStepper, VariantsField } from '@/components/seller/ProductDetailsFields';
import { FormField, SelectField } from '@/components/seller/FormField';
import { ProductPhotosEditor } from '@/components/seller/ProductPhotosEditor';
import { ProductPreview } from '@/components/seller/ProductPreview';
import { SheetAction, StoreSheet } from '@/components/storefront/StoreSheet';
import { CATEGORIES } from '@/data/demo';
import { usePicker, usePickerResult } from '@/store/usePicker';
import { useSeller } from '@/store/useSeller';
import { colors, fonts, radii, shadows, spacing } from '@/theme';
import type { CategoryId } from '@/types';
import type { ProductForm, ProductStatus, SellerStore } from '@/types/seller';
import { discountPercent, formatFCFA } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { currencyLabel, groupDigits, missingSummary, suggestCategory, toNumber, validateProduct } from '@/utils/productForm';
import { categoryIcon } from '@/utils/storeDefaults';

const emptyForm = (store: SellerStore): ProductForm => ({
  id: randomUUID(),
  name: '',
  description: '',
  price: 0,
  categoryId: store.categoryId,
  photos: [],
  stock: 1,
  status: 'draft',
  sizes: [],
  colors: [],
  variants: [],
});

/** Rabais proposés d'un toucher. */
const DISCOUNTS = [5, 10, 15, 20, 25, 30, 40, 50];

/** Prix après rabais, arrondi à 5 près (pas de petite monnaie). */
function discounted(base: number, pct: number): number {
  const raw = (base * (100 - pct)) / 100;
  return base >= 100 ? Math.round(raw / 5) * 5 : Math.round(raw);
}

/** Rubriques de la fiche qui s'ouvrent et se referment. */
type SectionId = 'discount' | 'stock' | 'sizes' | 'colors' | 'variants' | 'description' | 'collection' | 'delivery';

const hasContent = (f: ProductForm) => f.photos.length > 0 || f.name.trim().length > 0 || f.price > 0;

type Result = { kind: 'published' | 'saved' } | { kind: 'local'; message: string; status: ProductStatus; justPublished: boolean };

/** « Ajouter un produit » / « Modifier le produit » : simple d'abord, détails ensuite. */
export default function ProductEditorScreen() {
  const store = useSeller((s) => s.store);
  if (!store) return null;
  return <ProductEditor store={store} />;
}

function ProductEditor({ store }: { store: SellerStore }) {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const existing = useSeller((s) => (id ? s.products.find((p) => p.id === id) : undefined));
  const saveProduct = useSeller((s) => s.saveProduct);
  const setProductDraft = useSeller((s) => s.setProductDraft);
  const openPicker = usePicker((s) => s.open);
  const isNew = !existing;

  // Brouillon repris si l'app a été fermée pendant la saisie.
  const [form, setForm] = useState<ProductForm>(() => {
    if (existing) {
      const { storeId: _s, createdAt: _c, sync: _y, ...rest } = existing;
      return { sizes: [], colors: [], variants: [], ...rest };
    }
    return useSeller.getState().productDraft ?? emptyForm(store);
  });
  const [resumed, setResumed] = useState(() => isNew && !!useSeller.getState().productDraft && hasContent(useSeller.getState().productDraft!));
  const [categoryTouched, setCategoryTouched] = useState(!isNew || form.categoryId !== store.categoryId);
  // Rubriques ouvertes (rabais, quantité, tailles, couleurs…) et rabais choisi en %.
  const [open, setOpen] = useState<Partial<Record<SectionId, boolean>>>({});
  const [pct, setPct] = useState(() => discountPercent(form.price, form.oldPrice || undefined) ?? 0);
  const [customPct, setCustomPct] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [result, setResult] = useState<Result | null>(null);
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assistInfo, setAssistInfo] = useState(false);
  const [assist, setAssist] = useState<{ loading: boolean; suggestion?: ProductSuggestion; error?: string } | null>(null);

  const set = (patch: Partial<ProductForm>) => setForm((f) => ({ ...f, ...patch }));
  const currency = currencyLabel(store.country);
  const errors = useMemo(() => validateProduct(form), [form]);
  const valid = Object.keys(errors).length === 0;
  const err = (k: keyof typeof errors) => (showErrors ? errors[k] : null);
  // Prix normal (avant rabais) : c'est lui que le vendeur saisit ; le prix réduit est calculé.
  const basePrice = pct > 0 && form.oldPrice && form.oldPrice > form.price ? form.oldPrice : form.price;
  const toggle = (id: SectionId) => {
    haptics.selection();
    setOpen((o) => ({ ...o, [id]: !o[id] }));
  };
  const applyDiscount = (next: number, base = basePrice) => {
    const value = Math.min(Math.max(Math.round(next), 0), 90);
    const reduced = value > 0 && base > 0 ? discounted(base, value) : base;
    if (value === 0 || reduced <= 0 || reduced >= base) {
      setPct(value > 0 && base === 0 ? value : 0);
      set({ price: base, oldPrice: undefined });
      return;
    }
    setPct(value);
    set({ price: reduced, oldPrice: base });
  };
  const collectionName = store.collections.find((c) => c.id === form.collectionId)?.name;
  const hasVariants = (form.variants?.length ?? 0) > 0;
  const variantStock = form.variants?.reduce((n, v) => n + v.stock, 0) ?? 0;

  usePickerResult('collection', (v) => set({ collectionId: store.collections.find((c) => c.name === v)?.id }));

  // Catégorie proposée d'après le nom, tant que le vendeur n'en a pas choisi une.
  useEffect(() => {
    if (categoryTouched) return;
    const suggested = suggestCategory(form.name, store.categoryId);
    if (suggested !== form.categoryId) setForm((f) => ({ ...f, categoryId: suggested }));
  }, [form.name, form.categoryId, categoryTouched, store.categoryId]);

  // Sauvegarde automatique du brouillon (nouveau produit uniquement).
  useEffect(() => {
    if (!isNew || result) return;
    const t = setTimeout(() => setProductDraft(hasContent(form) ? form : null), 400);
    return () => clearTimeout(t);
  }, [form, isNew, result, setProductDraft]);

  const submit = async (status: ProductStatus) => {
    if (busyRef.current) return; // pas de double publication
    if (status === 'published' && !valid) {
      setShowErrors(true);
      haptics.medium();
      return;
    }
    if (status !== 'published' && !hasContent(form)) {
      setProductDraft(null);
      router.back();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    const stock = hasVariants ? variantStock : form.stock;
    // 1. Toujours gardé sur l'appareil (même identifiant : une nouvelle tentative met à jour le même produit).
    saveProduct({ ...form, name: form.name.trim(), stock, oldPrice: form.oldPrice && form.oldPrice > form.price ? form.oldPrice : undefined, status });
    if (isNew) setProductDraft(null);
    // 2. Enregistrement en ligne.
    // « En ligne ! » seulement quand le produit vient d'être mis en vente.
    const justPublished = status === 'published' && existing?.status !== 'published';
    try {
      await syncProduct(form.id);
      haptics.success();
      setResult({ kind: justPublished ? 'published' : 'saved' });
    } catch (e) {
      haptics.medium();
      setResult({ kind: 'local', status, message: (e as Error).message, justPublished });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const retry = async () => {
    if (busyRef.current || result?.kind !== 'local') return;
    busyRef.current = true;
    setBusy(true);
    try {
      await syncProduct(form.id);
      haptics.success();
      setResult({ kind: result.justPublished ? 'published' : 'saved' });
    } catch (e) {
      setResult({ ...result, message: (e as Error).message });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const runAssistant = async () => {
    if (!assistantEnabled) {
      setAssistInfo(true);
      return;
    }
    setAssist({ loading: true });
    try {
      setAssist({ loading: false, suggestion: await suggestFromPhoto(form.photos[0]) });
    } catch {
      setAssist({ loading: false, error: 'L’assistant ne répond pas. Remplissez les champs vous-même, c’est rapide.' });
    }
  };

  const status = existing?.status;
  const primaryLabel = busy ? 'Publication…' : isNew || status === 'draft' ? 'Publier mon produit' : status === 'hidden' ? 'Enregistrer (reste masqué)' : 'Enregistrer les modifications';
  const primaryStatus: ProductStatus = isNew || status === 'draft' ? 'published' : (status ?? 'published');

  if (result) {
    return (
      <ResultView
        result={result}
        busy={busy}
        store={store}
        onRetry={retry}
        onAnother={() => {
          setForm(emptyForm(store));
          setCategoryTouched(false);
          setShowErrors(false);
          setOpen({});
          setPct(0);
          setCustomPct('');
          setAssist(null);
          setResult(null);
          if (id) router.setParams({ id: undefined });
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <CircleIconButton size={40} onPress={() => router.back()} accessibilityLabel="Fermer">
          <Text style={styles.close}>✕</Text>
        </CircleIconButton>
        <Text style={styles.title} numberOfLines={1}>
          {isNew ? 'Ajouter un produit' : 'Modifier le produit'}
        </Text>
        <CircleIconButton size={40} onPress={() => setPreview(true)} accessibilityLabel="Aperçu du produit">
          <Eye size={19} color={colors.text} strokeWidth={1.8} />
        </CircleIconButton>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 170 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {resumed && (
          <Animated.View entering={FadeIn} style={styles.resumed}>
            <RotateCcw size={16} color={colors.cognac} strokeWidth={2} />
            <Text style={styles.resumedText}>Nous avons gardé votre saisie.</Text>
            <Text
              style={styles.link}
              onPress={() => {
                setForm(emptyForm(store));
                setCategoryTouched(false);
                setResumed(false);
                setProductDraft(null);
              }}
              accessibilityRole="button"
            >
              Recommencer
            </Text>
          </Animated.View>
        )}

        {/* 1. Photos */}
        <Step n={1} title="Photos" required>
          <ProductPhotosEditor value={form.photos} onChange={(photos) => set({ photos })} error={err('photos')} />
          {form.photos.length > 0 && (
            <Pressable onPress={runAssistant} style={styles.assist} accessibilityRole="button">
              <Sparkles size={18} color={colors.caramel} strokeWidth={1.9} />
              <View style={{ flex: 1 }}>
                <Text style={styles.assistTitle}>Remplir avec l’IA</Text>
                <Text style={styles.assistSub}>Propose un nom, une catégorie et une description. Vous gardez la main.</Text>
              </View>
              {assist?.loading ? <ActivityIndicator color={colors.caramel} /> : !assistantEnabled ? <Text style={styles.soon}>Bientôt</Text> : null}
            </Pressable>
          )}
          {assist?.error ? <Text style={styles.error}>{assist.error}</Text> : null}
          {assist?.suggestion && (
            <Suggestions
              suggestion={assist.suggestion}
              onUse={(patch) => {
                if (patch.categoryId) setCategoryTouched(true);
                // Un prix proposé est un prix normal : le rabais choisi s'y applique.
                if (patch.price != null && pct > 0) {
                  const { price, ...rest } = patch;
                  set(rest);
                  applyDiscount(pct, price);
                } else set(patch);
              }}
              onClose={() => setAssist(null)}
            />
          )}
        </Step>

        {/* 2. Nom et prix */}
        <Step n={2} title="Nom et prix" required>
          <FormField label="Nom du produit" required value={form.name} onChangeText={(name) => set({ name })} placeholder="Ex. Robe wax longue" maxLength={60} error={err('name')} />
          <FormField
            label={pct > 0 ? 'Prix normal (avant rabais)' : 'Prix'}
            required
            value={groupDigits(basePrice)}
            onChangeText={(t) => applyDiscount(pct, toNumber(t))}
            keyboardType="number-pad"
            placeholder="0"
            suffix={<Text style={styles.currency}>{currency}</Text>}
            error={err('price')}
            hint={
              pct > 0 && form.oldPrice
                ? `Avec le rabais de ${pct} %, vos clients paient ${groupDigits(form.price)} ${currency}.`
                : hasVariants
                  ? 'Prix affiché par défaut ; chaque variante peut avoir le sien.'
                  : undefined
            }
          />
        </Step>

        {/* 3. Catégorie */}
        <Step n={3} title="Catégorie">
          <Text style={styles.hint}>{categoryTouched ? 'Touchez pour changer.' : 'Proposée d’après le nom de votre produit. Touchez pour changer.'}</Text>
          <View style={styles.categories}>
            {CATEGORIES.map((c) => {
              const active = c.id === form.categoryId;
              const Icon = categoryIcon(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    haptics.selection();
                    setCategoryTouched(true);
                    set({ categoryId: c.id as CategoryId });
                  }}
                  style={[styles.category, active && styles.categoryActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Icon size={18} color={active ? colors.white : colors.cognac} strokeWidth={1.8} />
                  <Text style={[styles.categoryText, active && { color: colors.white }]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </Step>

        {/* Détails : chaque rubrique s'ouvre d'un toucher */}
        <View style={styles.more}>
          <View style={styles.moreHeader}>
            <Text style={styles.moreTitle}>Détails du produit</Text>
            <Text style={styles.hint}>Facultatif. Touchez une ligne pour l’ouvrir.</Text>
          </View>

          <Fold
            icon={Percent}
            title="Rabais"
            value={pct > 0 && form.oldPrice ? `−${pct} % · ${groupDigits(form.price)} ${currency}` : 'Aucun'}
            highlight={pct > 0 && !!form.oldPrice}
            open={!!open.discount}
            onToggle={() => toggle('discount')}
          >
            <Text style={styles.hint}>Choisissez un pourcentage : le nouveau prix est calculé tout seul.</Text>
            <View style={styles.categories}>
              <Pill label="Aucun" active={pct === 0} onPress={() => applyDiscount(0)} />
              {DISCOUNTS.map((n) => (
                <Pill key={n} label={`${n} %`} active={pct === n} onPress={() => applyDiscount(n)} />
              ))}
            </View>
            <FormField
              label="Autre pourcentage"
              optional
              value={customPct}
              onChangeText={(t) => {
                const digits = t.replace(/\D/g, '').slice(0, 2);
                setCustomPct(digits);
                if (digits) applyDiscount(Number(digits));
              }}
              keyboardType="number-pad"
              placeholder="Ex. 35"
              suffix={<Text style={styles.currency}>%</Text>}
            />
            {basePrice <= 0 ? (
              <Text style={styles.hint}>Indiquez d’abord le prix du produit, plus haut.</Text>
            ) : pct > 0 && form.oldPrice ? (
              <View style={styles.discountBox}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.discountOld}>{formatFCFA(form.oldPrice).replace('FCFA', currency)}</Text>
                  <Text style={styles.discountNew}>{formatFCFA(form.price).replace('FCFA', currency)}</Text>
                  <Text style={styles.hint}>Votre client économise {groupDigits(form.oldPrice - form.price)} {currency}.</Text>
                </View>
                <DiscountBadge percent={pct} size="md" />
              </View>
            ) : null}
            {hasVariants && pct > 0 ? <Text style={styles.hint}>Le rabais s’applique au prix principal. Les variantes gardent leur propre prix.</Text> : null}
          </Fold>

          <Fold
            icon={Boxes}
            title="Quantité disponible"
            value={(hasVariants ? variantStock : form.stock) === 0 ? 'Épuisé' : `${hasVariants ? variantStock : form.stock} en stock`}
            open={!!open.stock}
            onToggle={() => toggle('stock')}
          >
            {hasVariants ? <Text style={styles.hint}>Calculée à partir des variantes : {variantStock}</Text> : form.stock === 0 ? <Text style={styles.hint}>Le produit sera affiché « Épuisé ».</Text> : null}
            <View style={styles.stockRow}>
              <StockStepper value={hasVariants ? variantStock : form.stock} onChange={(stock) => set({ stock })} disabled={hasVariants} />
              {!hasVariants && (
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    set({ stock: form.stock === 0 ? 1 : 0 });
                  }}
                  style={[styles.soldOutBtn, form.stock === 0 && styles.soldOutOn]}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: form.stock === 0 }}
                >
                  <Text style={[styles.soldOutText, form.stock === 0 && { color: colors.white }]}>Épuisé</Text>
                </Pressable>
              )}
            </View>
          </Fold>

          <Fold icon={Ruler} title="Tailles" value={form.sizes?.length ? form.sizes.join(', ') : 'Aucune'} highlight={!!form.sizes?.length} open={!!open.sizes} onToggle={() => toggle('sizes')}>
            <Text style={styles.hint}>Touchez les tailles disponibles. Vos clients choisiront la leur.</Text>
            <SizesField value={form.sizes ?? []} onChange={(sizes) => set({ sizes })} />
          </Fold>

          <Fold icon={Palette} title="Couleurs" value={form.colors?.length ? form.colors.join(', ') : 'Aucune'} highlight={!!form.colors?.length} open={!!open.colors} onToggle={() => toggle('colors')}>
            <Text style={styles.hint}>Touchez les couleurs disponibles.</Text>
            <ColorsField value={form.colors ?? []} onChange={(colors) => set({ colors })} />
          </Fold>

          <Fold
            icon={Layers}
            title="Variantes et prix"
            value={hasVariants ? `${form.variants!.length} variante${form.variants!.length > 1 ? 's' : ''}` : 'Aucune'}
            highlight={hasVariants}
            open={!!open.variants || (showErrors && !!errors.variants)}
            onToggle={() => toggle('variants')}
          >
            <Text style={styles.hint}>Si le prix ou le stock change selon la taille, la couleur ou le format.</Text>
            <VariantsField
              value={form.variants ?? []}
              onChange={(variants) => set({ variants })}
              basePrice={form.price}
              sizes={form.sizes ?? []}
              colorsList={form.colors ?? []}
              currency={currency}
              error={err('variants')}
            />
          </Fold>

          <Fold
            icon={AlignLeft}
            title="Description"
            value={form.description.trim() ? form.description.trim() : 'Aucune'}
            highlight={!!form.description.trim()}
            open={!!open.description}
            onToggle={() => toggle('description')}
          >
            <FormField
              label="Description"
              optional
              value={form.description}
              onChangeText={(t) => set({ description: t.slice(0, 600) })}
              placeholder="Matière, dimensions, conseils d’utilisation…"
              multiline
            />
          </Fold>

          {store.collections.length > 0 && (
            <Fold icon={LayoutList} title="Collection" value={collectionName ?? 'Aucune'} highlight={!!collectionName} open={!!open.collection} onToggle={() => toggle('collection')}>
              <SelectField
                label="Collection"
                optional
                value={collectionName}
                placeholder="Aucune"
                onPress={() => openPicker('collection', collectionName, store.collections.map((c) => c.name))}
              />
            </Fold>
          )}

          <Fold
            icon={Truck}
            title="Livraison de ce produit"
            value={form.deliveryNote?.trim() ? form.deliveryNote.trim() : 'Comme le reste de la boutique'}
            highlight={!!form.deliveryNote?.trim()}
            open={!!open.delivery}
            onToggle={() => toggle('delivery')}
            last
          >
            <FormField
              label="Livraison de ce produit"
              optional
              value={form.deliveryNote ?? ''}
              onChangeText={(t) => set({ deliveryNote: t.slice(0, 160) })}
              placeholder="Ex. Livré sous 48 h à Abidjan, 2 000 FCFA"
              hint="Seulement si elle diffère de la livraison habituelle de votre boutique."
            />
          </Fold>
        </View>

        {!isNew && <DeleteRow onPress={() => setConfirmDelete(true)} />}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {showErrors && !valid ? (
          <View style={styles.missing}>
            <TriangleAlert size={16} color={colors.promo} strokeWidth={2} />
            <Text style={styles.missingText}>Il manque : {missingSummary(errors)}</Text>
          </View>
        ) : store.status !== 'verified' && primaryStatus === 'published' ? (
          <Text style={styles.footNote}>Visible dans votre boutique. Les ventes s’activeront après la vérification.</Text>
        ) : null}
        <PrimaryButton label={primaryLabel} onPress={() => submit(primaryStatus)} disabled={busy} variant="caramel" style={styles.primary} />
        {(isNew || status === 'draft') && (
          <Text style={[styles.secondary, busy && { opacity: 0.4 }]} onPress={busy ? undefined : () => submit('draft')} accessibilityRole="button">
            Enregistrer en brouillon
          </Text>
        )}
        {status === 'hidden' && (
          <Text style={[styles.secondary, busy && { opacity: 0.4 }]} onPress={busy ? undefined : () => submit('published')} accessibilityRole="button">
            Remettre en vente
          </Text>
        )}
      </View>

      <ProductPreview visible={preview} form={form} store={store} onClose={() => setPreview(false)} />

      <StoreSheet
        visible={assistInfo}
        title="Remplir avec l’IA"
        subtitle="Bientôt disponible. À partir de votre photo, BoutiQ proposera un nom, une catégorie et une description. Vous pourrez tout modifier ou refuser. Le prix, la marque et la composition ne sont jamais inventés."
        onClose={() => setAssistInfo(false)}
      >
        <SheetAction icon={<CircleCheck size={20} color={colors.cognac} strokeWidth={1.9} />} label="J’ai compris" onPress={() => setAssistInfo(false)} />
      </StoreSheet>

      <StoreSheet visible={confirmDelete} title="Supprimer ce produit ?" subtitle="Il sera retiré de votre boutique et de BoutiQ. Cette action est définitive." onClose={() => setConfirmDelete(false)}>
        <SheetAction
          icon={<Trash2 size={18} color={colors.white} strokeWidth={2} />}
          tint={colors.promo}
          label="Supprimer définitivement"
          onPress={async () => {
            setConfirmDelete(false);
            try {
              await deleteProductEverywhere(form.id);
              router.back();
            } catch (e) {
              setResult({ kind: 'local', status: form.status, message: (e as Error).message, justPublished: false });
            }
          }}
        />
        <SheetAction icon={<RotateCcw size={18} color={colors.cognac} strokeWidth={1.9} />} label="Annuler" onPress={() => setConfirmDelete(false)} />
      </StoreSheet>
    </KeyboardAvoidingView>
  );
}

/* --------------------------------------------------------------- Morceaux */

function Step({ n, title, required, children }: { n: number; title: string; required?: boolean; children: ReactNode }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepHead}>
        <View style={styles.stepNum}>
          <Text style={styles.stepNumText}>{n}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
        {required ? <Text style={styles.required}>Obligatoire</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** Rubrique repliable : titre, valeur actuelle, contenu qui descend quand on touche la ligne. */
function Fold({
  icon: Icon,
  title,
  value,
  highlight,
  open,
  onToggle,
  last,
  children,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  highlight?: boolean;
  open: boolean;
  onToggle: () => void;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.fold, last && { borderBottomWidth: 0 }]}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.foldHead, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title} : ${value}`}
      >
        <View style={styles.foldIcon}>
          <Icon size={18} color={colors.cognac} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={styles.detailTitle}>{title}</Text>
          <Text style={[styles.foldValue, highlight && { color: colors.cognac, fontFamily: fonts.semibold }]} numberOfLines={1}>
            {value}
          </Text>
        </View>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown size={20} color={colors.text} strokeWidth={1.8} />
        </View>
      </Pressable>
      {open && (
        <Animated.View entering={FadeInDown.duration(220)} style={styles.foldBody}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={[styles.pill, active && styles.categoryActive]}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.categoryText, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

function DeleteRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.deleteRow} accessibilityRole="button">
      <Trash2 size={18} color={colors.promo} strokeWidth={1.8} />
      <Text style={styles.deleteText}>Supprimer ce produit</Text>
    </Pressable>
  );
}

function Suggestions({ suggestion, onUse, onClose }: { suggestion: ProductSuggestion; onUse: (p: Partial<ProductForm>) => void; onClose: () => void }) {
  const [done, setDone] = useState<string[]>([]);
  const rows = [
    suggestion.name ? { key: 'name', label: 'Nom', value: suggestion.name, patch: { name: suggestion.name } } : null,
    suggestion.categoryId ? { key: 'cat', label: 'Catégorie', value: getCategory(suggestion.categoryId)?.name ?? '', patch: { categoryId: suggestion.categoryId } } : null,
    suggestion.description ? { key: 'desc', label: 'Description', value: suggestion.description, patch: { description: suggestion.description } } : null,
  ].filter((r): r is NonNullable<typeof r> => !!r && !done.includes(r.key));
  if (rows.length === 0) return null;
  return (
    <Animated.View entering={FadeIn} style={styles.suggestions}>
      <Text style={styles.detailTitle}>Suggestions</Text>
      {rows.map((r) => (
        <View key={r.key} style={styles.suggestion}>
          <Text style={styles.hint}>{r.label}</Text>
          <Text style={styles.suggestionValue}>{r.value}</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Text
              style={styles.link}
              onPress={() => {
                onUse(r.patch as Partial<ProductForm>);
                setDone((d) => [...d, r.key]);
              }}
            >
              Utiliser
            </Text>
            <Text style={[styles.link, { color: colors.textSecondary }]} onPress={() => setDone((d) => [...d, r.key])}>
              Ignorer
            </Text>
          </View>
        </View>
      ))}
      <Text style={[styles.link, { color: colors.textSecondary }]} onPress={onClose}>
        Tout ignorer
      </Text>
    </Animated.View>
  );
}

function ResultView({ result, busy, store, onRetry, onAnother }: { result: Result; busy: boolean; store: SellerStore; onRetry: () => void; onAnother: () => void }) {
  const insets = useSafeAreaInsets();
  const local = result.kind === 'local';
  const Icon = local ? WifiOff : CircleCheck;
  return (
    <View style={[styles.screen, styles.result, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
      <Animated.View entering={FadeInDown.duration(380)} style={{ alignItems: 'center', gap: 14 }}>
        <View style={[styles.resultIcon, { backgroundColor: local ? '#F6E8D6' : '#E7EFDF' }]}>
          <Icon size={38} color={local ? colors.cognac : '#3F6B3A'} strokeWidth={1.8} />
        </View>
        <Text style={styles.resultTitle}>
          {result.kind === 'published' ? 'Votre produit est en ligne !' : result.kind === 'saved' ? 'C’est enregistré' : 'Gardé sur votre téléphone'}
        </Text>
        <Text style={styles.resultText}>
          {result.kind === 'published'
            ? store.status === 'verified'
              ? 'Les clients peuvent le voir et l’acheter dès maintenant.'
              : 'Il est visible dans votre boutique. Les ventes s’activeront après la vérification de votre boutique.'
            : result.kind === 'saved'
              ? 'Vos modifications sont enregistrées.'
              : (result as Extract<Result, { kind: 'local' }>).message}
        </Text>
      </Animated.View>
      <View style={{ gap: 10, alignSelf: 'stretch' }}>
        {local ? (
          <>
            <PrimaryButton label={busy ? 'Nouvel essai…' : 'Réessayer maintenant'} onPress={onRetry} disabled={busy} variant="caramel" style={styles.primary} />
            <ResultLink icon={<Package size={18} color={colors.text} strokeWidth={1.8} />} label="Voir mes produits" onPress={() => router.replace('/seller/products')} />
          </>
        ) : (
          <>
            <PrimaryButton
              label="Voir dans ma boutique"
              onPress={() => router.replace({ pathname: '/store/[id]', params: { id: store.slug } })}
              variant="caramel"
              style={styles.primary}
            />
            <ResultLink icon={<Package size={18} color={colors.text} strokeWidth={1.8} />} label="Ajouter un autre produit" onPress={onAnother} />
            <ResultLink icon={<StoreIcon size={18} color={colors.text} strokeWidth={1.8} />} label="Retour à mes produits" onPress={() => router.replace('/seller/products')} />
          </>
        )}
      </View>
    </View>
  );
}

function ResultLink({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.resultLink, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      {icon}
      <Text style={styles.resultLinkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.screen, paddingBottom: 8 },
  close: { fontSize: 17, color: colors.text },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 19, color: colors.text },
  content: { paddingHorizontal: spacing.screen + 2, paddingTop: 6, gap: 16 },
  resumed: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radii.md, backgroundColor: '#F6E8D6' },
  resumedText: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.chocolate },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.cognac },
  step: { gap: 12, padding: 16, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadows.soft },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.cognac, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  stepTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  required: { fontFamily: fonts.medium, fontSize: 12, color: colors.caramel },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.promo },
  currency: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSecondary },
  assist: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radii.lg, backgroundColor: '#FBF1E4', borderWidth: 1, borderColor: colors.champagne },
  assistTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  assistSub: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, lineHeight: 17, marginTop: 1 },
  soon: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.cognac, backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill, overflow: 'hidden' },
  suggestions: { gap: 10, padding: 14, borderRadius: radii.lg, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  suggestion: { gap: 4, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  suggestionValue: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.text },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 46, paddingHorizontal: 15, borderRadius: radii.pill, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  categoryActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  categoryText: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  more: { borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: 'hidden' },
  moreHeader: { gap: 2, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  moreTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  fold: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  foldHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 62 },
  foldIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' },
  foldValue: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  foldBody: { paddingHorizontal: 16, paddingBottom: 18, paddingTop: 4, gap: 12 },
  pill: { minHeight: 42, paddingHorizontal: 15, borderRadius: radii.pill, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  discountBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radii.lg, backgroundColor: '#FBF1E4', borderWidth: 1, borderColor: colors.champagne },
  discountOld: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textSecondary, textDecorationLine: 'line-through' },
  discountNew: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, letterSpacing: -0.3 },
  detailTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  soldOutBtn: { height: 48, paddingHorizontal: 18, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', backgroundColor: colors.background },
  soldOutOn: { backgroundColor: colors.text, borderColor: colors.text },
  soldOutText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  deleteText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.promo },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screen,
    paddingTop: 12,
    gap: 8,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  primary: { height: 58 },
  missing: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  missingText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.promo },
  footNote: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, textAlign: 'center' },
  secondary: { fontFamily: fonts.semibold, fontSize: 15, color: colors.cognac, textAlign: 'center', paddingVertical: 6 },
  result: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.screen + 4 },
  resultIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontFamily: fonts.bold, fontSize: 26, color: colors.text, textAlign: 'center', letterSpacing: -0.4 },
  resultText: { fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 22, color: '#4A433E', textAlign: 'center', paddingHorizontal: 8 },
  resultLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 54, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  resultLinkText: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text },
});
