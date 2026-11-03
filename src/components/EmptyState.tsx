import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts, radii, spacing, typography } from '@/theme';

interface Props {
  icon: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, message, actionLabel, onAction, compact }: Props) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={styles.iconWrap}>
        <Icon size={30} strokeWidth={1.5} color={colors.cognac} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: spacing.xxxl, paddingVertical: 56 },
  compact: { paddingVertical: spacing.xxl },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: radii.pill,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.h3, fontFamily: fonts.bold, textAlign: 'center' },
  message: { ...typography.caption, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  button: { marginTop: spacing.xl, alignSelf: 'stretch' },
});
