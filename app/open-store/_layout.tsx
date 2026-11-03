import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function OpenStoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="success" options={{ gestureEnabled: false, animation: 'fade' }} />
    </Stack>
  );
}
