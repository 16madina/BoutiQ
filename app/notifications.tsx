import { router, useFocusEffect } from 'expo-router';
import { Bell, Package, Sparkles, Truck } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { fetchNotifications, markNotificationsRead, timeAgo, type AppNotification } from '@/api/account';
import { remoteStores } from '@/api/remoteCatalog';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts, radii, spacing, typography } from '@/theme';

const ICONS: Record<string, typeof Bell> = {
  order_new: Package,
  order_shipped: Truck,
  product_new: Sparkles,
};

/** Notifications du compte : commandes (vendeur et client), nouveautés des boutiques suivies. */
export default function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchNotifications();
      setItems(list);
      // Ouvrir l'écran les marque comme lues (le point reste affiché pendant cette visite).
      markNotificationsRead(list.filter((n) => !n.read).map((n) => n.id)).catch(() => {});
    } catch {
      setItems((i) => i ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const open = (n: AppNotification) => {
    if (n.orderId) router.push({ pathname: '/order/[id]', params: { id: n.orderId } });
    else if (n.productId) router.push({ pathname: '/product/[id]', params: { id: n.productId } });
    else if (n.storeId) {
      const slug = remoteStores().find((s) => s.remoteId === n.storeId)?.id;
      if (slug) router.push({ pathname: '/store/[id]', params: { id: slug } });
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Notifications" />
      {items == null ? (
        <ActivityIndicator color={colors.caramel} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: spacing.screen, gap: 10 }}
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
              icon={Bell}
              title="Aucune notification"
              message="Le suivi de vos commandes et les nouveautés des boutiques que vous suivez apparaîtront ici."
              actionLabel="Découvrir les boutiques"
              onAction={() => router.navigate('/stores')}
            />
          }
          renderItem={({ item }) => {
            const Icon = ICONS[item.kind] ?? Bell;
            return (
              <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.item, !item.read && styles.unread, pressed && { opacity: 0.8 }]}>
                <View style={styles.icon}>
                  <Icon size={18} color={colors.cognac} strokeWidth={1.7} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.body}>{item.body}</Text>
                  <Text style={typography.caption}>{timeAgo(item.createdAt)}</Text>
                </View>
                {!item.read && <View style={styles.dot} />}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  item: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  unread: { borderColor: colors.champagne, backgroundColor: '#FFF8EF' },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  body: { ...typography.caption, fontSize: 13.5, color: '#4A433E', lineHeight: 19 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.caramel, marginTop: 6 },
});
