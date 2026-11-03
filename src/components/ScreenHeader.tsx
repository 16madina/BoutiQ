import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/CircleIconButton';
import { colors, spacing, typography } from '@/theme';

interface Props {
  title?: string;
  back?: boolean;
  right?: ReactNode;
  /** Titre aligné à gauche, grand format (écrans d'onglet) */
  large?: boolean;
}

/** En-tête des écrans secondaires, cohérent avec l'accueil. */
export function ScreenHeader({ title, back = true, right, large }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.row, { paddingTop: insets.top + spacing.sm }]}>
      {back ? (
        <CircleIconButton
          size={40}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityLabel="Retour"
        >
          <ChevronLeft size={22} strokeWidth={1.8} color={colors.text} />
        </CircleIconButton>
      ) : null}
      {title ? (
        <Text style={[large ? typography.h1 : typography.h3, styles.title, !back && { marginLeft: 0 }]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: { flex: 1 },
});
