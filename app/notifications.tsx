import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationsList } from '@/components/NotificationsList';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/theme';

/** Notifications du compte (la même liste que l'onglet « Activité » de Commandes). */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Notifications" />
      <NotificationsList bottomInset={insets.bottom + 32} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
});
