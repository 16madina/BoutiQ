import { router } from 'expo-router';
import { Package } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/theme';

/** Le suivi de commande arrive dans la prochaine livraison (paiement + livraison). */
export default function OrdersScreen() {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Commandes" back={false} large />
      <EmptyState
        icon={Package}
        title="Aucune commande"
        message="Vos commandes et leur suivi en temps réel apparaîtront ici."
        actionLabel="Commencer mes achats"
        onAction={() => router.navigate('/')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
});
