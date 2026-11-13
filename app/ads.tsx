import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Megaphone, Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AD_STATUS, adIsOver, createCampaign, deleteCampaign, fetchMyCampaigns, type AdCampaign } from '@/api/ads';
import { displayUri, toPublicProduct, toPublicStore } from '@/api/sellerCatalog';
import { EmptyState } from '@/components/EmptyState';
import { SponsoredSection } from '@/components/feed/SponsoredSection';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormField } from '@/components/seller/FormField';
import { SheetAction, StoreSheet } from '@/components/storefront/StoreSheet';
import { useSeller } from '@/store/useSeller';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import { formatFCFA } from '@/utils/format';
import { haptics } from '@/utils/haptics';

const DURATIONS = [7, 14, 30];
const number = (text: string) => Number(text.replace(/\D/g, '')) || 0;
const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Publicité et visibilité : la boutique met un produit ou sa vitrine en avant sur l'accueil. */
export default function AdsScreen() {
  const insets = useSafeAreaInsets();
  const store = useSeller((s) => s.store);
  const sellerProducts = useSeller((s) => s.products);
  const storeId = store?.remoteId;
  const [campaigns, setCampaigns] = useState<AdCampaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<AdCampaign | null>(null);
  const [busy, setBusy] = useState(false);

  // Formulaire
  const [kind, setKind] = useState<'product' | 'store'>('product');
  const [productId, setProductId] = useState<string | undefined>();
  const [headline, setHeadline] = useState('');
  const [tagline, setTagline] = useState('');
  const [days, setDays] = useState(7);
  const [budget, setBudget] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Seuls les produits en vente et déjà enregistrés en ligne peuvent être mis en avant.
  const products = useMemo(() => sellerProducts.filter((p) => p.status === 'published' && (!p.sync || p.sync.state === 'synced')), [sellerProducts]);
  const publicStore = useMemo(() => (store ? toPublicStore(store) : null), [store]);
  const chosen = products.find((p) => p.id === productId);
  const previewProduct = useMemo(() => (store && chosen ? toPublicProduct(chosen, store, 0) : undefined), [store, chosen]);

  const load = useCallback(async () => {
    if (!storeId) return;
    try {
      setCampaigns(await fetchMyCampaigns(storeId));
      setError(null);
    } catch (e) {
      setCampaigns([]);
      setError((e as Error).message);
    }
  }, [storeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openForm = () => {
    setKind(products.length ? 'product' : 'store');
    setProductId(products[0]?.id);
    setHeadline('');
    setTagline('');
    setDays(7);
    setBudget('');
    setFormError(null);
    setCreating(true);
  };

  const submit = async () => {
    if (!storeId || busy) return;
    if (kind === 'product' && !productId) return setFormError('Choisissez le produit à mettre en avant.');
    if (headline.trim().length < 3) return setFormError('Écrivez un titre pour votre annonce (3 lettres au moins).');
    setBusy(true);
    setFormError(null);
    try {
      await createCampaign(storeId, { kind, productId, headline, tagline, days, budget: number(budget) });
      haptics.success();
      setCreating(false);
      await load();
    } catch (e) {
      haptics.medium();
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    const target = removing;
    setRemoving(null);
    try {
      await deleteCampaign(target.id);
      setCampaigns((list) => list?.filter((c) => c.id !== target.id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!store || !storeId || !publicStore) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Publicité et visibilité" />
        <EmptyState icon={Megaphone} title="Boutique pas encore en ligne" message="Mettez d’abord votre boutique en ligne pour créer une annonce." />
      </View>
    );
  }
  if (store.status !== 'verified') {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Publicité et visibilité" />
        <EmptyState
          icon={Megaphone}
          title="Réservé aux boutiques vérifiées"
          message="Les annonces passent sur l’accueil, là où seules les boutiques vérifiées apparaissent."
          actionLabel="Faire vérifier ma boutique"
          onAction={() => router.push('/verification')}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Publicité et visibilité" />
      <ScrollView contentContainerStyle={{ padding: spacing.screen, gap: 14, paddingBottom: 110 + insets.bottom }}>
        <Text style={styles.intro}>
          Mettez un produit ou votre boutique en avant sur l’accueil de BoutiQ. Chaque annonce est vérifiée par l’équipe avant d’être diffusée, avec la mention « Sponsorisé ».
        </Text>
        <Text style={styles.notice}>La mise en avant n’est pas encore facturée : aucune somme n’est prélevée.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {campaigns == null ? (
          <ActivityIndicator color={colors.caramel} style={{ marginTop: 40 }} />
        ) : campaigns.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Megaphone size={28} color={colors.cognac} strokeWidth={1.7} />
            </View>
            <Text style={typography.h3}>Aucune annonce pour le moment</Text>
            <Text style={[typography.caption, { textAlign: 'center', fontSize: 13.5 }]}>Créez votre première annonce pour toucher plus de clients.</Text>
          </View>
        ) : (
          campaigns.map((c) => {
            const meta = AD_STATUS[adIsOver(c) ? 'over' : c.status];
            const product = c.productId ? sellerProducts.find((p) => p.id === c.productId) : undefined;
            const thumb = c.kind === 'product' ? displayUri(product?.photos[0]) : displayUri(store.banners?.[0] ?? store.banner ?? store.logo);
            const rate = c.impressions > 0 ? `${((c.clicks / c.impressions) * 100).toFixed(1).replace('.', ',')} %` : '—';
            return (
              <View key={c.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.thumb}>{thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {c.headline}
                    </Text>
                    <Text style={typography.caption} numberOfLines={1}>
                      {c.kind === 'store' ? 'Ma boutique' : (product?.name ?? 'Produit retiré')}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: colors[meta.bg] }]}>
                      <Text style={[styles.badgeText, { color: colors[meta.fg] }]}>{meta.label}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => setRemoving(c)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Supprimer l’annonce ${c.headline}`} style={styles.trash}>
                    <Trash2 size={17} color={colors.promo} strokeWidth={1.8} />
                  </Pressable>
                </View>
                {c.status === 'rejected' && c.rejectionReason ? <Text style={styles.reason}>Motif : {c.rejectionReason}</Text> : null}
                {c.status === 'active' || c.status === 'ended' || c.status === 'paused' ? (
                  <>
                    <View style={styles.stats}>
                      <Stat label="Vues" value={String(c.impressions)} />
                      <Stat label="Clics" value={String(c.clicks)} />
                      <Stat label="Taux de clics" value={rate} />
                      <Stat label="Paniers" value={String(c.cartAdds)} />
                    </View>
                    <Text style={typography.caption}>
                      {c.endsAt ? `Du ${day(c.startsAt)} au ${day(c.endsAt)}` : `Depuis le ${day(c.startsAt)}`}
                      {c.budget > 0 ? ` · budget indicatif ${formatFCFA(c.budget)}` : ''}
                    </Text>
                  </>
                ) : c.status === 'pending_review' ? (
                  <Text style={typography.caption}>L’équipe BoutiQ vérifie votre annonce. Sa durée démarrera à la mise en ligne.</Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <PrimaryButton label="Créer une annonce" onPress={openForm} variant="caramel" icon={<Plus size={18} color={colors.white} strokeWidth={2.2} />} />
      </View>

      <StoreSheet
        visible={creating}
        onClose={() => setCreating(false)}
        title="Nouvelle annonce"
        subtitle="Elle passera sur l’accueil, entre les produits."
        footer={<PrimaryButton label={busy ? 'Envoi…' : 'Envoyer pour validation'} onPress={submit} disabled={busy} variant="caramel" />}
      >
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Que voulez-vous mettre en avant ?</Text>
          <View style={styles.chips}>
            {(['product', 'store'] as const).map((k) => {
              const active = kind === k;
              const off = k === 'product' && products.length === 0;
              return (
                <Pressable
                  key={k}
                  disabled={off}
                  onPress={() => setKind(k)}
                  style={[styles.chip, active && styles.chipActive, off && { opacity: 0.4 }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active, disabled: off }}
                >
                  <Text style={[styles.chipText, active && { color: colors.white }]}>{k === 'product' ? 'Un produit' : 'Ma boutique'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {kind === 'product' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {products.map((p) => {
              const active = p.id === productId;
              const uri = displayUri(p.photos[0]);
              return (
                <Pressable key={p.id} onPress={() => setProductId(p.id)} accessibilityRole="radio" accessibilityState={{ selected: active }} accessibilityLabel={p.name} style={[styles.pick, active && styles.pickActive]}>
                  <View style={styles.pickImage}>{uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
                  <Text style={styles.pickName} numberOfLines={1}>
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <FormField label="Titre de l’annonce" required value={headline} onChangeText={(t) => setHeadline(t.slice(0, 60))} placeholder="Ex. Le sac signature de la saison" hint={`${headline.length}/60`} />
        <FormField label="Phrase d’accroche" optional value={tagline} onChangeText={(t) => setTagline(t.slice(0, 90))} placeholder="Ex. Cuir pleine fleur, fait main." />

        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Durée</Text>
          <View style={styles.chips}>
            {DURATIONS.map((d) => {
              const active = days === d;
              return (
                <Pressable key={d} onPress={() => setDays(d)} style={[styles.chip, active && styles.chipActive]} accessibilityRole="radio" accessibilityState={{ selected: active }}>
                  <Text style={[styles.chipText, active && { color: colors.white }]}>{d} jours</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <FormField
          label="Budget"
          optional
          value={budget ? formatFCFA(number(budget)).replace(/\s*FCFA$/, '') : ''}
          onChangeText={(t) => setBudget(t.replace(/\D/g, '').slice(0, 8))}
          keyboardType="number-pad"
          placeholder="Ex. 10 000"
          suffix={<Text style={styles.suffix}>FCFA</Text>}
          hint="Indicatif pour le moment : rien n’est prélevé."
        />

        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Aperçu</Text>
          <View style={styles.preview} pointerEvents="none">
            <SponsoredSection
              campaign={{ id: 'apercu', kind, storeId: publicStore.id, productId, headline: headline.trim() || 'Le titre de votre annonce', tagline: tagline.trim() || undefined, cta: kind === 'store' ? 'Visiter la boutique' : 'Découvrir' }}
              product={kind === 'product' ? previewProduct : undefined}
              store={publicStore}
              flip={false}
            />
          </View>
        </View>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
      </StoreSheet>

      <StoreSheet visible={!!removing} onClose={() => setRemoving(null)} title="Supprimer cette annonce ?" subtitle="Elle ne sera plus diffusée et ses résultats seront effacés.">
        <SheetAction icon={<Trash2 size={18} color={colors.promo} strokeWidth={2} />} label="Supprimer l’annonce" tint={colors.dangerBg} onPress={remove} />
        <SheetAction icon={<Megaphone size={18} color={colors.cognac} strokeWidth={2} />} label="La garder" onPress={() => setRemoving(null)} />
      </StoreSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  intro: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.textSoft },
  notice: { padding: 12, borderRadius: radii.md, backgroundColor: colors.tint, fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 19, color: colors.chocolate },
  error: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.promo },
  empty: { alignItems: 'center', gap: 8, padding: 26, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  emptyIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  card: { padding: 14, gap: 10, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  cardTop: { flexDirection: 'row', gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.placeholder },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15.5, lineHeight: 20, color: colors.text },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: radii.pill },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12 },
  trash: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerBg },
  reason: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 19, color: colors.promo },
  stats: { flexDirection: 'row', borderRadius: radii.md, backgroundColor: colors.backgroundAlt, paddingVertical: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  statLabel: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textSecondary },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.screen, paddingTop: 12, backgroundColor: colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  suffix: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  chipText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  pick: { width: 96, gap: 6, padding: 4, borderRadius: radii.md, borderWidth: 2, borderColor: 'transparent' },
  pickActive: { borderColor: colors.caramel },
  pickImage: { width: 84, height: 84, borderRadius: radii.sm, overflow: 'hidden', backgroundColor: colors.placeholder },
  pickName: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.text },
  preview: { marginHorizontal: -spacing.screen },
});
