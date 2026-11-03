import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';
import type { Store } from '@/types';

type AvatarStore = Pick<Store, 'logoInitials' | 'logoColor' | 'logoUri'>;

/** Logo de boutique : image du vendeur, sinon initiales sur sa couleur. */
export function StoreAvatar({ store, size = 48 }: { store: AvatarStore; size?: number }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (store.logoUri) {
    return <Image source={{ uri: store.logoUri }} style={[styles.logo, shape]} contentFit="cover" />;
  }
  return (
    <View style={[styles.logo, shape, { backgroundColor: store.logoColor }]}>
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>{store.logoInitials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.champagne,
  },
  text: { color: '#FFF7EC', fontFamily: fonts.bold, letterSpacing: 0.5 },
});
