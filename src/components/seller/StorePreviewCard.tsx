import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, MapPin } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { getCategory } from '@/api/catalog';
import { StoreLogoMark } from '@/components/seller/BrandingFields';
import { storeDisplayAddress } from '@/config/links';
import { colors, fonts, radii, shadows } from '@/theme';
import type { CategoryId } from '@/types';
import type { LocalImage } from '@/types/seller';

interface Props {
  name: string;
  slug: string;
  city?: string;
  categoryId?: CategoryId;
  description?: string;
  logo?: LocalImage;
  banner?: LocalImage;
  collections?: string[];
  verified?: boolean;
  compact?: boolean;
}

/** Aperçu en direct de la vitrine pendant la création. */
export function StorePreviewCard({ name, slug, city, categoryId, description, logo, banner, collections, verified, compact }: Props) {
  const category = categoryId ? getCategory(categoryId) : undefined;
  const initials = (name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || 'MM').toUpperCase();

  return (
    <Animated.View layout={LinearTransition.springify().damping(18)} style={styles.card}>
      <View style={[styles.banner, compact && { height: 64 }]}>
        {banner ? (
          <Image source={{ uri: banner.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <LinearGradient colors={[colors.champagne, colors.caramel]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.previewTag}>
          <Text style={styles.previewTagText}>Aperçu</Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.logoWrap}>
          {logo ? (
            <Image source={{ uri: logo.uri }} style={styles.logo} contentFit="cover" />
          ) : categoryId ? (
            <View style={styles.logoIcon}>
              <StoreLogoMark categoryId={categoryId} size={54} />
            </View>
          ) : (
            <View style={[styles.logo, styles.logoEmpty]}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name.trim() || 'Nom de votre boutique'}
          </Text>
          {verified && <BadgeCheck size={16} color={colors.caramel} strokeWidth={2} />}
        </View>
        <Text style={styles.address} numberOfLines={1}>
          {storeDisplayAddress(slug || 'votre-boutique')}
        </Text>
        {(city || category) && (
          <View style={styles.meta}>
            {city ? (
              <>
                <MapPin size={12} color={colors.textSecondary} strokeWidth={1.8} />
                <Text style={styles.metaText}>{city}</Text>
              </>
            ) : null}
            {category ? <Text style={styles.metaText}>{city ? ' · ' : ''}{category.name}</Text> : null}
          </View>
        )}
        {!compact && description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        {!compact && collections && collections.filter(Boolean).length > 0 && (
          <View style={styles.chips}>
            {['Tout', ...collections.filter(Boolean)].slice(0, 4).map((c, i) => (
              <View key={`${c}-${i}`} style={[styles.chip, i === 0 && styles.chipActive]}>
                <Text style={[styles.chipText, i === 0 && { color: colors.white }]}>{c}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  banner: { height: 96, backgroundColor: colors.champagne },
  previewTag: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,252,248,0.88)', borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  previewTagText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.chocolate },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
  logoWrap: { marginTop: -30, marginBottom: 8 },
  logo: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: colors.surface, backgroundColor: colors.champagne },
  logoEmpty: { backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: colors.surface, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundAlt },
  initials: { fontFamily: fonts.bold, fontSize: 19, color: '#FFF7EC' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, flexShrink: 1 },
  address: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.caramel, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary },
  description: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSoft, marginTop: 8, lineHeight: 18 },
  chips: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 11, height: 28, borderRadius: radii.pill, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  chipActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  chipText: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.text },
});
