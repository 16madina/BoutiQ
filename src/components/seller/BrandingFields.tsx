import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { pickImage } from '@/components/seller/ImagePickers';
import { colors, fonts, radii, shadows } from '@/theme';
import type { CategoryId } from '@/types';
import type { LocalImage } from '@/types/seller';
import { categoryIcon, defaultBanner } from '@/utils/storeDefaults';

/** Logo rond : image du vendeur ou pictogramme de sa catégorie. */
export function StoreLogoMark({ logo, categoryId, size = 112 }: { logo?: LocalImage; categoryId?: CategoryId; size?: number }) {
  const Icon = categoryIcon(categoryId);
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size / 2 }]}>
      {logo ? (
        <Animated.View key={logo.uri} entering={ZoomIn.springify().damping(14)} style={StyleSheet.absoluteFill}>
          <Image source={{ uri: logo.uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
        </Animated.View>
      ) : (
        <Icon size={size * 0.46} color={colors.cognac} fill={colors.cognac} strokeWidth={1.2} />
      )}
    </View>
  );
}

/** Bloc « Logo de la boutique » de la maquette : zone pointillée + aperçu rond. */
export function LogoField({
  value,
  onChange,
  categoryId,
}: {
  value?: LocalImage;
  onChange: (v: LocalImage) => void;
  categoryId?: CategoryId;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.label}>Logo de la boutique</Text>
      <View style={styles.logoRow}>
        <Pressable
          onPress={async () => {
            const img = await pickImage([1, 1]);
            if (img) onChange(img);
          }}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un logo"
          style={({ pressed }) => [styles.dashed, pressed && { opacity: 0.7 }]}
        >
          <Camera size={28} color={colors.text} strokeWidth={1.5} />
          <Text style={styles.dashedText}>
            {value ? 'Changer le logo' : 'Ajouter un logo'}
            {'\n'}
            <Text style={styles.dashedHint}>(facultatif)</Text>
          </Text>
        </Pressable>
        <StoreLogoMark logo={value} categoryId={categoryId} />
      </View>
    </View>
  );
}

/** Bloc « Bannière de votre boutique » : photo (choisie ou proposée) + bouton blanc en surimpression. */
export function BannerField({
  value,
  onChange,
  categoryId,
}: {
  value?: LocalImage;
  onChange: (v: LocalImage) => void;
  categoryId?: CategoryId;
}) {
  const shown = value ?? defaultBanner(categoryId);
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.label}>Bannière de votre boutique</Text>
      <Pressable
        onPress={async () => {
          const img = await pickImage([2, 1]);
          if (img) onChange(img);
        }}
        accessibilityRole="button"
        accessibilityLabel="Ajouter une bannière"
        style={styles.banner}
      >
        <Animated.View key={shown.uri} entering={FadeIn.duration(300)} style={styles.bannerImage}>
          <Image source={{ uri: shown.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        </Animated.View>
        <View style={styles.bannerButton}>
          <Camera size={20} color={colors.text} strokeWidth={1.6} />
          <Text style={styles.bannerButtonText}>
            {value ? 'Changer la bannière' : 'Ajouter une bannière'}
            {'\n'}
            <Text style={styles.dashedHint}>{value ? 'Votre photo' : '(recommandé)'}</Text>
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dashed: {
    flex: 1,
    height: 118,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.sand,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dashedText: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textSoft, textAlign: 'center', lineHeight: 19 },
  dashedHint: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary },
  mark: { backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  banner: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.backgroundAlt, paddingBottom: 26 },
  bannerImage: { aspectRatio: 2.4, overflow: 'hidden', borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  bannerButton: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: radii.md,
    backgroundColor: colors.field,
    ...shadows.button,
  },
  bannerButtonText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, textAlign: 'center', lineHeight: 18 },
});
