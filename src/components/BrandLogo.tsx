import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '@/theme';

// Logo horizontal officiel (sac + « BoutiQ »), fond transparent.
const LOGO = require('../../assets/brand/logo-horizontal.png');
const LOGO_RATIO = 1818 / 583;

/** Logo BoutiQ sans fond. `size` = hauteur du logo. */
export function BrandLogo({ size = 52, showTagline = false }: { size?: number; showTagline?: boolean }) {
  return (
    <View style={styles.wrap} accessible accessibilityRole="header" accessibilityLabel="BoutiQ">
      <Image source={LOGO} style={{ width: Math.round(size * LOGO_RATIO), height: size }} contentFit="contain" />
      {showTagline && <Text style={[typography.tagline, styles.tagline]}>Votre boutique. Votre univers.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexShrink: 1 },
  tagline: { fontSize: 11.5, marginTop: 4 },
});
