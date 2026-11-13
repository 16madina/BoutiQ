import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { EditorialBanner } from '@/feed/types';
import { fonts, radii, spacing, typography } from '@/theme';
import { photoUrl } from '@/utils/images';

const HEIGHT = 196;

/** Format G — bannière éditoriale : une belle photo, un titre, un bouton. */
export function EditorialBannerSection({ banner }: { banner: EditorialBanner }) {
  const { width } = useWindowDimensions();
  const inner = width - spacing.screen * 2;
  const open = () => {
    if (banner.link.view === 'stores') router.push({ pathname: '/categories', params: { view: 'stores' } });
    else router.push({ pathname: '/search', params: banner.link.promo ? { promo: '1' } : { category: banner.link.category ?? '' } });
  };
  return (
    <View style={{ paddingHorizontal: spacing.screen }}>
      <Pressable onPress={open} accessibilityRole="link" accessibilityLabel={`${banner.title.replace('\n', ' ')} — ${banner.cta}`} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
        <Image source={{ uri: photoUrl(banner.photoId, inner, HEIGHT / inner) }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={250} />
        {/* Voile sombre à gauche : le texte reste lisible sur n'importe quelle photo. */}
        <LinearGradient colors={['rgba(28,16,8,0.82)', 'rgba(28,16,8,0.45)', 'rgba(28,16,8,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <Text style={styles.kicker}>{banner.kicker.toUpperCase()}</Text>
          <Text style={typography.bannerTitle}>{banner.title}</Text>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{banner.cta}</Text>
            <View>
              <ArrowRight size={16} strokeWidth={2} color="#58351F" />
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: HEIGHT, borderRadius: radii.xl, overflow: 'hidden', backgroundColor: '#58351F' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 22, maxWidth: '80%', gap: 6 },
  kicker: { fontFamily: fonts.semibold, fontSize: 11.5, letterSpacing: 1.6, color: 'rgba(255,249,241,0.85)' },
  cta: { marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8E6CC', paddingHorizontal: 16, height: 38, borderRadius: radii.pill },
  ctaText: { fontFamily: fonts.semibold, fontSize: 14.5, color: '#58351F' },
});
