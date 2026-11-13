import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { countProducts } from '@/api/catalog';
import { useRemoteCatalog } from '@/api/remoteCatalog';
import { useSeller } from '@/store/useSeller';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { PressableScale } from '@/components/PressableScale';
import { StoresList } from '@/components/StoresList';
import { TitleTabs } from '@/components/TitleTabs';
import { CATEGORIES } from '@/data/demo';
import { colors, fonts, radii, shadows, spacing } from '@/theme';
import { photoUrl } from '@/utils/images';

type View_ = 'categories' | 'stores';

/** Onglet « Catégories » : deux titres en haut, Catégories et Boutiques. */
export default function CategoriesScreen() {
  // « Découvrir les boutiques » ailleurs dans l'app ouvre directement la liste des boutiques.
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<View_>(params.view === 'stores' ? 'stores' : 'categories');
  useEffect(() => {
    if (params.view === 'stores' || params.view === 'categories') setView(params.view);
  }, [params.view]);

  return (
    <View style={styles.screen}>
      <TitleTabs
        tabs={[
          { id: 'categories', label: 'Catégories' },
          { id: 'stores', label: 'Boutiques' },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'stores' ? <StoresList /> : <CategoriesGrid />}
    </View>
  );
}

function CategoriesGrid() {
  const { width } = useWindowDimensions();
  const bottomSpace = useTabBarSpace();
  // Recompte quand le catalogue en ligne ou les produits du vendeur changent.
  useRemoteCatalog((s) => s.syncedAt);
  useSeller((s) => s.products);
  const cardWidth = (width - spacing.screen * 2 - spacing.gridGap) / 2;

  return (
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
