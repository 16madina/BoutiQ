import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii, spacing } from '@/theme';

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Feuille qui glisse du bas (Contacter, Partager, Filtres de la vitrine). */
export function StoreSheet({ visible, title, subtitle, onClose, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal>
          <View style={styles.grabber} />
          <View style={styles.head}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <ScrollView bounces={false} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Ligne d'action d'une feuille : icône, libellé simple, détail. */
export function SheetAction({
  icon,
  label,
  detail,
  onPress,
  tint,
}: {
  icon: ReactNode;
  label: string;
  detail?: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.actionIcon, tint ? { backgroundColor: tint } : null]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionLabel}>{label}</Text>
        {detail ? <Text style={styles.actionDetail}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(25,25,25,0.38)' },
  sheet: {
    maxHeight: '86%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingTop: 8,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.champagne, marginBottom: 6 },
  head: { paddingHorizontal: spacing.xl, paddingTop: 8, paddingBottom: 6, gap: 4 },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  body: { paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: 8, gap: 10 },
  footer: { paddingHorizontal: spacing.xl, paddingTop: 12 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
  },
  actionLabel: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text },
  actionDetail: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
