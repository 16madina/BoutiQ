import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, X } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { colors, fonts, radii } from '@/theme';
import type { LocalImage } from '@/types/seller';
import { haptics } from '@/utils/haptics';

async function ensurePermission(): Promise<boolean> {
  const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!p.granted) {
    Alert.alert('Accès aux photos', 'Autorisez l’accès à vos photos dans les réglages pour continuer.');
    return false;
  }
  return true;
}

/** Ouvre la galerie avec recadrage (logo carré, bannière 2:1…). */
export async function pickImage(aspect: [number, number]): Promise<LocalImage | null> {
  haptics.light();
  if (!(await ensurePermission())) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.8,
  });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  return { uri: a.uri, width: a.width || 1000, height: a.height || 1000 };
}

/** Appareil photo (sur le web : sélection de fichier avec capture). */
export async function takePhoto(): Promise<LocalImage | null> {
  haptics.light();
  const p = await ImagePicker.requestCameraPermissionsAsync();
  if (!p.granted) {
    Alert.alert('Accès à l’appareil photo', 'Autorisez l’appareil photo dans les réglages, ou choisissez une photo dans votre galerie.');
    return null;
  }
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  return { uri: a.uri, width: a.width || 1000, height: a.height || 1000 };
}

export async function pickImages(limit: number): Promise<LocalImage[]> {
  haptics.light();
  if (limit <= 0 || !(await ensurePermission())) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 0.8,
  });
  if (res.canceled) return [];
  return res.assets.slice(0, limit).map((a) => ({ uri: a.uri, width: a.width || 1000, height: a.height || 1000 }));
}

/** Logo rond. */
export function LogoPicker({ value, onChange, size = 104 }: { value?: LocalImage; onChange: (v?: LocalImage) => void; size?: number }) {
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <Pressable
        onPress={async () => {
          const img = await pickImage([1, 1]);
          if (img) onChange(img);
        }}
        accessibilityRole="button"
        accessibilityLabel="Choisir le logo"
        style={[styles.logo, { width: size, height: size, borderRadius: size / 2 }]}
      >
        {value ? (
          <Animated.View entering={ZoomIn.springify().damping(14)} style={StyleSheet.absoluteFill}>
            <Image source={{ uri: value.uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
          </Animated.View>
        ) : (
          <Camera size={28} color={colors.cognac} strokeWidth={1.5} />
        )}
        <View style={styles.badge}>
          <ImagePlus size={15} color={colors.white} strokeWidth={2} />
        </View>
      </Pressable>
      <Text style={styles.caption}>{value ? 'Changer le logo' : 'Ajouter un logo'}</Text>
    </View>
  );
}

/** Bannière 2:1. */
export function BannerPicker({ value, onChange }: { value?: LocalImage; onChange: (v?: LocalImage) => void }) {
  return (
    <Pressable
      onPress={async () => {
        const img = await pickImage([2, 1]);
        if (img) onChange(img);
      }}
      accessibilityRole="button"
      accessibilityLabel="Choisir la bannière"
      style={styles.banner}
    >
      {value ? (
        <Animated.View entering={FadeIn.duration(300)} style={StyleSheet.absoluteFill}>
          <Image source={{ uri: value.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={styles.bannerEdit}>
            <ImagePlus size={15} color={colors.white} strokeWidth={2} />
            <Text style={styles.bannerEditText}>Changer</Text>
          </View>
        </Animated.View>
      ) : (
        <View style={styles.bannerEmpty}>
          <ImagePlus size={28} color={colors.cognac} strokeWidth={1.5} />
          <Text style={styles.bannerTitle}>Ajouter une bannière</Text>
          <Text style={styles.caption}>Photo de vos produits ou de votre boutique</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Grille de photos produit (jusqu'à `max`), la première est la couverture. */
export function PhotosPicker({ value, onChange, max = 6 }: { value: LocalImage[]; onChange: (v: LocalImage[]) => void; max?: number }) {
  return (
    <View style={styles.photos}>
      {value.map((img, i) => (
        <Animated.View key={img.uri} entering={ZoomIn.springify().damping(15)} style={styles.photo}>
          <Image source={{ uri: img.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          {i === 0 && (
            <View style={styles.cover}>
              <Text style={styles.coverText}>Couverture</Text>
            </View>
          )}
          <Pressable
            onPress={() => {
              haptics.light();
              onChange(value.filter((v) => v.uri !== img.uri));
            }}
            hitSlop={8}
            accessibilityLabel="Retirer la photo"
            style={styles.remove}
          >
            <X size={13} color={colors.white} strokeWidth={2.6} />
          </Pressable>
        </Animated.View>
      ))}
      {value.length < max && (
        <Pressable
          onPress={async () => {
            const imgs = await pickImages(max - value.length);
            if (imgs.length) onChange([...value, ...imgs]);
          }}
          accessibilityRole="button"
          accessibilityLabel="Ajouter des photos"
          style={[styles.photo, styles.addPhoto]}
        >
          <ImagePlus size={24} color={colors.cognac} strokeWidth={1.6} />
          <Text style={styles.addText}>{value.length === 0 ? 'Ajouter des photos' : 'Ajouter'}</Text>
          <Text style={styles.addCount}>{value.length}/{max}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1.5,
    borderColor: colors.champagne,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.caramel,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, textAlign: 'center' },
  banner: {
    aspectRatio: 2,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1.5,
    borderColor: colors.champagne,
    borderStyle: 'dashed',
  },
  bannerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16 },
  bannerTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.chocolate },
  bannerEdit: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(23,23,23,0.6)',
  },
  bannerEditText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: '31%', aspectRatio: 0.8, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.champagne },
  cover: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(23,23,23,0.65)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  coverText: { fontFamily: fonts.semibold, fontSize: 10.5, color: colors.white },
  remove: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(23,23,23,0.65)', alignItems: 'center', justifyContent: 'center' },
  addPhoto: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1.5,
    borderColor: colors.champagne,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 6,
  },
  addText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.chocolate, textAlign: 'center' },
  addCount: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
});
