import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { pullProfile } from '@/api/account';
import { syncRemoteCatalog } from '@/api/remoteCatalog';
import { pullShopData, startShopSync } from '@/api/shopSync';
import { colors } from '@/theme';
import { isPhonePreview, PREVIEW_INSETS } from '@/utils/devicePreview';

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (loaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, fontError]);

  // Catalogue réel (Supabase) chargé en arrière-plan ; la démo reste visible en attendant.
  useEffect(() => {
    // Favoris, abonnements et profil du compte : relus une fois les boutiques connues.
    syncRemoteCatalog().then(() => {
      pullShopData().catch(() => {});
      pullProfile().catch(() => {});
    });
    startShopSync();
  }, []);

  if (!loaded && !fontError) return null;

  const app = (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="store/[id]" />
        <Stack.Screen name="search" options={{ animation: 'fade' }} />
        <Stack.Screen name="cart" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="favorites" />
        {/* Module vendeur */}
        <Stack.Screen name="auth" options={{ presentation: 'modal', gestureEnabled: true }} />
        <Stack.Screen name="open-store" />
        <Stack.Screen name="seller" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="product-editor" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="customize" options={{ gestureEnabled: false }} />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="order/[id]" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="verification" />
        <Stack.Screen
          name="select"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.55, 0.92],
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
        <Stack.Screen
          name="filters"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.62, 0.95],
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );

  // Aperçu téléphone (navigateur, développement) : zones de sécurité d'un iPhone.
  return isPhonePreview ? <SafeAreaInsetsContext.Provider value={PREVIEW_INSETS}>{app}</SafeAreaInsetsContext.Provider> : app;
}
