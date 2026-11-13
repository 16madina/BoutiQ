import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { colors, fonts, radii, spacing } from '@/theme';

interface Props {
  /** Adresses des photos, la principale en premier. */
  images: string[];
  width: number;
  height: number;
  /** Image basse définition affichée pendant le chargement de la première photo. */
  placeholder?: string;
  /** Boutons posés sur la photo (favori, partage, remise). */
  children?: ReactNode;
}

const THUMB = 56;

/** Photos d'un article : on glisse d'une photo à l'autre, avec points et miniatures. */
export function ProductGallery({ images, width, height, placeholder, children }: Props) {
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);
  const many = images.length > 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index && next >= 0 && next < images.length) setIndex(next);
  };

  const goTo = (i: number) => {
    setIndex(i);
    scroller.current?.scrollTo({ x: i * width, animated: true });
  };

  return (
    <View>
      <View style={{ width, height, backgroundColor: colors.white }}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          scrollEnabled={many}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {images.map((uri, i) => (
            <Image
              key={uri + i}
              source={{ uri }}
              placeholder={i === 0 && placeholder ? { uri: placeholder } : undefined}
              style={{ width, height, backgroundColor: '#F1E6D8' }}
              contentFit="cover"
              transition={250}
              cachePolicy="memory-disk"
              accessibilityLabel={`Photo ${i + 1} sur ${images.length}`}
            />
          ))}
        </ScrollView>
        {children}
        {/* À la souris, on ne peut pas glisser : deux flèches font défiler les photos. */}
        {many && Platform.OS === 'web' && index > 0 && (
          <Pressable onPress={() => goTo(index - 1)} accessibilityRole="button" accessibilityLabel="Photo précédente" style={[styles.arrow, { left: 10, top: height / 2 - 19 }]}>
            <ChevronLeft size={20} strokeWidth={2} color={colors.text} />
          </Pressable>
        )}
        {many && Platform.OS === 'web' && index < images.length - 1 && (
          <Pressable onPress={() => goTo(index + 1)} accessibilityRole="button" accessibilityLabel="Photo suivante" style={[styles.arrow, { right: 10, top: height / 2 - 19 }]}>
            <ChevronRight size={20} strokeWidth={2} color={colors.text} />
          </Pressable>
        )}
        {many && (
          <View style={styles.counter} pointerEvents="none">
            <Text style={styles.counterText}>
              {index + 1} / {images.length}
            </Text>
          </View>
        )}
      </View>

      {many && (
        <>
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {images.map((uri, i) => (
              <Pressable
                key={uri + i}
                onPress={() => goTo(i)}
                accessibilityRole="button"
                accessibilityLabel={`Voir la photo ${i + 1}`}
                style={[styles.thumb, i === index && styles.thumbActive]}
              >
                <Image source={{ uri }} style={styles.thumbImage} contentFit="cover" cachePolicy="memory-disk" />
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  counter: { position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(25,25,25,0.62)', borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  counterText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white },
  arrow: { position: 'absolute', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.overlayLight },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.sand, opacity: 0.6 },
  dotActive: { backgroundColor: colors.caramel, opacity: 1, width: 18 },
  thumbs: { paddingHorizontal: spacing.screen, paddingTop: 10, gap: 8 },
  thumb: { width: THUMB, height: THUMB, borderRadius: radii.sm, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  thumbActive: { borderColor: colors.caramel },
  thumbImage: { width: '100%', height: '100%' },
});
