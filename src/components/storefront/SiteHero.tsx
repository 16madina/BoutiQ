import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, BadgeCheck, Check, ChevronLeft, MessageCircle, Pencil, Plus, Search, Share2, ShoppingCart, Truck, Wallet, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { Storefront } from '@/api/storefront';
import { PressableScale } from '@/components/PressableScale';
import { StoreAvatar } from '@/components/StoreAvatar';
import { HeroSlider } from '@/components/storefront/HeroSlider';
import { useCartCount, useShop } from '@/store/useShop';
import { colors, fonts, radii, shadows, spacing } from '@/theme';
import type { SiteStyle } from '@/types/storefront';
import { formatCount } from '@/utils/format';
import { haptics } from '@/utils/haptics';

/**
 * Vitrines « comme un site web » : barre d'annonce, en-tête avec logo et menu,
 * grande bannière avec accroche et bouton, puis une bande de confiance.
 * Chaque modèle a sa propre mise en scène (voir SiteStyle) :
 *   fresh      Alimentation   photo plein écran, texte en bas à gauche
 *   editorial  Éditorial      façon magazine : grand titre centré, photo encadrée
 *   fashion    Mode           photo très haute sous un en-tête transparent
 *   soft       Beauté         photo arrondie, carte blanche posée dessus
 *   tech       Électronique   en-tête et bannière sombres, bouton coloré
 *   warm       Généraliste    panneau à la couleur de la boutique posé sur la photo
 */

export type SiteSection = 'home' | 'products' | 'about' | 'contact';

const MENU: { id: SiteSection; label: string }[] = [
  { id: 'home', label: 'Accueil' },
  { id: 'products', label: 'Produits' },
  { id: 'about', label: 'À propos' },
  { id: 'contact', label: 'Contact' },
];

const NIGHT = '#16110D';
const TECH = '#14161A';
const CREAM = '#FFF9F1';

interface Theme {
  bg: string;
  ink: string;
  sub: string;
  line: string;
  /** Couleur du trait sous la rubrique active, des icônes de confiance, etc. */
  mark: string;
  serif: boolean;
  centered: boolean;
  upper: boolean;
  dark: boolean;
  logo: boolean;
}

/** Une couleur trop sombre ne se voit pas sur fond sombre : on prend alors l'encre claire. */
function visibleOnDark(hex: string, fallback: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum < 0.22 ? fallback : hex;
}

export function siteStyleOf(sf: Storefront): SiteStyle {
  return sf.template.siteStyle ?? 'fresh';
}

/** En-tête sombre : l'heure et la batterie passent en blanc. */
export function siteIsDark(sf: Storefront) {
  const style = siteStyleOf(sf);
  return style === 'fashion' || style === 'tech';
}

function themeOf(sf: Storefront, overPhoto = false): Theme {
  const { palette } = sf;
  const light = { ink: colors.text, sub: colors.textSecondary, line: colors.border, mark: palette.accent, upper: false, dark: false };
  switch (siteStyleOf(sf)) {
    case 'editorial':
      return { ...light, bg: colors.background, mark: palette.accentInk, serif: true, centered: true, logo: false };
    case 'fashion':
      return {
        bg: overPhoto ? 'transparent' : NIGHT,
        ink: CREAM,
        sub: 'rgba(255,249,241,0.72)',
        line: 'rgba(255,255,255,0.2)',
        mark: CREAM,
        serif: true,
        centered: true,
        upper: true,
        dark: true,
        logo: false,
      };
    case 'soft':
      return { ...light, bg: palette.accentSoft, mark: palette.accentInk, line: 'rgba(25,25,25,0.08)', serif: true, centered: false, logo: true };
    case 'tech':
      return {
        bg: TECH,
        ink: '#F4F6F8',
        sub: 'rgba(244,246,248,0.62)',
        line: 'rgba(255,255,255,0.12)',
        mark: visibleOnDark(palette.accent, '#F4F6F8'),
        serif: false,
        centered: false,
        upper: false,
        dark: true,
        logo: true,
      };
    case 'warm':
      return { ...light, bg: colors.background, serif: true, centered: false, logo: true };
    default:
      return { ...light, bg: colors.surface, serif: false, centered: false, logo: true };
  }
}

/** Couleur de l'en-tête fixe (et de la zone de l'heure au-dessus). */
export function siteNavBackground(sf: Storefront) {
  return themeOf(sf).bg;
}

/* ------------------------------------------------------------- En-tête */

interface NavProps {
  sf: Storefront;
  active: SiteSection;
  onNavigate: (section: SiteSection) => void;
  onSearch?: () => void;
  onBack?: () => void;
  /** Accueil de l'espace vendeur : le retour devient un crayon « Personnaliser ». */
  owner?: boolean;
  /** En-tête posé sur la photo (modèle Mode) : fond transparent. */
  overPhoto?: boolean;
}

function NavIcon({ icon: Icon, label, onPress, color, size = 20 }: { icon: LucideIcon; label: string; onPress?: () => void; color: string; size?: number }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.navIcon, pressed && { opacity: 0.55 }]}>
      <Icon size={size} color={color} strokeWidth={1.8} />
    </Pressable>
  );
}

/** En-tête du site : logo, nom, recherche, panier, puis le menu. Sert aussi de barre fixe au défilement. */
export function SiteNav({ sf, active, onNavigate, onSearch, onBack, owner, overPhoto }: NavProps) {
  const { store, palette } = sf;
  const t = themeOf(sf, overPhoto);
  const cart = useCartCount();
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View style={{ backgroundColor: t.bg }}>
      <View style={styles.navTop}>
        <NavIcon icon={owner ? Pencil : ChevronLeft} size={owner ? 18 : 23} color={t.ink} label={owner ? 'Personnaliser ma boutique' : 'Retour'} onPress={goBack} />
        {/* Nom centré : un espace à gauche équilibre les deux icônes de droite. */}
        {t.centered && <View style={{ width: 40 }} />}
        <Pressable onPress={() => onNavigate('home')} style={[styles.brand, t.centered && { justifyContent: 'center', paddingLeft: 0 }]} accessibilityRole="header">
          {t.logo && <StoreAvatar store={store} size={30} />}
          <Text
            style={[
              styles.brandName,
              { color: t.ink },
              t.serif && { fontFamily: fonts.serif, fontSize: 20, letterSpacing: -0.2 },
              t.upper && { fontSize: 16, letterSpacing: 2.4, textTransform: 'uppercase' },
            ]}
            numberOfLines={1}
          >
            {store.name}
          </Text>
          {store.verified && <BadgeCheck size={16} color={t.dark ? t.ink : palette.accentInk} strokeWidth={2} accessibilityLabel="Boutique vérifiée" />}
        </Pressable>
        <NavIcon icon={Search} color={t.ink} label={`Rechercher dans ${store.name}`} onPress={onSearch} />
        <View>
          <NavIcon icon={ShoppingCart} color={t.ink} label={`Panier, ${cart} article${cart > 1 ? 's' : ''}`} onPress={() => router.push('/cart')} />
          {cart > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: palette.accent }]} pointerEvents="none">
              <Text style={[styles.cartBadgeText, { color: palette.onAccent }]}>{cart > 99 ? '99+' : cart}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={[styles.menu, { borderBottomColor: t.line }, t.centered && { justifyContent: 'center' }]} accessibilityRole="tablist">
        {MENU.map((m) => {
          const on = m.id === active;
          return (
            <Pressable
              key={m.id}
              onPress={() => {
                haptics.selection();
                onNavigate(m.id);
              }}
              hitSlop={4}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={styles.menuItem}
            >
              <Text style={[styles.menuText, { color: on ? t.ink : t.sub }, on && { fontFamily: fonts.semibold }, t.upper && { fontSize: 12, letterSpacing: 1.3, textTransform: 'uppercase' }]}>
                {m.label}
              </Text>
              <View style={[styles.menuLine, on && { backgroundColor: t.mark }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------ Bannière */

interface Props {
  sf: Storefront;
  width: number;
  topInset: number;
  onContact: () => void;
  onShare: () => void;
  onExplore?: () => void;
  onBack?: () => void;
  owner?: boolean;
  /** Menu du site : Accueil, Produits, À propos, Contact. */
  onNavigate?: (section: SiteSection) => void;
}

function Cta({ label, bg, fg, border, square, onPress }: { label: string; bg: string; fg: string; border?: string; square?: boolean; onPress?: () => void }) {
  return (
    <PressableScale
      onPress={() => {
        haptics.light();
        onPress?.();
      }}
      activeScale={0.95}
      accessibilityRole="button"
      style={[styles.cta, { backgroundColor: bg }, border ? { borderWidth: 1.5, borderColor: border } : null, square && { borderRadius: 12 }]}
    >
      <Text style={[styles.ctaText, { color: fg }]}>{label}</Text>
      <ArrowRight size={17} color={fg} strokeWidth={2.2} />
    </PressableScale>
  );
}

function Trust({ icon: Icon, title, text, t }: { icon: LucideIcon; title: string; text: string; t: Theme & { icon: string } }) {
  return (
    <View style={styles.trustItem}>
      <Icon size={19} color={t.icon} strokeWidth={1.8} />
      <Text style={[styles.trustTitle, { color: t.ink }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.trustText, { color: t.sub }]} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

export function SiteHero({ sf, width, topInset, onContact, onShare, onExplore, onBack, owner, onNavigate }: Props) {
  const { store, template, palette, settings } = sf;
  const style = siteStyleOf(sf);
  const t = themeOf(sf);
  const following = useShop((s) => !!s.followedStores[store.id]);
  const toggleFollow = useShop((s) => s.toggleFollow);
  const navigate =
    onNavigate ??
    ((section: SiteSection) => {
      if (section === 'products') onExplore?.();
      if (section === 'contact') onContact();
    });

  const rayons = sf.collections.slice(0, 3).map((c) => c.name);
  const kicker = rayons.length ? rayons.join(' · ') : [store.city, store.country].filter(Boolean).join(', ');
  const title = settings.tagline || template.heroTitle;
  const meta =
    store.followers > 0 ? `${formatCount(store.followers)} abonné${store.followers > 1 ? 's' : ''}` : store.city ? `Boutique à ${store.city}` : 'Nouvelle boutique';
  const fallback = template.defaultHeroPhotoIds?.map((photoId) => ({ photoId }));
  const nav = (overPhoto?: boolean) => (
    <SiteNav sf={sf} active="home" onNavigate={navigate} onSearch={onExplore} onBack={onBack} owner={owner} overPhoto={overPhoto} />
  );
  const slider = (w: number, h: number, children?: ReactNode, dotsBottom = 18) => (
    <HeroSlider images={sf.heroImages} fallback={fallback} width={w} height={h} palette={palette} dotsBottom={dotsBottom}>
      {children}
    </HeroSlider>
  );
  const enter = FadeInDown.delay(80).duration(420);

  const announce = settings.promoMessage ? (
    <View style={[styles.announce, { backgroundColor: style === 'fashion' ? CREAM : palette.accent }]}>
      <Text style={[styles.announceText, { color: style === 'fashion' ? NIGHT : palette.onAccent }]} numberOfLines={1}>
        {settings.promoMessage}
      </Text>
    </View>
  ) : null;

  let hero: ReactNode;
  // Le haut de l'écran (heure, batterie) : couleur de fond derrière, sauf quand la photo monte jusqu'en haut.
  let top = topInset;

  if (style === 'editorial') {
    const w = width - spacing.screen * 2;
    hero = (
      <>
        {nav()}
        <Animated.View entering={enter} style={styles.editorialText}>
          {kicker ? <Text style={[styles.kicker, { color: palette.accentInk }]}>{kicker}</Text> : null}
          <Text style={[styles.serifTitle, { fontSize: 37, lineHeight: 43, color: colors.text, textAlign: 'center' }]} numberOfLines={3} accessibilityRole="header">
            {title}
          </Text>
          <View style={[styles.rule, { backgroundColor: palette.accentInk }]} />
          <Cta label={template.heroCta} bg="transparent" fg={palette.accentInk} border={palette.accentInk} onPress={onExplore} />
        </Animated.View>
        <View style={[styles.editorialPhoto, { width: w }]}>{slider(w, Math.min(Math.round(w * 1.08), 440), undefined, 14)}</View>
      </>
    );
  } else if (style === 'fashion') {
    // La photo monte sous l'en-tête transparent ; avec une annonce, elle commence juste après.
    const inner = announce ? 0 : topInset;
    top = announce ? topInset : 0;
    const h = Math.min(Math.round(width * 1.32), 580) + inner;
    hero = slider(
      width,
      h,
      <>
        <LinearGradient colors={['rgba(14,10,8,0.62)', 'rgba(14,10,8,0.05)', 'rgba(14,10,8,0.82)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={{ paddingTop: inner }}>{nav(true)}</View>
        <Animated.View entering={enter} style={styles.fashionText} pointerEvents="box-none">
          {kicker ? <Text style={[styles.kicker, { color: 'rgba(255,249,241,0.85)', letterSpacing: 2.2 }]}>{kicker}</Text> : null}
          <Text style={[styles.serifTitle, { fontSize: 40, lineHeight: 46, color: CREAM, textAlign: 'center' }]} numberOfLines={3} accessibilityRole="header">
            {title}
          </Text>
          <Cta label={template.heroCta} bg="rgba(255,249,241,0.08)" fg={CREAM} border={CREAM} onPress={onExplore} />
        </Animated.View>
      </>,
      20,
    );
  } else if (style === 'soft') {
    const h = Math.min(Math.round(width * 0.86), 400);
    hero = (
      <>
        {nav()}
        <View style={styles.softPhoto}>{slider(width, h, undefined, 74)}</View>
        <Animated.View entering={enter} style={[styles.softCard, { marginTop: -58 }]}>
          {kicker ? <Text style={[styles.kicker, { color: palette.accentInk }]}>{kicker}</Text> : null}
          <Text style={[styles.serifTitle, { fontSize: 27, lineHeight: 33, color: colors.text, textAlign: 'center' }]} numberOfLines={3} accessibilityRole="header">
            {title}
          </Text>
          <Cta label={template.heroCta} bg={palette.accent} fg={palette.onAccent} onPress={onExplore} />
        </Animated.View>
      </>
    );
  } else if (style === 'tech') {
    const h = Math.min(Math.round(width * 0.82), 390);
    const accent = visibleOnDark(palette.accent, '#F4F6F8');
    hero = (
      <>
        {nav()}
        {slider(
          width,
          h,
          <>
            <LinearGradient colors={['rgba(20,22,26,0.94)', 'rgba(20,22,26,0.55)', 'rgba(20,22,26,0.1)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <LinearGradient colors={['rgba(20,22,26,0)', TECH]} locations={[0.7, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <Animated.View entering={enter} style={styles.techText} pointerEvents="box-none">
              {kicker ? (
                <View style={[styles.techChip, { borderColor: accent }]}>
                  <Text style={[styles.techChipText, { color: accent }]} numberOfLines={1}>
                    {kicker}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.techTitle} numberOfLines={3} accessibilityRole="header">
                {title}
              </Text>
              <Cta label={template.heroCta} bg={accent} fg={accent === palette.accent ? palette.onAccent : TECH} square onPress={onExplore} />
            </Animated.View>
          </>,
          16,
        )}
      </>
    );
  } else if (style === 'warm') {
    const h = Math.min(Math.round(width * 0.88), 400);
    hero = (
      <>
        {nav()}
        {slider(width, h, undefined, 86)}
        <Animated.View entering={enter} style={[styles.warmPanel, { backgroundColor: palette.accent, marginTop: -72 }]}>
          {kicker ? <Text style={[styles.kicker, { color: palette.onAccent, opacity: 0.85 }]}>{kicker}</Text> : null}
          <Text style={[styles.serifTitle, { fontSize: 28, lineHeight: 34, color: palette.onAccent }]} numberOfLines={3} accessibilityRole="header">
            {title}
          </Text>
          <Cta label={template.heroCta} bg={palette.onAccent} fg={palette.onAccent === '#FFFFFF' ? palette.accentInk : '#FFFFFF'} onPress={onExplore} />
        </Animated.View>
      </>
    );
  } else {
    const h = Math.min(Math.round(width * 1.02), 460);
    hero = (
      <>
        {nav()}
        {slider(
          width,
          h,
          <>
            <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.72)']} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <Animated.View entering={enter} style={styles.freshText} pointerEvents="box-none">
              {kicker ? <Text style={[styles.kicker, { color: 'rgba(255,255,255,0.88)' }]}>{kicker}</Text> : null}
              <Text style={styles.freshTitle} numberOfLines={3} accessibilityRole="header">
                {title}
              </Text>
              <Cta label={template.heroCta} bg={colors.white} fg={palette.accentInk} onPress={onExplore} />
            </Animated.View>
          </>,
        )}
      </>
    );
  }

  // Bande de confiance et ligne « Suivre » : sombres sur le modèle Électronique, claires ailleurs.
  const band = style === 'tech' ? t : { ...t, bg: style === 'fresh' ? colors.surface : colors.background, ink: colors.text, sub: colors.textSecondary, line: colors.border, dark: false };
  const trustTheme = { ...band, icon: band.dark ? band.mark : palette.accentInk };

  return (
    <View style={{ paddingTop: top, backgroundColor: style === 'fashion' ? NIGHT : t.bg }}>
      {announce}
      {hero}

      <View style={[styles.trust, { backgroundColor: band.bg, borderBottomColor: band.line }, (style === 'soft' || style === 'warm' || style === 'editorial') && { marginTop: 6 }]}>
        <Trust icon={Truck} title="Livraison" text={store.delivery} t={trustTheme} />
        <View style={[styles.trustDivider, { backgroundColor: band.line }]} />
        <Trust icon={Wallet} title="Paiement" text="Mobile Money ou à la livraison" t={trustTheme} />
        {settings.contactPhone ? (
          <>
            <View style={[styles.trustDivider, { backgroundColor: band.line }]} />
            <Trust icon={MessageCircle} title="WhatsApp" text="Le vendeur vous répond" t={trustTheme} />
          </>
        ) : store.verified ? (
          <>
            <View style={[styles.trustDivider, { backgroundColor: band.line }]} />
            <Trust icon={BadgeCheck} title="Vérifiée" text="Boutique contrôlée par BoutiQ" t={trustTheme} />
          </>
        ) : null}
      </View>

      <View style={[styles.follow, { backgroundColor: band.dark ? band.bg : colors.background }]}>
        <Text style={[styles.meta, { color: band.sub }]} numberOfLines={1}>
          {meta}
        </Text>
        <PressableScale
          onPress={() => {
            haptics.medium();
            toggleFollow(store.id);
          }}
          activeScale={0.95}
          accessibilityRole="button"
          accessibilityState={{ selected: following }}
          style={[
            styles.followBtn,
            following
              ? { backgroundColor: band.dark ? 'transparent' : colors.surface, borderColor: band.dark ? band.mark : palette.accent }
              : { backgroundColor: band.dark ? band.mark : palette.accent, borderColor: band.dark ? band.mark : palette.accent },
          ]}
        >
          {following ? (
            <Check size={15} color={band.dark ? band.mark : palette.accentInk} strokeWidth={2.4} />
          ) : (
            <Plus size={15} color={band.dark && band.mark !== palette.accent ? TECH : palette.onAccent} strokeWidth={2.4} />
          )}
          <Text style={[styles.followText, { color: following ? (band.dark ? band.mark : palette.accentInk) : band.dark && band.mark !== palette.accent ? TECH : palette.onAccent }]}>
            {following ? 'Suivie' : 'Suivre'}
          </Text>
        </PressableScale>
        <Pressable
          onPress={onShare}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Partager la boutique"
          style={({ pressed }) => [styles.share, band.dark && { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: band.line }, pressed && { opacity: 0.6 }]}
        >
          <Share2 size={17} color={band.ink} strokeWidth={1.8} />
        </Pressable>
      </View>

      {store.salesEnabled === false && (
        <View style={styles.pending}>
          <Text style={styles.pendingText}>Boutique en cours de vérification · achats bientôt disponibles</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  announce: { paddingVertical: 7, paddingHorizontal: spacing.screen, alignItems: 'center' },
  announceText: { fontFamily: fonts.semibold, fontSize: 12.5, letterSpacing: 0.1 },

  navTop: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, height: 52 },
  navIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 2 },
  brandName: { flexShrink: 1, fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: -0.4 },
  cartBadge: { position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontFamily: fonts.bold, fontSize: 10.5 },
  menu: { flexDirection: 'row', gap: 22, paddingHorizontal: spacing.screen, borderBottomWidth: StyleSheet.hairlineWidth },
  menuItem: { paddingTop: 6, gap: 7 },
  menuText: { fontFamily: fonts.medium, fontSize: 14 },
  menuLine: { height: 2.5, borderRadius: 2, backgroundColor: 'transparent' },

  kicker: { fontFamily: fonts.semibold, fontSize: 12.5, letterSpacing: 1.1, textTransform: 'uppercase' },
  serifTitle: { fontFamily: fonts.serif, letterSpacing: -0.4 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 20, borderRadius: radii.pill, marginTop: 4 },
  ctaText: { fontFamily: fonts.bold, fontSize: 15 },

  // Alimentation
  freshText: { position: 'absolute', left: spacing.screen, right: spacing.screen, bottom: 44, gap: 10, alignItems: 'flex-start' },
  freshTitle: { fontFamily: fonts.extrabold, fontSize: 33, lineHeight: 38, letterSpacing: -0.9, color: colors.white },

  // Éditorial
  editorialText: { alignItems: 'center', gap: 12, paddingHorizontal: 28, paddingTop: 26, paddingBottom: 24 },
  rule: { width: 44, height: 1.5, opacity: 0.6 },
  editorialPhoto: { alignSelf: 'center', borderRadius: 6, overflow: 'hidden' },

  // Mode
  fashionText: { position: 'absolute', left: 24, right: 24, bottom: 54, gap: 12, alignItems: 'center' },

  // Beauté
  softPhoto: { borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' },
  softCard: {
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 22,
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 26,
    backgroundColor: colors.surface,
    ...shadows.card,
  },

  // Électronique
  techText: { position: 'absolute', left: spacing.screen, right: '24%', bottom: 40, gap: 12, alignItems: 'flex-start' },
  techChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  techChipText: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  techTitle: { fontFamily: fonts.extrabold, fontSize: 31, lineHeight: 36, letterSpacing: -0.9, color: '#F4F6F8' },

  // Généraliste
  warmPanel: { alignItems: 'flex-start', gap: 10, marginHorizontal: spacing.screen, marginBottom: 12, padding: 20, borderRadius: 20, ...shadows.card },

  trust: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  trustItem: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 6 },
  trustDivider: { width: StyleSheet.hairlineWidth, marginVertical: 4 },
  trustTitle: { fontFamily: fonts.bold, fontSize: 13, marginTop: 2 },
  trustText: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 15, textAlign: 'center' },

  follow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.screen, paddingVertical: 12 },
  meta: { flex: 1, fontFamily: fonts.medium, fontSize: 13 },
  followBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 15, borderRadius: radii.pill, borderWidth: 1.5 },
  followText: { fontFamily: fonts.bold, fontSize: 14 },
  share: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },

  pending: { backgroundColor: '#F6E8D6', paddingVertical: 9, paddingHorizontal: spacing.screen },
  pendingText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.chocolate, textAlign: 'center' },
});
