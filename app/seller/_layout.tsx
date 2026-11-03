import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { LayoutDashboard, Package, ReceiptText, Store } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useSeller, useSellerHydrated } from '@/store/useSeller';
import { colors } from '@/theme';

const SELLER_ICONS = {
  index: LayoutDashboard,
  products: Package,
  orders: ReceiptText,
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
      tabBar={(props) => <FloatingTabBar {...props} icons={SELLER_ICONS} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background }, animation: 'shift' }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="products" options={{ title: 'Produits' }} />
      <Tabs.Screen name="orders" options={{ title: 'Commandes' }} />
      <Tabs.Screen name="settings" options={{ title: 'Boutique' }} />
    </Tabs>
  );
}
