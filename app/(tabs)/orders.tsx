import { router, useFocusEffect } from 'expo-router';
import { Package } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { fetchMyOrders, type Order } from '@/api/account';
import { EmptyState } from '@/components/EmptyState';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { OrderCard } from '@/components/OrderCard';
import { NotificationsList } from '@/components/NotificationsList';
import { TitleTabs } from '@/components/TitleTabs';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { colors, fonts, radii, spacing } from '@/theme';

/** Onglet « Commandes » : mes commandes, et « Activité » (suivi des commandes, nouveautés des boutiques suivies). */
export default function OrdersScreen() {
  const bottomSpace = useTabBarSpace();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'orders' | 'activity'>('orders');
  const unread = useUnreadNotifications();

  const load = useCallback(async () => {
    try {
      setOrders(await fetchMyOrders());
      setError(null);
    } catch {
      setError('Impossible de charger vos commandes. Vérifiez votre connexion.');
      setOrders((o) => o ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.screen}>
      <TitleTabs
        tabs={[
          { id: 'orders', label: 'Commandes' },
          { id: 'activity', label: 'Activité', badge: view === 'activity' ? 0 : unread },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'activity' ? (
        <NotificationsList bottomInset={bottomSpace} />
      ) : (
        <>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {orders == null ? (
        <ActivityIndicator color={colors.caramel} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
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
            <EmptyState
              icon={Package}
              title="Aucune commande"
              message="Vos commandes et leur suivi apparaîtront ici."
              actionLabel="Commencer mes achats"
              onAction={() => router.navigate('/')}
            />
          }
          renderItem={({ item }) => <OrderCard order={item} />}
        />
      )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  error: { marginHorizontal: spacing.screen, marginBottom: 10, padding: 12, borderRadius: radii.md, backgroundColor: colors.tint, fontFamily: fonts.medium, fontSize: 13.5, color: colors.chocolate },
});
