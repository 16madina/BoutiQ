import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { countProducts } from '@/api/catalog';
import { useRemoteCatalog } from '@/api/remoteCatalog';
import { useSeller } from '@/store/useSeller';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { CATEGORIES } from '@/data/demo';
import { colors, fonts, radii, shadows, spacing } from '@/theme';
import { photoUrl } from '@/utils/images';

export default function CategoriesScreen() {
  const { width } = useWindowDimensions();
  const bottomSpace = useTabBarSpace();
  // Recompte quand le catalogue en ligne ou les produits du vendeur changent.
  useRemoteCatalog((s) => s.syncedAt);
  useSeller((s) => s.products);
  const cardWidth = (width - spacing.screen * 2 - spacing.gridGap) / 2;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Catégories" back={false} large />
      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: bottomSpace }]} showsVerticalScrollIndicator={false}>
        {CATEGORIES.map((c, i) => {
          const tall = i % 3 === 0;
          const height = cardWidth * (tall ? 1.15 : 0.9);
          return (
            <PressableScale
              key={c.id}
              onPress={() => router.push({ pathname: '/search', params: { category: c.id } })}
              accessibilityRole="button"
              accessibilityLabel={c.name}
              style={[styles.card, { width: cardWidth, height }]}
            >
              <Image source={{ uri: photoUrl(c.coverPhotoId, cardWidth, height / cardWidth) }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
              <LinearGradient colors={['rgba(25,25,25,0)', 'rgba(25,25,25,0.6)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0.45 }} end={{ x: 0, y: 1 }} />
              <View style={styles.label}>
                <Text style={styles.name}>
                  {c.emoji ? `${c.emoji}  ` : ''}
                  {c.name}
                </Text>
                <Text style={styles.count}>
                  {(() => {
                    const n = countProducts({ categoryId: c.id });
                    return `${n} article${n > 1 ? 's' : ''}`;
                  })()}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.gridGap, paddingHorizontal: spacing.screen, paddingTop: spacing.xs },
  card: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.champagne, ...shadows.soft },
  label: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  name: { fontFamily: fonts.bold, fontSize: 17, color: colors.white },
  count: { fontFamily: fonts.regular, fontSize: 12.5, color: '#F6E8D6', marginTop: 2 },
});
