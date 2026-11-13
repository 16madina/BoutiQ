import { Appearance, Platform, type ViewStyle } from 'react-native';

import { readThemePreference, resolveScheme, type ThemePreference } from './preference';

/** Choix fait dans Paramètres → Apparence, lu une fois au démarrage. */
export const themePreference: ThemePreference = readThemePreference();
export const scheme = resolveScheme(themePreference);
export const isDark = scheme === 'dark';

// Thème forcé (Clair ou Sombre) : le clavier et les fenêtres du système suivent aussi.
if (Platform.OS !== 'web' && themePreference !== 'system') {
  try {
    Appearance.setColorScheme(themePreference);
  } catch {
    // Ancienne version du système : seules les couleurs de l'application changent.
  }
}

/** Palette officielle BoutiQ (mode clair) — ne pas modifier sans validation de la direction artistique. */
const light = {
  background: '#FAF6F0', // Ivoire chaleureux
  backgroundAlt: '#F5EDE3', // Crème
  surface: '#FFFCF8', // Blanc cassé
  white: '#FFFFFF',
  champagne: '#EAD5BC',
  sand: '#D9BFA3',
  caramel: '#B87A3D', // Accent principal
  gold: '#C9962E', // Or du logo BoutiQ (le « Q »)
  cognac: '#8A542C', // Accent secondaire
  chocolate: '#58351F',
  text: '#191919',
  textSecondary: '#746B64',
  textMuted: '#9A9089',
  tabInactive: '#3D3833',
  border: '#E9DED2',
  buttonPrimary: '#171717',
  promo: '#D83A35',
  favorite: '#D83A35',
  overlayLight: 'rgba(255,252,248,0.92)',
  skeleton: '#EFE5D9',
  skeletonHighlight: '#F7F0E7',

  // Teintes d'usage (elles changent avec le thème, contrairement à une couleur écrite en dur).
  /** Texte courant un peu adouci (descriptions). */
  textBody: '#3A3430',
  textSoft: '#4A433E',
  /** Fond des champs de saisie et des vignettes. */
  field: '#FFFFFF',
  /** Fond d'une photo pendant son chargement. */
  placeholder: '#F1E6D8',
  /** Aplat brun des éléments de marque (bulle, pastille, bannière) : texte clair dessus dans les deux thèmes. */
  accentFill: '#8A542C',
  /** Encadré doux (information, bouton secondaire). */
  tint: '#F6E8D6',
  tintSoft: '#FBF1E4',
  /** Réussite : encadré, icône, texte. */
  successBg: '#E7EFDF',
  success: '#3F6B3A',
  successText: '#2F5A2B',
  successBorder: '#7FA878',
  /** Alerte : encadré. */
  dangerBg: '#FCE9E7',
  /** Étiquette neutre (désactivé, annulé). */
  neutralBg: '#ECE7E1',
  neutralText: '#5E5650',
  /** Fond de l'écran, transparent (dégradés qui s'effacent). */
  backgroundClear: 'rgba(250,246,240,0)',
  backgroundVeil: 'rgba(250,246,240,0.85)',
  /** Voiles des surfaces « verre ». */
  glassFill: 'rgba(255,252,248,0.97)',
  glassVeil: 'rgba(250,246,240,0.72)',
  glassTint: 'rgba(250,246,240,0.55)',
};

type Palette = { [K in keyof typeof light]: string };

/**
 * Mode sombre : brun chocolat chaud (et non noir), dans les couleurs de la marque.
 * Mêmes rôles que la palette claire ; les accents caramel sont éclaircis pour rester lisibles.
 */
const dark: Palette = {
  background: '#2A1F18',
  backgroundAlt: '#33261D',
  surface: '#3A2C22',
  white: '#FFFFFF',
  champagne: '#6B523C',
  sand: '#7A5F47',
  caramel: '#D49A5B',
  gold: '#E0B64A',
  cognac: '#E8B47C',
  chocolate: '#F3E2CC',
  text: '#FBF4EA',
  textSecondary: '#CDBDAD',
  textMuted: '#A08E7D',
  tabInactive: '#DCCFC1',
  border: '#544234',
  // Boutons principaux : caramel (un bouton noir ne se verrait pas sur un fond foncé).
  buttonPrimary: '#C98A4B',
  promo: '#EC6A62',
  favorite: '#EC6A62',
  overlayLight: 'rgba(58,44,34,0.92)',
  skeleton: '#3F3026',
  skeletonHighlight: '#4A392D',

  textBody: '#EADFD2',
  textSoft: '#D6C8B9',
  field: '#30241B',
  accentFill: '#9A5E30',
  placeholder: '#43342A',
  tint: '#463528',
  tintSoft: '#3F3025',
  successBg: '#2F3A27',
  success: '#A2D29A',
  successText: '#BCE0B4',
  successBorder: '#5E8A57',
  dangerBg: '#4F2A26',
  neutralBg: '#44372D',
  neutralText: '#CDBDAD',
  backgroundClear: 'rgba(42,31,24,0)',
  backgroundVeil: 'rgba(42,31,24,0.85)',
  glassFill: 'rgba(52,39,30,0.97)',
  glassVeil: 'rgba(42,31,24,0.72)',
  glassTint: 'rgba(42,31,24,0.55)',
};

export const colors: Palette = isDark ? dark : light;

export const gradients = {
  logo: ['#C98A4B', '#8A542C', '#58351F'] as const,
  activeTab: ['#B87A3D', '#8A542C'] as const,
  bannerOverlay: ['rgba(88,53,31,0.95)', 'rgba(138,84,44,0.55)', 'rgba(138,84,44,0)'] as const,
};

/** Familles chargées dans app/_layout.tsx */
export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  extrabold: 'DMSans_800ExtraBold',
  serif: 'PlayfairDisplay_700Bold',
} as const;

export const typography = {
  brand: { fontFamily: fonts.extrabold, fontSize: 27, letterSpacing: -0.8, color: colors.text },
  tagline: { fontFamily: fonts.regular, fontSize: 13, color: colors.textBody },
  h1: { fontFamily: fonts.bold, fontSize: 26, letterSpacing: -0.5, color: colors.text },
  h2: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.3, color: colors.text },
  h3: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  bannerTitle: { fontFamily: fonts.serif, fontSize: 27, lineHeight: 31, color: '#FFF7EC' },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  productName: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.text },
  price: { fontFamily: fonts.bold, fontSize: 15.5, letterSpacing: -0.2, color: colors.text },
  oldPrice: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  caption: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  tabLabel: { fontFamily: fonts.medium, fontSize: 11.5 },
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  /** Marge latérale de l'écran */
  screen: 16,
  /** Espace entre colonnes de la grille masonry */
  gridGap: 10,
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 28,
  pill: 999,
} as const;

function shadow(opacity: number, radius: number, y: number, elevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: isDark ? '#000000' : '#58351F',
      shadowOpacity: isDark ? opacity * 3 : opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: y },
    },
    android: { elevation, shadowColor: isDark ? '#000000' : '#58351F' },
    default: { boxShadow: isDark ? `0px ${y}px ${radius * 2}px rgba(0,0,0,${opacity * 3})` : `0px ${y}px ${radius * 2}px rgba(88,53,31,${opacity})` } as ViewStyle,
  })!;
}

export const shadows = {
  none: {} as ViewStyle,
  soft: shadow(0.06, 8, 3, 2),
  card: shadow(0.08, 12, 4, 3),
  floating: shadow(0.14, 20, 8, 12),
  button: shadow(0.12, 6, 2, 3),
} as const;

export const layout = {
  tabBarHeight: 68,
  tabBarSideMargin: 10,
  headerButtonSize: 42,
  /** Largeur à partir de laquelle la grille passe à 3 colonnes (tablette / paysage). */
  threeColumnsBreakpoint: 700,
} as const;

export const theme = { colors, gradients, fonts, typography, spacing, radii, shadows, layout };
export type Theme = typeof theme;
