import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, isDark, typography } from '@/theme';

// Logo horizontal officiel (sac + « BoutiQ »), fond transparent.
const LOGO = require('../../assets/brand/logo-horizontal.png');
const LOGO_RATIO = 1818 / 583;
// Mode sombre : le mot « BoutiQ » du logo est foncé, on garde le sac et on écrit le nom en clair.
const BAG = require('../../assets/brand/bag.png');

/** Logo BoutiQ sans fond. `size` = hauteur du logo. */
export function BrandLogo({ size = 52, showTagline = false }: { size?: number; showTagline?: boolean }) {
  return (
    <View style={styles.wrap} accessible accessibilityRole="header" accessibilityLabel="BoutiQ">
      {isDark ? (
        <View style={styles.darkRow}>
          <Image source={BAG} style={{ width: size, height: size }} contentFit="contain" />
          <Text style={[styles.darkName, { fontSize: Math.round(size * 0.5) }]}>
            Bouti<Text style={{ color: colors.gold }}>Q</Text>
          </Text>
        </View>
      ) : (
        <Image source={LOGO} style={{ width: Math.round(size * LOGO_RATIO), height: size }} contentFit="contain" />
      )}
      {showTagline && <Text style={[typography.tagline, styles.tagline]}>Votre boutique. Votre univers.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexShrink: 1 },
  darkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  darkName: { fontFamily: fonts.extrabold, letterSpacing: -0.8, color: colors.text },
  tagline: { fontSize: 11.5, marginTop: 4 },
});
