import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';

import { useMessages } from '@/api/messages';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { colors } from '@/theme';

export default function TabsLayout() {
  // Messages non lus : pastille sur l'onglet, relue chaque minute.
  const unread = useMessages((s) => s.unread);
  useEffect(() => {
    const refresh = useMessages.getState().refresh;
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} badges={{ messages: unread }} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        animation: 'shift',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="categories" options={{ title: 'Catégories' }} />
      <Tabs.Screen name="orders" options={{ title: 'Commandes' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      <Tabs.Screen name="account" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
