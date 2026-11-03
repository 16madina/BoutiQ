import { router } from 'expo-router';
import { ReceiptText } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSeller } from '@/store/useSeller';
import { colors } from '@/theme';

/** Commandes reçues. Le flux de paiement arrive avec le branchement backend. */
export default function SellerOrders() {
  const verified = useSeller((s) => s.store?.status === 'verified');
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Commandes" back={false} large />
      {verified ? (
        <EmptyState
          icon={ReceiptText}
          title="Aucune commande pour l’instant"
          message="Partagez votre boutique sur WhatsApp pour recevoir vos premières commandes."
          actionLabel="Partager ma boutique"
          onAction={() => router.navigate('/seller/settings')}
        />
      ) : (
        <EmptyState
          icon={ReceiptText}
          title="Ventes bientôt activées"
          message="Les commandes et les paiements s’activent dès que votre boutique est vérifiée."
          actionLabel="Faire vérifier ma boutique"
          onAction={() => router.push('/verification')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
});
