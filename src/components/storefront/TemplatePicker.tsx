import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Eye } from 'lucide-react-native';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { TemplateExample } from '@/components/storefront/TemplateExample';
import { buildPalette, TEMPLATE_ORDER, TEMPLATES } from '@/storefront/templates';
import { colors, fonts, radii, spacing } from '@/theme';
import type { StorefrontTemplate, StorefrontTemplateId } from '@/types/storefront';
import { haptics } from '@/utils/haptics';
import { photoUrl } from '@/utils/images';

/** Photo d'exemple de chaque modèle (vignettes du sélecteur). */
const SAMPLE_PHOTO: Record<StorefrontTemplateId, string> = {
  editorial: '1515372039744-b8f02a3ae446',
  mode: '1511499767150-a48a237f0083',
  beaute: '1588405748880-12d1d2a59f75',
  electronique: '1511707171634-5f897ff02aa9',
  alimentation: '1610832958506-aa56368176cf',
  generaliste: '1555041469-a586c61ea9bc',
};

const W = 116;
const H = 152;
const INNER = W - 8;

function Bar({ w, color, h = 5, center }: { w: number; color: string; h?: number; center?: boolean }) {
  return <View style={{ width: w, height: h, borderRadius: h, backgroundColor: color, alignSelf: center ? 'center' : undefined }} />;
}

function Icons({ shape, accent, soft }: { shape: 'circle' | 'square'; accent: string; soft: string }) {
  return (
    <View style={styles.icons}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: 19, height: 19, borderRadius: shape === 'circle' ? 10 : 6, backgroundColor: i === 0 ? accent : soft }} />
      ))}
    </View>
  );
}

function Cards({ soft }: { soft: string }) {
  return (
    <View style={styles.cards}>
      <View style={[styles.card, { backgroundColor: soft }]} />
      <View style={[styles.card, { backgroundColor: soft }]} />
    </View>
  );
}

/** Vignette schématique d'un modèle : on voit la disposition sans lire de texte. */
export function TemplateThumb({ template, accent }: { template: StorefrontTemplate; accent?: string }) {
  const palette = buildPalette(accent ?? template.defaultAccent);
  const photo = { uri: photoUrl(SAMPLE_PHOTO[template.id], W, 1) };

  // La vignette garde le dessin propre à chaque modèle.
  switch (template.legacyLayout ?? template.heroLayout) {
    case 'collage':
      return (
        <View style={styles.thumb}>
          <View style={styles.thumbBar}>
            <Bar w={52} h={6} color={colors.text} />
          </View>
          <View style={{ height: 66 }}>
            <View style={[styles.collageA, { backgroundColor: palette.accentSoft }]}>
              <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
            <View style={[styles.collageB, { backgroundColor: palette.accentSoft }]}>
              <Image source={{ uri: photoUrl('1595777457583-95e059d581b8', W, 1.3) }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
          </View>
          <View style={[styles.pad, { alignItems: 'center' }]}>
            <Bar w={64} h={6} color={colors.text} />
            <Bar w={44} h={10} color={palette.accent} />
          </View>
        </View>
      );
    case 'overlay':
      return (
        <View style={styles.thumb}>
          <View style={{ height: 92 }}>
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={['rgba(28,16,8,0.6)', 'rgba(28,16,8,0.1)', 'rgba(28,16,8,0.8)']} style={StyleSheet.absoluteFill} />
            <View style={styles.overlayTop}>
              <Bar w={40} h={6} color="#FFF9F1" center />
            </View>
            <View style={styles.overlayBottom}>
              <Bar w={50} h={7} color="#FFF9F1" />
              <Bar w={30} h={9} color="#F3DDBF" />
            </View>
          </View>
          <View style={[styles.sheet, { gap: 7 }]}>
            <Icons shape="circle" accent={palette.accent} soft={palette.accentSoft} />
            <Cards soft={colors.backgroundAlt} />
          </View>
        </View>
      );
    case 'centered':
      return (
        <View style={styles.thumb}>
          <View style={{ height: 62, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, overflow: 'hidden' }}>
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
          <View style={[styles.center, { backgroundColor: palette.accentSoft }]}>
            <View style={[styles.logo, { backgroundColor: palette.accent }]} />
            <Bar w={52} h={7} color={colors.text} />
            <Bar w={34} color={colors.textMuted} />
            <View style={styles.icons}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: i === 0 ? palette.accent : colors.surface }} />
              ))}
            </View>
          </View>
        </View>
      );
    case 'stacked':
      return (
        <View style={styles.thumb}>
          <View style={{ height: 50 }}>
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
          <View style={styles.dark}>
            <Bar w={56} h={7} color="#FFF9F1" />
            <Bar w={38} color="#5B6370" />
            <Bar w={40} h={12} color={palette.accent} />
          </View>
          <View style={[styles.pad, { flexDirection: 'row', gap: 5 }]}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: 26, height: 26, borderRadius: 5, backgroundColor: i === 0 ? palette.accent : palette.accentSoft }} />
            ))}
          </View>
        </View>
      );
    case 'inset':
      return (
        <View style={styles.thumb}>
          <View style={{ padding: 7, paddingBottom: 0 }}>
            <View style={{ height: 54, borderRadius: 10, overflow: 'hidden' }}>
              <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
          </View>
          <View style={styles.pad}>
            <Bar w={60} h={7} color={colors.text} />
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Bar w={26} h={9} color={palette.accentSoft} />
              <Bar w={34} h={9} color={palette.accentSoft} />
            </View>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: i === 0 ? palette.accent : palette.accentSoft }} />
              ))}
            </View>
          </View>
        </View>
      );
    case 'banner':
      return (
        <View style={styles.thumb}>
          <View style={[styles.thumbBar, { alignItems: 'center', gap: 3, backgroundColor: palette.accentSoft }]}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: palette.accent }} />
            <Bar w={44} h={5} color={colors.text} />
          </View>
          <View style={{ height: 56 }}>
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={[palette.accentSoft, 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 0.8, y: 0.5 }} style={StyleSheet.absoluteFill} />
            <View style={styles.bannerText}>
              <Bar w={40} h={6} color={colors.text} />
              <Bar w={30} h={8} color={palette.accent} />
            </View>
          </View>
          <View style={styles.gridThumb}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.gridCell, { backgroundColor: palette.accentSoft, borderWidth: 0 }]}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: i === 0 ? palette.accent : palette.accentSoft }} />
              </View>
            ))}
          </View>
        </View>
      );
  }
}

interface Props {
  value: StorefrontTemplateId;
  onChange: (id: StorefrontTemplateId) => void;
  /** Modèle conseillé pour la catégorie de la boutique. */
  recommended?: StorefrontTemplateId;
  /** Couleur choisie par le vendeur (appliquée à la vignette sélectionnée). */
  accent?: string;
}

/** Sélecteur des six modèles : vignette + nom + « Voir » (exemple complet), défilement horizontal. */
export function TemplatePicker({ value, onChange, recommended, accent }: Props) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [example, setExample] = useState<StorefrontTemplateId | null>(null);
  // Au premier affichage, le modèle actuel est visible même s'il est en fin de liste.
  const revealSelected = () => {
    const index = TEMPLATE_ORDER.indexOf(value);
    if (index > 1) ref.current?.scrollTo({ x: (index - 1) * (W + 12), animated: false });
  };

  return (
    <>
      <ScrollView ref={ref} onLayout={revealSelected} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {TEMPLATE_ORDER.map((id) => {
          const t = TEMPLATES[id];
          const active = id === value;
          return (
            <View key={id} style={{ width: W, gap: 8 }}>
              <PressableScale
                onPress={() => {
                  haptics.selection();
                  onChange(id);
                }}
                activeScale={0.96}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Modèle ${t.shortLabel}${id === recommended ? ', recommandé' : ''}`}
                style={{ gap: 8 }}
              >
                <View style={[styles.frame, active && { borderColor: colors.text }]}>
                  <TemplateThumb template={t} accent={active ? accent : undefined} />
                  {active && (
                    <View style={styles.check}>
                      <Check size={13} color={colors.white} strokeWidth={3} />
                    </View>
                  )}
                </View>
                <View style={{ gap: 3 }}>
                  <Text style={[styles.label, active && { fontFamily: fonts.bold }]} numberOfLines={1}>
                    {t.shortLabel}
                  </Text>
                  {id === recommended ? <Text style={styles.recommended}>Recommandé</Text> : <Text style={styles.sub}> </Text>}
                </View>
              </PressableScale>
              {/* Bouton séparé (pas de bouton dans un bouton) : ouvre l'exemple complet. */}
              <Pressable
                onPress={() => {
                  haptics.light();
                  setExample(id);
                }}
                style={({ pressed }) => [styles.see, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel={`Voir un exemple du modèle ${t.shortLabel}`}
                hitSlop={4}
              >
                <Eye size={15} color={colors.text} strokeWidth={1.9} />
                <Text style={styles.seeText}>Voir</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      <TemplateExample templateId={example} selected={value} onBrowse={setExample} onChoose={onChange} onClose={() => setExample(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingHorizontal: spacing.screen, paddingVertical: 2 },
  frame: { borderRadius: 18, borderWidth: 2, borderColor: 'transparent', padding: 2 },
  thumb: { width: INNER, height: H, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.background, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  thumbBar: { paddingHorizontal: 9, paddingVertical: 7 },
  pad: { padding: 8, gap: 6 },
  sheet: { flex: 1, marginTop: -8, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: colors.background, padding: 8 },
  icons: { flexDirection: 'row', gap: 5, justifyContent: 'center' },
  cards: { flexDirection: 'row', gap: 5 },
  card: { flex: 1, height: 30, borderRadius: 6 },
  collageA: { position: 'absolute', left: 8, top: 0, width: 56, height: 58, overflow: 'hidden' },
  collageB: { position: 'absolute', right: 8, top: 12, width: 42, height: 52, overflow: 'hidden', borderWidth: 2, borderColor: colors.background },
  overlayTop: { position: 'absolute', top: 8, left: 0, right: 0 },
  overlayBottom: { position: 'absolute', left: 8, bottom: 14, gap: 5 },
  center: { flex: 1, alignItems: 'center', gap: 5 },
  logo: { width: 26, height: 26, borderRadius: 13, marginTop: -13, borderWidth: 2, borderColor: colors.background },
  dark: { backgroundColor: '#14161A', padding: 9, gap: 6, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  bannerText: { position: 'absolute', left: 8, top: 0, bottom: 0, justifyContent: 'center', gap: 5 },
  gridThumb: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 8 },
  gridCell: { width: (INNER - 16 - 8) / 3, height: 20, borderRadius: 5, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text, textAlign: 'center' },
  recommended: { alignSelf: 'center', fontFamily: fonts.semibold, fontSize: 11, color: colors.success, backgroundColor: colors.successBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill, overflow: 'hidden' },
  sub: { fontSize: 11 },
  see: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 34, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  seeText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
});
