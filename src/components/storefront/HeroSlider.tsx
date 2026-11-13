import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import type { StorefrontPalette, HeroImage } from '@/types/storefront';
import { photoUrl } from '@/utils/images';

/** URL d'une photo de bannière à la taille d'affichage. */
export function heroUri(img: HeroImage | undefined, width: number, aspect: number): string | undefined {
  if (!img) return undefined;
  return img.uri ?? (img.photoId ? photoUrl(img.photoId, width, aspect) : undefined);
}

interface Props {
  images: HeroImage[];
  width: number;
  height: number;
  palette: StorefrontPalette;
  /** Points de pagination : clairs (sur photo sombre) ou foncés. */
  dots?: 'light' | 'dark' | false;
  /** Distance des points au bas de la bannière. */
  dotsBottom?: number;
  /** Cadrage horizontal de la photo (0 = gauche, 1 = droite). */
  focusX?: number;
  /** Calques posés au-dessus des photos (dégradés, textes, boutons). */
  children?: ReactNode;
  /** Photos de secours si une photo du vendeur ne se charge plus (fichier disparu de l'appareil). */
  fallback?: HeroImage[];
}

const AUTOPLAY_MS = 5000;

/**
 * Bannière en diaporama : le vendeur peut ajouter plusieurs photos.
 * Glissement au doigt, défilement automatique, points de pagination.
 */
export function HeroSlider({ images: wanted, width, height, palette, dots = 'light', dotsBottom = 16, focusX = 0.5, children, fallback }: Props) {
  const [broken, setBroken] = useState(false);
  const images = broken && fallback?.length ? fallback : wanted;
  const onError = fallback?.length && !broken ? () => setBroken(true) : undefined;
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);
  const count = images.length;
  const touching = useRef(false);

  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => {
      if (touching.current) return;
      setIndex((i) => {
        const next = (i + 1) % count;
        ref.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [count, width]);

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    touching.current = false;
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const aspect = height / width;
  const position = { top: '50%', left: `${Math.round(focusX * 100)}%` } as const;

  return (
    <View style={{ width, height, overflow: 'hidden', backgroundColor: palette.accentSoft }}>
      {count === 0 ? (
        <LinearGradient colors={[palette.accentSoft, palette.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : count === 1 ? (
        <Image source={{ uri: heroUri(images[0], width, aspect) }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={position} transition={300} cachePolicy="memory-disk" onError={onError} />
      ) : (
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => (touching.current = true)}
          onMomentumScrollEnd={onEnd}
          onScroll={(e) => {
            // Web : pas d'événement de fin d'élan, on suit la position.
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            if (i !== index && i >= 0 && i < count) setIndex(i);
          }}
          scrollEventThrottle={64}
          style={StyleSheet.absoluteFill}
        >
          {images.map((img, i) => (
            <Image
              key={`${img.uri ?? img.photoId}-${i}`}
              source={{ uri: heroUri(img, width, aspect) }}
              style={{ width, height }}
              onError={onError}
              contentFit="cover"
              contentPosition={position}
              transition={300}
              cachePolicy="memory-disk"
            />
          ))}
        </ScrollView>
      )}

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {children}
      </View>

      {dots && count > 1 && (
        <View style={[styles.dots, { bottom: dotsBottom }]} pointerEvents="none" accessibilityLabel={`Photo ${index + 1} sur ${count}`}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: dots === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(25,25,25,0.22)' },
                i === index && { width: 18, backgroundColor: dots === 'light' ? '#FFFFFF' : palette.accent },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/** Points de pagination posés hors de la photo (sous la bannière). */
export function SliderDots({ count, index, color }: { count: number; index: number; color: string }) {
  if (count < 2) return null;
  return (
    <View style={[styles.dots, { position: 'relative', bottom: 0, marginTop: 10 }]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: 'rgba(25,25,25,0.18)' }, i === index && { width: 18, backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
