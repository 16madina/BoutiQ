import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { LayoutDashboard, MessageCircle, Package, ReceiptText, Store } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useMessages } from '@/api/messages';
import { pullSellerData } from '@/api/sellerSync';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useSeller, useSellerHydrated } from '@/store/useSeller';
import { useSellerOrders } from '@/store/useSellerOrders';
import { colors } from '@/theme';

const SELLER_ICONS = {
  index: LayoutDashboard,
  products: Package,
  orders: ReceiptText,
  messages: MessageCircle,
  settings: Store,
};

/** Espace vendeur : même compte, sa propre barre d'onglets. */
export default function SellerLayout() {
  const hydrated = useSellerHydrated();
  const store = useSeller((s) => s.store);
  const setSpace = useSeller((s) => s.setSpace);

  useEffect(() => {
    if (store) setSpace('seller');
  }, [store, setSpace]);

  // Relit la boutique et les produits enregistrés en ligne (autre appareil, réinstallation).
  useEffect(() => {
    pullSellerData().catch(() => {});
  }, []);

  // Commandes à traiter : pastille sur l'onglet, relue chaque minute.
  const unreadMessages = useMessages((s) => s.unread);
  const pending = useSellerOrders((s) => s.pending);
  const remoteId = store?.remoteId;
  useEffect(() => {
    const refresh = () => {
      useSellerOrders.getState().refresh();
      useMessages.getState().refresh();
    };
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [remoteId]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.caramel} />
      </View>
    );
  }
  if (!store) return <Redirect href="/open-store" />;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} icons={SELLER_ICONS} badges={{ orders: pending, messages: unreadMessages }} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background }, animation: 'shift' }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="products" options={{ title: 'Produits' }} />
      <Tabs.Screen name="orders" options={{ title: 'Commandes' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      <Tabs.Screen name="settings" options={{ title: 'Boutique' }} />
    </Tabs>
  );
}
