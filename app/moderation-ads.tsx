import { router, useFocusEffect } from 'expo-router';
import { Check, Megaphone, Minus, Pause, Play, Plus, SlidersHorizontal, Square, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { timeAgo } from '@/api/account';
import { adIsOver, fetchCampaignsToReview, reviewCampaign, saveFeedConfig, type AdCampaign, type AdStatus } from '@/api/ads';
import { getStore, peekProduct } from '@/api/catalog';
import { EmptyState } from '@/components/EmptyState';
import { SponsoredSection } from '@/components/feed/SponsoredSection';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormField } from '@/components/seller/FormField';
import { SheetAction, StoreSheet } from '@/components/storefront/StoreSheet';
import { useFeedConfig } from '@/feed/config';
import type { FeedConfig, SlotKind } from '@/feed/types';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import { formatFCFA } from '@/utils/format';
import { haptics } from '@/utils/haptics';

const FILTERS: { id: AdStatus; label: string }[] = [
  { id: 'pending_review', label: 'À valider' },
  { id: 'active', label: 'En ligne' },
  { id: 'paused', label: 'En pause' },
  { id: 'rejected', label: 'Refusées' },
];

/** Formats du fil que l'équipe peut couper ou remettre. */
const FORMATS: { id: SlotKind | 'sponsored'; label: string }[] = [
  { id: 'sponsored', label: 'Annonces sponsorisées' },
  { id: 'collections', label: 'Collections de quatre produits' },
  { id: 'stores', label: 'Boutiques à découvrir' },
  { id: 'recommendations', label: 'Recommandations' },
  { id: 'recent', label: 'Récemment consultés' },
  { id: 'asymmetric', label: 'Grille asymétrique' },
  { id: 'deals', label: 'Offres et petits prix' },
  { id: 'banner', label: 'Bannières' },
];

const SWITCH_COLORS = {
  trackColor: { true: colors.caramel, false: colors.sand },
  thumbColor: colors.white,
  ...(Platform.OS === 'web' ? ({ activeThumbColor: colors.white, activeTrackColor: colors.caramel } as object) : null),
};

const days = (c: AdCampaign) => (c.endsAt ? Math.max(1, Math.round((new Date(c.endsAt).getTime() - new Date(c.startsAt).getTime()) / 86_400_000)) : null);

/**
 * Équipe BoutiQ : valider ou refuser les annonces des boutiques, et régler le fil d'accueil
 * (fréquence des annonces, formats affichés). Le serveur refuse tout compte non modérateur.
 */
export default function ModerationAdsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<AdStatus>('pending_review');
  const [items, setItems] = useState<AdCampaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rejecting, setRejecting] = useState<AdCampaign | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  // Réglages du fil
  const config = useFeedConfig((s) => s.config);
  const [settings, setSettings] = useState(false);
  const [draft, setDraft] = useState<FeedConfig>(config);

  const load = useCallback(async (status: AdStatus) => {
    try {
      setItems(await fetchCampaignsToReview(status));
      setError(null);
    } catch (e) {
      setItems([]);
      setError((e as Error).message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(filter);
    }, [load, filter]),
  );

  const decide = async (c: AdCampaign, status: AdStatus, why?: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await reviewCampaign(c.id, status, why);
      haptics.success();
      setRejecting(null);
      setReason('');
      await load(filter);
    } catch (e) {
      haptics.medium();
      setRejecting(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await saveFeedConfig(draft);
      haptics.success();
      setSettings(false);
    } catch (e) {
      setSettings(false);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleFormat = (id: SlotKind | 'sponsored', on: boolean) =>
    setDraft((d) => ({ ...d, disabled: on ? d.disabled.filter((k) => k !== id) : [...new Set([...d.disabled, id])] }));

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Annonces" />
      <Pressable
        onPress={() => {
          setDraft(config);
          setSettings(true);
        }}
        style={({ pressed }) => [styles.settings, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
      >
        <View style={styles.settingsIcon}>
          <SlidersHorizontal size={18} color={colors.cognac} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingsTitle}>Réglages du fil d’accueil</Text>
          <Text style={typography.caption}>
            Une annonce tous les {config.adInterval} produits · {FORMATS.length - config.disabled.length} formats actifs
          </Text>
        </View>
      </Pressable>

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <Pressable
              key={f.id}
              onPress={() => {
                setItems(null);
                setFilter(f.id);
              }}
              style={[styles.filter, active && styles.filterActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.filterText, active && { color: colors.white }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {items == null ? (
        <ActivityIndicator color={colors.caramel} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32, gap: 14 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load(filter);
                setRefreshing(false);
              }}
              tintColor={colors.caramel}
              colors={[colors.caramel]}
            />
          }
          ListEmptyComponent={error ? undefined : <EmptyState icon={Megaphone} title={filter === 'pending_review' ? 'Aucune annonce à valider' : 'Rien ici'} message={filter === 'pending_review' ? 'Les nouvelles annonces des boutiques apparaîtront ici.' : undefined} />}
          renderItem={({ item }) => {
            const store = item.storeSlug ? getStore(item.storeSlug) : undefined;
            const product = item.productId ? peekProduct(item.productId) : undefined;
            const length = days(item);
            return (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.storeName ?? 'Boutique'}
                    </Text>
                    <Text style={typography.caption} numberOfLines={1}>
                      {item.kind === 'store' ? 'Met en avant sa boutique' : `Met en avant : ${product?.name ?? 'un produit'}`}
                    </Text>
                  </View>
                  <Text style={typography.caption}>{timeAgo(item.createdAt)}</Text>
                </View>

                {/* L'annonce telle qu'elle passera sur l'accueil. */}
                {store && (item.kind === 'store' || product) ? (
                  <View pointerEvents="none">
                    <SponsoredSection campaign={{ id: item.id, kind: item.kind, storeId: store.id, productId: item.productId, headline: item.headline, tagline: item.tagline, cta: item.cta }} product={product} store={store} flip={false} />
                  </View>
                ) : (
                  <View style={styles.cardBody}>
                    <Text style={styles.headline}>{item.headline}</Text>
                    {item.tagline ? <Text style={typography.caption}>{item.tagline}</Text> : null}
                    <Text style={styles.warning}>Aperçu indisponible : la boutique ou le produit n’est pas visible dans le catalogue.</Text>
                  </View>
                )}

                <View style={styles.cardBody}>
                  <Text style={typography.caption}>
                    {[length ? `${length} jours` : 'Sans date de fin', item.budget > 0 ? `budget indicatif ${formatFCFA(item.budget)}` : null, adIsOver(item) ? 'terminée' : null].filter(Boolean).join(' · ')}
                  </Text>
                  {item.status !== 'pending_review' ? (
                    <Text style={typography.caption}>
                      {item.impressions} vue{item.impressions > 1 ? 's' : ''} · {item.clicks} clic{item.clicks > 1 ? 's' : ''} · {item.cartAdds} ajout{item.cartAdds > 1 ? 's' : ''} au panier
                    </Text>
                  ) : null}
                  {item.status === 'rejected' && item.rejectionReason ? <Text style={styles.warning}>Motif : {item.rejectionReason}</Text> : null}

                  <View style={styles.actions}>
                    {item.storeSlug ? (
                      <Pressable onPress={() => router.push({ pathname: '/store/[id]', params: { id: item.storeSlug! } })} style={styles.ghost} accessibilityRole="button">
                        <Text style={styles.ghostText}>Voir la boutique</Text>
                      </Pressable>
                    ) : null}
                    {item.status === 'pending_review' ? (
                      <>
                        <Pressable onPress={() => setRejecting(item)} disabled={busy} style={[styles.ghost, { borderColor: colors.promo }]} accessibilityRole="button">
                          <X size={15} color={colors.promo} strokeWidth={2.2} />
                          <Text style={[styles.ghostText, { color: colors.promo }]}>Refuser</Text>
                        </Pressable>
                        <Pressable onPress={() => decide(item, 'active')} disabled={busy} style={styles.approve} accessibilityRole="button">
                          <Check size={15} color={colors.white} strokeWidth={2.4} />
                          <Text style={styles.approveText}>Mettre en ligne</Text>
                        </Pressable>
                      </>
                    ) : item.status === 'active' ? (
                      <>
                        <Pressable onPress={() => decide(item, 'paused')} disabled={busy} style={styles.ghost} accessibilityRole="button">
                          <Pause size={15} color={colors.text} strokeWidth={2} />
                          <Text style={styles.ghostText}>Mettre en pause</Text>
                        </Pressable>
                        <Pressable onPress={() => decide(item, 'ended')} disabled={busy} style={styles.ghost} accessibilityRole="button">
                          <Square size={14} color={colors.text} strokeWidth={2} />
                          <Text style={styles.ghostText}>Terminer</Text>
                        </Pressable>
                      </>
                    ) : item.status === 'paused' ? (
                      <Pressable onPress={() => decide(item, 'active')} disabled={busy} style={styles.approve} accessibilityRole="button">
                        <Play size={15} color={colors.white} strokeWidth={2.2} />
                        <Text style={styles.approveText}>Remettre en ligne</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <StoreSheet
        visible={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Refuser cette annonce ?"
        subtitle="La boutique reçoit votre explication et peut en créer une nouvelle."
        footer={<PrimaryButton label={busy ? 'Envoi…' : 'Refuser l’annonce'} onPress={() => rejecting && decide(rejecting, 'rejected', reason)} disabled={busy || reason.trim().length < 5} />}
      >
        <FormField label="Motif du refus" required value={reason} onChangeText={(t) => setReason(t.slice(0, 280))} placeholder="Ex. Le titre promet une réduction qui n’existe pas." multiline />
        <SheetAction icon={<Megaphone size={18} color={colors.cognac} strokeWidth={2} />} label="Annuler" onPress={() => setRejecting(null)} />
      </StoreSheet>

      <StoreSheet
        visible={settings}
        onClose={() => setSettings(false)}
        title="Réglages du fil d’accueil"
        subtitle="Appliqués à tous les utilisateurs, sans nouvelle version de l’application."
        footer={<PrimaryButton label={busy ? 'Enregistrement…' : 'Enregistrer'} onPress={saveSettings} disabled={busy} variant="caramel" />}
      >
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingsTitle}>Fréquence des annonces</Text>
            <Text style={typography.caption}>Une annonce tous les {draft.adInterval} produits affichés.</Text>
          </View>
          <View style={styles.stepper}>
            <Pressable onPress={() => setDraft((d) => ({ ...d, adInterval: Math.max(10, d.adInterval - 5) }))} style={styles.step} accessibilityRole="button" accessibilityLabel="Annonces plus fréquentes">
              <Minus size={16} color={colors.text} strokeWidth={2.2} />
            </Pressable>
            <Text style={styles.stepValue}>{draft.adInterval}</Text>
            <Pressable onPress={() => setDraft((d) => ({ ...d, adInterval: Math.min(60, d.adInterval + 5) }))} style={styles.step} accessibilityRole="button" accessibilityLabel="Annonces moins fréquentes">
              <Plus size={16} color={colors.text} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>
        <View style={styles.formats}>
          {FORMATS.map((f, i) => (
            <View key={f.id} style={[styles.format, i === FORMATS.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.formatLabel}>{f.label}</Text>
              <Switch value={!draft.disabled.includes(f.id)} onValueChange={(on) => toggleFormat(f.id, on)} accessibilityLabel={f.label} {...SWITCH_COLORS} />
            </View>
          ))}
        </View>
        <Text style={typography.caption}>La grille classique de produits reste toujours affichée.</Text>
      </StoreSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  settings: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: spacing.screen, marginBottom: 12, padding: 12, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  settingsIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' },
  settingsTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.screen, paddingBottom: 12 },
  filter: { height: 38, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' },
  filterActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  filterText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  error: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.promo, paddingHorizontal: spacing.screen, paddingBottom: 10 },
  card: { gap: 10, paddingVertical: 14, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: spacing.screen },
  cardBody: { gap: 6, paddingHorizontal: spacing.screen },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  headline: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  warning: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.promo },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  ghost: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  ghostText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  approve: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.success },
  approveText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.white },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  step: { width: 42, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 28, textAlign: 'center', fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  formats: { borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: 12 },
  format: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  formatLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 14.5, color: colors.text },
});
