import { router, useFocusEffect } from 'expo-router';
import { ReceiptText } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { fetchStoreOrders, type Order, type OrderStatus } from '@/api/account';
import { EmptyState } from '@/components/EmptyState';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { OrderCard } from '@/components/OrderCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { shareOnWhatsApp, storeShareMessage } from '@/config/links';
import { useSeller } from '@/store/useSeller';
import { useSellerOrders } from '@/store/useSellerOrders';
import { colors, fonts, radii, spacing } from '@/theme';
import { formatFCFA } from '@/utils/format';

type Filter = 'todo' | 'progress' | 'delivered' | 'cancelled';
const FILTERS: { id: Filter; label: string; statuses: OrderStatus[] }[] = [
  { id: 'todo', label: 'À traiter', statuses: ['pending'] },
  { id: 'progress', label: 'En cours', statuses: ['confirmed', 'shipped'] },
  { id: 'delivered', label: 'Livrées', statuses: ['delivered'] },
  { id: 'cancelled', label: 'Annulées', statuses: ['cancelled'] },
];

/** Commandes reçues : confirmer, expédier, suivre jusqu'au « Reçu » du client. */
export default function SellerOrders() {
  const bottomSpace = useTabBarSpace();
  const store = useSeller((s) => s.store);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<Filter>('todo');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!store?.remoteId) {
      setOrders([]);
      return;
    }
    try {
      const list = await fetchStoreOrders(store.remoteId);
      setOrders(list);
      useSellerOrders.getState().setFrom(list);
      setError(null);
    } catch {
      setError('Impossible de charger les commandes. Vérifiez votre connexion.');
      setOrders((o) => o ?? []);
    }
  }, [store?.remoteId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const items = useMemo(() => (orders ?? []).filter((o) => FILTERS.find((f) => f.id === filter)!.statuses.includes(o.status)), [orders, filter]);
  const earned = (orders ?? []).filter((o) => o.status === 'delivered').reduce((n, o) => n + o.total - o.commission, 0);
  if (!store) return null;
  const verified = store.status === 'verified';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Commandes" back={false} large />
      {earned > 0 && (
        <View style={styles.earned}>
          <Text style={styles.earnedLabel}>Ventes validées (après commission)</Text>
          <Text style={styles.earnedValue}>{formatFCFA(earned)}</Text>
        </View>
      )}
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = f.id === filter;
          const count = (orders ?? []).filter((o) => f.statuses.includes(o.status)).length;
          return (
            <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[styles.filter, active && styles.filterActive]} accessibilityRole="tab" accessibilityState={{ selected: active }}>
              <Text style={[styles.filterText, active && { color: colors.white }]}>
                {f.label} · {count}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {orders == null ? (
        <ActivityIndicator color={colors.caramel} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: bottomSpace, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              tintColor={colors.caramel}
              colors={[colors.caramel]}
            />
          }
          ListEmptyComponent={
            verified ? (
              <EmptyState
                icon={ReceiptText}
                title={orders.length === 0 ? 'Aucune commande pour l’instant' : 'Rien ici'}
                message={orders.length === 0 ? 'Partagez votre boutique sur WhatsApp pour recevoir vos premières commandes.' : undefined}
                actionLabel={orders.length === 0 ? 'Partager ma boutique' : undefined}
                onAction={orders.length === 0 ? () => shareOnWhatsApp(storeShareMessage(store.name, store.slug)) : undefined}
              />
            ) : (
              <EmptyState
                icon={ReceiptText}
                title="Les ventes s’activent après la vérification"
                message="Faites vérifier votre boutique : les clients pourront alors commander."
                actionLabel="Faire vérifier ma boutique"
                onAction={() => router.push('/verification')}
              />
            )
          }
          renderItem={({ item }) => <OrderCard order={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  earned: { marginHorizontal: spacing.screen, marginBottom: 12, padding: 14, borderRadius: radii.lg, backgroundColor: '#E7EFDF' },
  earnedLabel: { fontFamily: fonts.medium, fontSize: 13, color: '#2F5A2B' },
  earnedValue: { fontFamily: fonts.bold, fontSize: 22, color: '#2F5A2B', marginTop: 2 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.screen, marginBottom: 12 },
  filter: { paddingHorizontal: 14, height: 38, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  filterActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  filterText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  error: { marginHorizontal: spacing.screen, marginBottom: 10, padding: 12, borderRadius: radii.md, backgroundColor: '#F6E8D6', fontFamily: fonts.medium, fontSize: 13.5, color: colors.chocolate },
});
