import { useLocalSearchParams } from 'expo-router';

import { StorefrontScreen } from '@/components/storefront/StorefrontScreen';

/** Vitrine publique d'une boutique (le vendeur voit la même dans son Accueil). */
export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StorefrontScreen id={id} />;
}
