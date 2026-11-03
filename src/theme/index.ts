import { Platform, type ViewStyle } from 'react-native';

/** Palette officielle BoutiQ — ne pas modifier sans validation de la direction artistique. */
export const colors = {
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
} as const;

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
  tagline: { fontFamily: fonts.regular, fontSize: 13, color: '#2E2A27' },
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
      shadowColor: '#58351F',
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: y },
    },
    android: { elevation, shadowColor: '#58351F' },
    default: { boxShadow: `0px ${y}px ${radius * 2}px rgba(88,53,31,${opacity})` } as ViewStyle,
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
