import { Image } from 'expo-image';
import { Camera, ChevronLeft, ChevronRight, Images, X } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, ZoomIn } from 'react-native-reanimated';

import { PressableScale } from '@/components/PressableScale';
import { pickImages, takePhoto } from '@/components/seller/ImagePickers';
import { colors, fonts, radii, shadows, spacing } from '@/theme';
import type { LocalImage } from '@/types/seller';
import { haptics } from '@/utils/haptics';

export const MAX_PHOTOS = 6;

interface Props {
  value: LocalImage[];
  onChange: (photos: LocalImage[]) => void;
  error?: string | null;
}

/**
 * Photos du produit : deux grands boutons (appareil photo, galerie), puis une rangée
 * de vignettes que l'on peut déplacer avec les flèches. La première sert de couverture.
 */
export function ProductPhotosEditor({ value, onChange, error }: Props) {
  const room = MAX_PHOTOS - value.length;
  const fromCamera = async () => {
    const p = await takePhoto();
    if (p) onChange([...value, p].slice(0, MAX_PHOTOS));
  };
  const fromGallery = async () => {
    const list = await pickImages(room);
    if (list.length) onChange([...value, ...list].slice(0, MAX_PHOTOS));
  };
  const move = (i: number, dir: -1 | 1) => {
    haptics.selection();
    const next = [...value];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  if (value.length === 0) {
    return (
      <View style={{ gap: 10 }}>
        <PressableScale onPress={fromCamera} activeScale={0.97} accessibilityRole="button" style={[styles.bigBtn, styles.bigPrimary]}>
          <View style={styles.bigIcon}>
            <Camera size={26} color={colors.white} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bigTitle, { color: colors.white }]}>Prendre une photo</Text>
            <Text style={[styles.bigSub, { color: colors.sand }]}>Bien éclairée, produit au centre</Text>
          </View>
        </PressableScale>
        <PressableScale onPress={fromGallery} activeScale={0.97} accessibilityRole="button" style={[styles.bigBtn, styles.bigSecondary, error ? { borderColor: colors.promo } : null]}>
          <View style={[styles.bigIcon, { backgroundColor: colors.champagne }]}>
            <Images size={24} color={colors.chocolate} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bigTitle}>Choisir dans ma galerie</Text>
            <Text style={styles.bigSub}>Jusqu’à {MAX_PHOTOS} photos</Text>
          </View>
        </PressableScale>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} style={{ marginHorizontal: -spacing.screen - 2 }}>
        {value.map((img, i) => (
          <Animated.View key={img.uri + i} entering={ZoomIn.springify().damping(16)} layout={LinearTransition.springify().damping(18)} style={styles.item}>
            <View style={[styles.photo, i === 0 && styles.photoCover]}>
              <Image source={{ uri: img.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              {i === 0 && (
                <View style={styles.coverTag}>
                  <Text style={styles.coverText}>Couverture</Text>
                </View>
              )}
              <Pressable
                onPress={() => {
                  haptics.light();
                  onChange(value.filter((_, k) => k !== i));
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Retirer la photo ${i + 1}`}
                style={styles.remove}
              >
                <X size={14} color={colors.white} strokeWidth={2.6} />
              </Pressable>
            </View>
            <View style={styles.moveRow}>
              <Pressable disabled={i === 0} onPress={() => move(i, -1)} style={[styles.move, i === 0 && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={`Avancer la photo ${i + 1}`} hitSlop={4}>
                <ChevronLeft size={18} color={colors.text} strokeWidth={2} />
              </Pressable>
              <Text style={styles.index}>{i + 1}</Text>
              <Pressable
                disabled={i === value.length - 1}
                onPress={() => move(i, 1)}
                style={[styles.move, i === value.length - 1 && { opacity: 0.3 }]}
                accessibilityRole="button"
                accessibilityLabel={`Reculer la photo ${i + 1}`}
                hitSlop={4}
              >
                <ChevronRight size={18} color={colors.text} strokeWidth={2} />
              </Pressable>
            </View>
          </Animated.View>
        ))}
        {room > 0 && (
          <Animated.View entering={FadeIn} style={styles.addCol}>
            <PressableScale onPress={fromCamera} activeScale={0.95} accessibilityRole="button" accessibilityLabel="Prendre une autre photo" style={[styles.addTile, { backgroundColor: colors.buttonPrimary }]}>
              <Camera size={22} color={colors.white} strokeWidth={1.8} />
              <Text style={[styles.addText, { color: colors.white }]}>Photo</Text>
            </PressableScale>
            <PressableScale onPress={fromGallery} activeScale={0.95} accessibilityRole="button" accessibilityLabel="Ajouter depuis la galerie" style={styles.addTile}>
              <Images size={21} color={colors.chocolate} strokeWidth={1.8} />
              <Text style={styles.addText}>Galerie</Text>
            </PressableScale>
          </Animated.View>
        )}
      </ScrollView>
      <Text style={styles.hint}>
        {value.length}/{MAX_PHOTOS} photos · la première est la couverture. Utilisez les flèches pour changer l’ordre.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bigBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 76, paddingHorizontal: 18, borderRadius: radii.xl },
  bigPrimary: { backgroundColor: colors.buttonPrimary, ...shadows.card },
  bigSecondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.champagne },
  bigIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center' },
  bigTitle: { fontFamily: fonts.bold, fontSize: 17.5, color: colors.text },
  bigSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.promo },
  strip: { paddingHorizontal: spacing.screen + 2, gap: 10 },
  item: { gap: 6, alignItems: 'center' },
  photo: { width: 112, height: 136, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.champagne },
  photoCover: { borderWidth: 2.5, borderColor: colors.caramel },
  coverTag: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(23,23,23,0.7)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  coverText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.white },
  remove: { position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(23,23,23,0.65)', alignItems: 'center', justifyContent: 'center' },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  move: { width: 36, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundAlt },
  index: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.textSecondary, minWidth: 12, textAlign: 'center' },
  addCol: { gap: 8 },
  addTile: { width: 96, height: 64, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.border },
  addText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.chocolate },
  hint: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, lineHeight: 17 },
});
