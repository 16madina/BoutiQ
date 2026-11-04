import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, BadgeCheck, Check, ChevronLeft, MapPin, MessageCircle, Plus, Search, Share2, ShoppingCart, Star, Truck } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { Storefront } from '@/api/storefront';
import { PressableScale } from '@/components/PressableScale';
import { StoreAvatar } from '@/components/StoreAvatar';
import { HeroSlider, heroUri } from '@/components/storefront/HeroSlider';
import { useCartCount, useShop } from '@/store/useShop';
import { colors, fonts, radii, shadows, spacing } from '@/theme';
import { formatCount } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { productImageUri } from '@/utils/images';

interface Props {
  sf: Storefront;
  width: number;
  topInset: number;
  onContact: () => void;
  onShare: () => void;
  /** Bouton de la bannière et loupe : mènent au catalogue. */
  onExplore?: () => void;
  onBack?: () => void;
}

export const DARK_BG = '#14161A';
const LIGHT_INK = '#FFF9F1';

/** Ligne discrète : note, avis, abonnés. Rien d'inventé pour une nouvelle boutique. */
function metaText(sf: Storefront) {
  const { store } = sf;
  const parts: string[] = [];
  if (store.reviewsCount > 0) parts.push(`${store.rating.toFixed(1).replace('.', ',')} · ${formatCount(store.reviewsCount)} avis`);
  if (store.followers > 0) parts.push(`${formatCount(store.followers)} abonné${store.followers > 1 ? 's' : ''}`);
  return parts.length ? parts.join('  ·  ') : 'Nouvelle boutique';
}

/** Sous-titre de l'enseigne : les rayons de la boutique (« Robes • Sacs • Bijoux »). */
function storeSubline(sf: Storefront) {
  const names = sf.collections.slice(0, 3).map((c) => c.name);
  return names.length ? names.join(' • ') : sf.template.label;
}

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * En-tête de la vitrine, fidèle aux maquettes BoutiQ :
 * le nom de la boutique est en haut, la bannière défile, un bouton mène au catalogue.
 * Beauté garde sa disposition propre (logo et nom centrés sous la photo).
 */
export function StoreHero(props: Props) {
  const { sf } = props;
  switch (sf.template.heroLayout) {
    case 'centered':
      return <CenteredHero {...props} />;
    case 'collage':
      return <CollageHero {...props} />;
    case 'overlay':
      return <OverlayHero {...props} />;
    case 'stacked':
      return <StackedHero {...props} />;
    case 'inset':
      return <InsetHero {...props} />;
    case 'banner':
      return <BannerHero {...props} />;
  }
}

/* ------------------------------------------------------------ Barre du haut */

function BarIcon({ children, onPress, label, glass }: { children: ReactNode; onPress?: () => void; label: string; glass?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.barIcon, glass && styles.barIconGlass, pressed && { opacity: 0.6 }]}
    >
      {children}
    </Pressable>
  );
}

function CartIcon({ color, glass, accent }: { color: string; glass?: boolean; accent: string }) {
  const count = useCartCount();
  return (
    <BarIcon onPress={() => router.push('/cart')} label={`Panier, ${count} article${count > 1 ? 's' : ''}`} glass={glass}>
      <ShoppingCart size={21} color={color} strokeWidth={1.7} />
      {count > 0 && (
        <View style={[styles.cartBadge, { backgroundColor: accent }]}>
          <Text style={styles.cartBadgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </BarIcon>
  );
}

function TopBar({
  sf,
  ink,
  center,
  glass,
  onBack,
  onSearch,
  children,
}: {
  sf: Storefront;
  ink: string;
  center?: boolean;
  glass?: boolean;
  onBack?: () => void;
  onSearch?: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.bar}>
      <BarIcon onPress={onBack ?? goBack} label="Retour" glass={glass}>
        <ChevronLeft size={23} color={ink} strokeWidth={1.9} />
      </BarIcon>
      <View style={[styles.barTitle, center ? { alignItems: 'center' } : { alignItems: 'flex-start', paddingLeft: 2 }]}>{children}</View>
      <BarIcon onPress={onSearch} label={`Rechercher dans ${sf.store.name}`} glass={glass}>
        <Search size={20} color={ink} strokeWidth={1.8} />
      </BarIcon>
      <CartIcon color={ink} glass={glass} accent={sf.palette.accent} />
    </View>
  );
}

/** Nom de la boutique dans la barre du haut, avec son logo et ses rayons. */
function Brand({ sf, ink, subInk, serif, size = 24, logo = true }: { sf: Storefront; ink: string; subInk: string; serif?: boolean; size?: number; logo?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      {logo && <StoreAvatar store={sf.store} size={34} />}
      <View style={styles.brandRow}>
        <Text
          style={{ fontFamily: serif ? fonts.serif : fonts.extrabold, fontSize: size, lineHeight: size * 1.2, color: ink, letterSpacing: serif ? -0.3 : -0.5, textAlign: 'center' }}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {sf.store.name}
        </Text>
        {sf.store.verified && <BadgeCheck size={16} color={ink} strokeWidth={2} accessibilityLabel="Boutique vérifiée" />}
      </View>
      <Text style={[styles.brandSub, { color: subInk }]} numberOfLines={1}>
        {storeSubline(sf)}
      </Text>
    </View>
  );
}

/* --------------------------------------------------- Éléments communs */

function HeroTitle({ sf, color, size, serif, align = 'left', upper }: { sf: Storefront; color: string; size: number; serif?: boolean; align?: 'left' | 'center'; upper?: boolean }) {
  const title = sf.settings.tagline || sf.template.heroTitle;
  return (
    <Text
      style={{
        fontFamily: serif ? fonts.serif : fonts.extrabold,
        fontSize: size,
        lineHeight: Math.round(size * 1.16),
        color,
        letterSpacing: upper ? 1.2 : serif ? -0.4 : -0.7,
        textAlign: align,
        textTransform: upper ? 'uppercase' : 'none',
      }}
      numberOfLines={3}
    >
      {title}
    </Text>
  );
}

function HeroCta({ label, bg, fg, onPress }: { label: string; bg: string; fg: string; onPress?: () => void }) {
  return (
    <PressableScale
      onPress={() => {
        haptics.light();
        onPress?.();
      }}
      activeScale={0.95}
      accessibilityRole="button"
      style={[styles.cta, { backgroundColor: bg }]}
    >
      <Text style={[styles.ctaText, { color: fg }]}>{label}</Text>
      <ArrowRight size={16} color={fg} strokeWidth={2.2} />
    </PressableScale>
  );
}

/** Note et abonnés en petit, puis Suivre / Contacter / Partager (mêmes boutons sur toutes les vitrines). */
function InfoBar({ sf, onContact, onShare }: Props) {
  const { store, palette } = sf;
  return (
    <View>
      <View style={styles.infoMetaRow}>
        {store.reviewsCount > 0 && <Star size={12} color={palette.accent} fill={palette.accent} />}
        <Text style={styles.meta} numberOfLines={1}>
          {metaText(sf)}
        </Text>
      </View>
      <ActionRow sf={sf} onContact={onContact} onShare={onShare} style={styles.infoActions} />
      <PendingNotice sf={sf} />
    </View>
  );
}

function ActionRow({ sf, onContact, onShare, dark, style }: { sf: Storefront; onContact: () => void; onShare: () => void; dark?: boolean; style?: object }) {
  const { store, palette } = sf;
  const ink = dark ? LIGHT_INK : colors.text;
  return (
    <View style={[styles.actions, style]}>
      <FollowStoreButton storeId={store.id} accent={palette.accent} onAccent={palette.onAccent} dark={dark} />
      <ActionButton dark={dark} icon={<MessageCircle size={17} color={ink} strokeWidth={1.8} />} label="Contacter" onPress={onContact} />
      <ActionButton dark={dark} icon={<Share2 size={17} color={ink} strokeWidth={1.8} />} label="Partager" onPress={onShare} />
    </View>
  );
}

function PendingNotice({ sf }: { sf: Storefront }) {
  if (sf.store.salesEnabled !== false) return null;
  return (
    <View style={styles.pending}>
      <Text style={styles.pendingText}>Boutique en cours de vérification · achats bientôt disponibles</Text>
    </View>
  );
}

/** Bord arrondi de la feuille claire qui recouvre le bas d'une bannière sombre. */
function SheetCap() {
  return <View style={styles.sheetCap} />;
}

/* ------------------------------------------------- 1. Éditorial Élégance */

function CollageHero(props: Props) {
  const { sf, width, topInset, onExplore, onBack } = props;
  const { palette, heroImages } = sf;
  const h = Math.round(width * sf.template.heroRatio);
  const bigW = Math.round(width * 0.6);
  const smallW = Math.round(width * 0.46);
  const first = heroUri(heroImages[0], bigW, 1.45);
  const second = heroImages[1] ? heroUri(heroImages[1], smallW, 1.3) : sf.products[0] ? productImageUri(sf.products[0], smallW, 1.3) : undefined;
  const script = sf.collections[0]?.name;

  return (
    <View style={{ paddingTop: topInset }}>
      <TopBar sf={sf} ink={colors.text} onBack={onBack} onSearch={onExplore}>
        <Text style={[styles.editorialName, { fontSize: sf.store.name.length > 16 ? 23 : 27 }]} numberOfLines={1} accessibilityRole="header">
          {sf.store.name}
        </Text>
      </TopBar>

      <View style={{ height: h, marginTop: 6 }}>
        <View style={[styles.collageBig, { width: bigW, height: Math.round(h * 0.8), backgroundColor: palette.accentSoft }]}>
          {first ? <Image source={{ uri: first }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} /> : null}
        </View>
        {second ? (
          <View style={[styles.collageSmall, { width: smallW, height: Math.round(h * 0.66), top: Math.round(h * 0.2) }]}>
            <Image source={{ uri: second }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          </View>
        ) : null}
        {script ? (
          <Text style={[styles.script, { color: colors.text }]} numberOfLines={1}>
            {script}
          </Text>
        ) : null}
      </View>

      <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.editorialText}>
        <HeroTitle sf={sf} color={colors.text} size={26} serif align="center" upper />
        {sf.store.description ? (
          <Text style={[styles.heroSub, { textAlign: 'center', color: '#4A433E' }]} numberOfLines={2}>
            {sf.store.description}
          </Text>
        ) : null}
        <View style={{ alignItems: 'center', marginTop: 6 }}>
          <HeroCta label={sf.template.heroCta} bg={palette.accent} fg={palette.onAccent} onPress={onExplore} />
        </View>
      </Animated.View>
      <InfoBar {...props} />
    </View>
  );
}

/* ------------------------------------------------- 2. Mode & Accessoires */

function OverlayHero(props: Props) {
  const { sf, width, topInset, onExplore, onBack } = props;
  const { palette } = sf;
  const h = Math.round(width * sf.template.heroRatio) + topInset;
  return (
    <View>
      <HeroSlider images={sf.heroImages} width={width} height={h} palette={palette} dotsBottom={44}>
        <LinearGradient
          colors={['rgba(28,16,8,0.62)', 'rgba(28,16,8,0.1)', 'rgba(28,16,8,0.25)', 'rgba(28,16,8,0.82)']}
          locations={[0, 0.32, 0.55, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={{ paddingTop: topInset }}>
          <TopBar sf={sf} ink={LIGHT_INK} center onBack={onBack} onSearch={onExplore}>
            <Brand sf={sf} ink={LIGHT_INK} subInk="rgba(255,249,241,0.78)" serif size={24} />
          </TopBar>
        </View>
        <View style={styles.overlayText}>
          <HeroTitle sf={sf} color={LIGHT_INK} size={34} serif />
          <HeroCta label={sf.template.heroCta} bg="#F3DDBF" fg="#3A2414" onPress={onExplore} />
        </View>
      </HeroSlider>
      <SheetCap />
      <InfoBar {...props} />
    </View>
  );
}

/* ------------------------------------------- 4. Électronique (version d'origine) */

function StackedHero({ sf, width, onContact, onShare }: Props) {
  const { store, template, palette, settings } = sf;
  const h = Math.round(width * template.heroRatio);
  return (
    <View>
      <HeroSlider images={sf.heroImages} width={width} height={h} palette={palette} dotsBottom={14}>
        <LinearGradient colors={['rgba(0,0,0,0.38)', 'rgba(0,0,0,0)', 'rgba(20,22,26,0.9)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      </HeroSlider>
      <View style={styles.darkBlock}>
        <Animated.View entering={FadeInDown.delay(80).springify().damping(18)} style={styles.identity}>
          <StoreAvatar store={store} size={68} />
          <View style={{ gap: 5 }}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { fontFamily: fonts.extrabold, fontSize: 27, lineHeight: 32, color: LIGHT_INK }]} numberOfLines={2} accessibilityRole="header">
                {store.name}
              </Text>
              {store.verified && <BadgeCheck size={20} color="#FFE3B8" strokeWidth={2} accessibilityLabel="Boutique vérifiée" />}
            </View>
            {settings.tagline ? <Text style={[styles.tagline, { color: 'rgba(255,249,241,0.9)' }]}>{settings.tagline}</Text> : null}
            <View style={styles.metaRow}>
              {store.reviewsCount > 0 && <Star size={12} color="#FFE3B8" fill="#FFE3B8" />}
              <Text style={[styles.meta, { color: 'rgba(255,249,241,0.82)' }]} numberOfLines={1}>
                {metaText(sf)}
              </Text>
            </View>
          </View>
        </Animated.View>
        <ActionRow sf={sf} onContact={onContact} onShare={onShare} dark />
      </View>
      <PendingNotice sf={sf} />
    </View>
  );
}

/* ------------------------------------------ 5. Alimentation (version d'origine) */

function Service({ icon, label, soft }: { icon: ReactNode; label: string; soft: string }) {
  return (
    <View style={[styles.service, { backgroundColor: soft }]}>
      {icon}
      <Text style={styles.serviceText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function InsetHero({ sf, width, topInset, onContact, onShare }: Props) {
  const { store, template, palette, settings } = sf;
  const bw = width - spacing.screen * 2;
  const bh = Math.round(bw * template.heroRatio);
  return (
    <View style={{ paddingTop: topInset + 60 }}>
      <View style={[styles.insetCard, { width: bw, height: bh, borderRadius: template.radius + 4 }]}>
        <HeroSlider images={sf.heroImages} width={bw} height={bh} palette={palette} dotsBottom={10}>
          {settings.tagline ? (
            <>
              <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
              <Text style={styles.insetTagline} numberOfLines={2}>
                {settings.tagline}
              </Text>
            </>
          ) : null}
        </HeroSlider>
      </View>
      <View style={styles.insetIdentity}>
        <StoreAvatar store={store} size={56} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { fontFamily: fonts.extrabold, fontSize: 23, lineHeight: 28, color: colors.text }]} numberOfLines={1} accessibilityRole="header">
              {store.name}
            </Text>
            {store.verified && <BadgeCheck size={19} color={palette.accentInk} strokeWidth={2} accessibilityLabel="Boutique vérifiée" />}
          </View>
          <View style={styles.metaRow}>
            {store.reviewsCount > 0 && <Star size={12} color={palette.accent} fill={palette.accent} />}
            <Text style={styles.meta} numberOfLines={1}>
              {metaText(sf)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.services}>
        <Service icon={<MapPin size={14} color={palette.accentInk} strokeWidth={2} />} label={store.city || 'Ville'} soft={palette.accentSoft} />
        <Service icon={<Truck size={14} color={palette.accentInk} strokeWidth={2} />} label={store.delivery} soft={palette.accentSoft} />
      </View>
      <ActionRow sf={sf} onContact={onContact} onShare={onShare} style={styles.infoActions} />
      <PendingNotice sf={sf} />
    </View>
  );
}

/* --------------------------------------------------------- 6. Généraliste */

/** Couleur hexadécimale avec transparence (dégradés aux couleurs de la boutique). */
function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function BannerHero(props: Props) {
  const { sf, width, topInset, onExplore, onBack } = props;
  const { palette } = sf;
  const h = Math.round(width * sf.template.heroRatio);
  // Tons chauds (terracotta) : la barre et le voile de la photo reprennent la couleur de la boutique.
  return (
    <View>
      <View style={{ paddingTop: topInset, backgroundColor: palette.accentSoft }}>
        <TopBar sf={sf} ink={palette.accentInk} center onBack={onBack} onSearch={onExplore}>
          <Brand sf={sf} ink={palette.accentInk} subInk={withAlpha(palette.accentInk, 0.75)} size={21} />
        </TopBar>
        <View style={{ height: 8 }} />
      </View>
      <HeroSlider images={sf.heroImages} width={width} height={h} palette={palette} dots="dark" focusX={0.7}>
        <LinearGradient
          colors={[withAlpha(palette.accentSoft, 0.97), withAlpha(palette.accentSoft, 0.8), withAlpha(palette.accentSoft, 0)]}
          locations={[0, 0.42, 0.78]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={[styles.bannerText, { width: width * 0.58 }]}>
          <HeroTitle sf={sf} color={palette.accentInk} size={29} serif />
          <HeroCta label={sf.template.heroCta} bg={palette.accent} fg={palette.onAccent} onPress={onExplore} />
        </View>
      </HeroSlider>
      <InfoBar {...props} />
    </View>
  );
}

/* ------------------------------------------------ 3. Beauté (inchangé) */

function CenteredHero({ sf, width, onContact, onShare }: Props) {
  const { store, template, palette, settings } = sf;
  const bannerHeight = Math.round(width * template.heroRatio);

  const actions = <ActionRow sf={sf} onContact={onContact} onShare={onShare} style={{ paddingHorizontal: spacing.lg }} />;

  return (
    <View>
      <View style={[styles.centeredBanner, { width, height: bannerHeight }]}>
        <HeroSlider images={sf.heroImages} width={width} height={bannerHeight} palette={palette} dotsBottom={34}>
          <LinearGradient colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0)']} locations={[0, 0.35]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        </HeroSlider>
      </View>
      <LinearGradient colors={[palette.accentSoft, colors.background]} locations={[0, 1]} style={styles.centeredBody}>
        <View style={styles.centeredLogo}>
          <StoreAvatar store={store} size={92} />
        </View>
        <Animated.View entering={FadeInDown.delay(80).springify().damping(18)} style={[styles.identity, { alignItems: 'center' }]}>
          <View style={[styles.nameRow, { justifyContent: 'center' }]}>
            <Text style={[styles.name, { fontFamily: fonts.serif, color: colors.text, fontSize: 31, lineHeight: 37, textAlign: 'center' }]} numberOfLines={2} accessibilityRole="header">
              {store.name}
            </Text>
            {store.verified && <BadgeCheck size={20} color={palette.accentInk} strokeWidth={2} accessibilityLabel="Boutique vérifiée" />}
          </View>
          {settings.tagline ? <Text style={[styles.tagline, { textAlign: 'center' }]}>{settings.tagline}</Text> : null}
          <View style={[styles.metaRow, { justifyContent: 'center' }]}>
            {store.reviewsCount > 0 && <Star size={12} color={palette.accentInk} fill={palette.accentInk} />}
            <Text style={styles.meta} numberOfLines={1}>
              {metaText(sf)}
            </Text>
          </View>
        </Animated.View>
        {actions}
      </LinearGradient>
      <PendingNotice sf={sf} />
    </View>
  );
}

function ActionButton({ icon, label, onPress, dark }: { icon: ReactNode; label: string; onPress: () => void; dark?: boolean }) {
  return (
    <PressableScale
      onPress={() => {
        haptics.light();
        onPress();
      }}
      activeScale={0.95}
      accessibilityRole="button"
      style={[styles.secondary, dark && { backgroundColor: '#1F232A', borderColor: '#2A2F37' }]}
    >
      {icon}
      <Text style={[styles.secondaryText, dark && { color: LIGHT_INK }]}>{label}</Text>
    </PressableScale>
  );
}

/** « Suivre » aux couleurs de la boutique. */
export function FollowStoreButton({
  storeId,
  accent,
  onAccent,
  dark,
  compact,
  style,
}: {
  storeId: string;
  accent: string;
  onAccent: string;
  dark?: boolean;
  compact?: boolean;
  style?: object;
}) {
  const following = useShop((s) => !!s.followedStores[storeId]);
  const toggleFollow = useShop((s) => s.toggleFollow);
  return (
    <PressableScale
      onPress={() => {
        haptics.medium();
        toggleFollow(storeId);
      }}
      activeScale={0.95}
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      style={[
        styles.follow,
        compact && styles.followCompact,
        following ? { backgroundColor: dark ? '#1F232A' : colors.surface, borderColor: accent, borderWidth: 1.5 } : { backgroundColor: accent },
        style,
      ]}
    >
      {following ? <Check size={16} color={dark ? LIGHT_INK : accent} strokeWidth={2.4} /> : <Plus size={16} color={onAccent} strokeWidth={2.4} />}
      <Text style={[styles.followText, compact && { fontSize: 14 }, { color: following ? (dark ? LIGHT_INK : accent) : onAccent }]}>{following ? 'Suivie' : 'Suivre'}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Barre du haut
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, minHeight: 54 },
  barTitle: { flex: 1, justifyContent: 'center' },
  barIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  barIconGlass: { backgroundColor: 'rgba(0,0,0,0.22)' },
  cartBadge: { position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontFamily: fonts.bold, fontSize: 10.5, color: colors.white },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
  brandSub: { fontFamily: fonts.medium, fontSize: 11.5, letterSpacing: 0.2 },

  // Bannières
  heroSub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  cta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, height: 46, paddingHorizontal: 22, borderRadius: radii.pill, ...shadows.button },
  ctaText: { fontFamily: fonts.bold, fontSize: 14.5 },
  sheetCap: { height: 26, marginTop: -26, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.background },

  editorialName: { fontFamily: fonts.serif, color: colors.text, letterSpacing: -0.4 },
  collageBig: { position: 'absolute', left: spacing.screen, top: 0, overflow: 'hidden' },
  collageSmall: { position: 'absolute', right: spacing.screen, overflow: 'hidden', borderWidth: 5, borderColor: colors.background, backgroundColor: colors.backgroundAlt, ...shadows.card },
  script: { position: 'absolute', left: spacing.screen + 8, bottom: 6, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 34, letterSpacing: -0.5 },
  editorialText: { paddingHorizontal: spacing.screen + 8, paddingTop: 18, gap: 10 },

  overlayText: { position: 'absolute', left: spacing.screen + 4, right: spacing.screen + 4, bottom: 70, gap: 16 },

  darkBlock: {
    backgroundColor: DARK_BG,
    paddingHorizontal: spacing.screen + 2,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  insetCard: { alignSelf: 'center', overflow: 'hidden', backgroundColor: colors.backgroundAlt },
  insetTagline: { position: 'absolute', left: 18, right: 18, bottom: 26, fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 27, color: LIGHT_INK, letterSpacing: -0.4 },
  insetIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.screen, paddingTop: 16 },
  services: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.screen, paddingTop: 12 },
  service: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, height: 32, borderRadius: radii.pill },
  serviceText: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 12.5, color: colors.text },

  bannerText: { position: 'absolute', left: spacing.screen + 4, top: 0, bottom: 30, justifyContent: 'center', gap: 16 },

  // Barre d'informations
  infoMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.screen, paddingTop: 14 },
  infoActions: { paddingHorizontal: spacing.screen, paddingTop: 12 },
  pending: { backgroundColor: '#F6E8D6', paddingVertical: 9, paddingHorizontal: spacing.screen, marginTop: 14 },
  pendingText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.chocolate, textAlign: 'center' },

  // Beauté
  identity: { gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { letterSpacing: -0.6, flexShrink: 1 },
  tagline: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: '#3A3430' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { fontFamily: fonts.medium, fontSize: 12.5, letterSpacing: 0.1, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: 8 },
  centeredBanner: { borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden', backgroundColor: colors.backgroundAlt },
  centeredBody: { marginTop: -24, paddingTop: 0, paddingBottom: 6, gap: 16, alignItems: 'stretch', paddingHorizontal: spacing.screen },
  centeredLogo: { alignSelf: 'center', marginTop: -28, borderRadius: 60, padding: 4, backgroundColor: colors.background },
  follow: { flex: 1.15, height: 46, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  followCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', height: 40, paddingHorizontal: 16 },
  followText: { fontFamily: fonts.bold, fontSize: 15 },
  secondary: {
    flex: 1,
    height: 46,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
});
