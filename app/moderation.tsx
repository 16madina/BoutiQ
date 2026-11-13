import { router, useFocusEffect } from 'expo-router';
import { BadgeCheck, Check, FileText, ShieldCheck, Store, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { timeAgo } from '@/api/account';
import { getCategory } from '@/api/catalog';
import { fetchStoresToReview, idDocumentUrl, reviewStore, type ReviewStatus, type ReviewStore } from '@/api/moderation';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormField } from '@/components/seller/FormField';
import { SheetAction, StoreSheet } from '@/components/storefront/StoreSheet';
import { colors, fonts, radii, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

const FILTERS: { id: ReviewStatus; label: string }[] = [
  { id: 'pending_review', label: 'À vérifier' },
  { id: 'verified', label: 'Vérifiées' },
  { id: 'rejected', label: 'Refusées' },
];

/**
 * Modération : l'équipe BoutiQ approuve ou refuse les boutiques qui demandent la vérification.
 * L'écran n'affiche rien pour un compte non modérateur (le serveur refuse la lecture).
 */
export default function ModerationScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<ReviewStatus>('pending_review');
  const [stores, setStores] = useState<ReviewStore[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [approving, setApproving] = useState<ReviewStore | null>(null);
  const [rejecting, setRejecting] = useState<ReviewStore | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (status: ReviewStatus) => {
    try {
      setStores(await fetchStoresToReview(status));
      setError(null);
    } catch (e) {
      setStores([]);
      setError((e as Error).message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(filter);
    }, [load, filter]),
  );

  const decide = async (store: ReviewStore, decision: 'verified' | 'rejected', why?: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await reviewStore(store.id, decision, why);
      haptics.success();
      setApproving(null);
      setRejecting(null);
      setReason('');
      await load(filter);
    } catch (e) {
      haptics.medium();
      setError((e as Error).message);
      setApproving(null);
      setRejecting(null);
    } finally {
      setBusy(false);
    }
  };

  const openDocument = async (store: ReviewStore) => {
    if (!store.idDocumentPath) return;
    try {
      await Linking.openURL(await idDocumentUrl(store.idDocumentPath));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Modération" />
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <Pressable
              key={f.id}
              onPress={() => {
                setStores(null);
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

      {stores == null ? (
        <ActivityIndicator color={colors.caramel} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: insets.bottom + 32, gap: 12 }}
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
          ListEmptyComponent={
            error ? undefined : (
              <EmptyState
                icon={ShieldCheck}
                title={filter === 'pending_review' ? 'Aucune boutique à vérifier' : 'Rien ici'}
                message={filter === 'pending_review' ? 'Les nouvelles demandes de vérification apparaîtront ici.' : undefined}
              />
            )
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.head}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {getCategory(item.category)?.name ?? item.category} · {item.city}, {item.country}
                  </Text>
                </View>
                {item.submittedAt ? <Text style={styles.meta}>{timeAgo(item.submittedAt)}</Text> : null}
              </View>

              {item.description ? (
                <Text style={styles.description} numberOfLines={3}>
                  {item.description}
                </Text>
              ) : null}

              <View style={styles.facts}>
                <Fact label="Vendeur" value={item.sellerName ?? 'Non renseigné'} />
                <Fact label="Type" value={item.sellerType === 'business' ? `Entreprise${item.businessName ? ` · ${item.businessName}` : ''}` : 'Particulier'} />
                <Fact label="Téléphone" value={item.phone ?? 'Non renseigné'} />
                {item.whatsapp && item.whatsapp !== item.phone ? <Fact label="WhatsApp" value={item.whatsapp} /> : null}
                <Fact label="Produits en vente" value={String(item.productCount)} />
                <Fact label="Pièce d’identité" value={item.idDocumentPath ? 'Fournie' : 'Non fournie'} />
                {item.status === 'rejected' && item.rejectionReason ? <Fact label="Motif du refus" value={item.rejectionReason} /> : null}
              </View>

              <View style={styles.links}>
                <Pressable onPress={() => router.push({ pathname: '/store/[id]', params: { id: item.slug } })} style={styles.link} accessibilityRole="button">
                  <Store size={16} color={colors.cognac} strokeWidth={1.8} />
                  <Text style={styles.linkText}>Voir la boutique</Text>
                </Pressable>
                {item.idDocumentPath ? (
                  <Pressable onPress={() => openDocument(item)} style={styles.link} accessibilityRole="button">
                    <FileText size={16} color={colors.cognac} strokeWidth={1.8} />
                    <Text style={styles.linkText}>Pièce d’identité</Text>
                  </Pressable>
                ) : null}
              </View>

              {item.status !== 'verified' && (
                <View style={styles.actions}>
                  {item.status === 'pending_review' && (
                    <PrimaryButton label="Refuser" variant="light" onPress={() => setRejecting(item)} style={{ flex: 1, height: 48 }} />
                  )}
                  <PrimaryButton label="Approuver" variant="caramel" onPress={() => setApproving(item)} style={{ flex: 1, height: 48 }} />
                </View>
              )}
              {item.status === 'verified' && (
                <View style={styles.verified}>
                  <BadgeCheck size={16} color="#3F6B3A" strokeWidth={2} />
                  <Text style={styles.verifiedText}>Boutique vérifiée</Text>
                </View>
              )}
            </View>
          )}
        />
      )}

      <StoreSheet
        visible={!!approving}
        title="Approuver cette boutique ?"
        subtitle={approving ? `« ${approving.name} » pourra recevoir des commandes et apparaîtra dans tout BoutiQ.` : undefined}
        onClose={() => setApproving(null)}
      >
        <SheetAction
          icon={<Check size={18} color={colors.white} strokeWidth={2.4} />}
          tint="#3F6B3A"
          label={busy ? 'Un instant…' : 'Oui, approuver'}
          onPress={() => approving && decide(approving, 'verified')}
        />
        <SheetAction icon={<X size={18} color={colors.cognac} strokeWidth={2} />} label="Annuler" onPress={() => setApproving(null)} />
      </StoreSheet>

      <StoreSheet
        visible={!!rejecting}
        title="Refuser cette boutique"
        subtitle="Le vendeur lira ce motif et pourra corriger puis renvoyer sa demande."
        onClose={() => setRejecting(null)}
        footer={
          <PrimaryButton
            label={busy ? 'Un instant…' : 'Envoyer le refus'}
            onPress={() => rejecting && decide(rejecting, 'rejected', reason.trim())}
            disabled={busy || reason.trim().length < 5}
            style={{ height: 54 }}
          />
        }
      >
        <FormField
          label="Motif du refus"
          value={reason}
          onChangeText={(t) => setReason(t.slice(0, 280))}
          placeholder="Ex. La pièce d’identité est illisible."
          multiline
          autoFocus
        />
      </StoreSheet>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.screen, marginBottom: 12 },
  filter: { paddingHorizontal: 14, height: 38, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  filterActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  filterText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  error: { marginHorizontal: spacing.screen, marginBottom: 10, padding: 12, borderRadius: radii.md, backgroundColor: '#F6E8D6', fontFamily: fonts.medium, fontSize: 13.5, color: colors.chocolate, lineHeight: 19 },
  card: { padding: 16, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  description: { fontFamily: fonts.regular, fontSize: 14, color: '#4A433E', lineHeight: 20 },
  facts: { gap: 8, padding: 12, borderRadius: radii.md, backgroundColor: colors.background },
  fact: { flexDirection: 'row', gap: 10 },
  factLabel: { width: 118, fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  factValue: { flex: 1, fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 40, paddingHorizontal: 13, borderRadius: radii.pill, backgroundColor: '#F6E8D6', borderWidth: 1, borderColor: colors.champagne },
  linkText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.chocolate },
  actions: { flexDirection: 'row', gap: 10 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedText: { fontFamily: fonts.semibold, fontSize: 13.5, color: '#3F6B3A' },
});
