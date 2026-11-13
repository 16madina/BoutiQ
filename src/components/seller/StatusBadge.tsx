import { BadgeCheck, Clock3, FilePen, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/theme';
import type { VerificationStatus } from '@/types/seller';

export const STATUS_META: Record<VerificationStatus, { label: string; icon: LucideIcon; fg: string; bg: string; message: string }> = {
  draft: {
    label: 'Non vérifiée',
    icon: FilePen,
    fg: colors.tabInactive,
    bg: colors.backgroundAlt,
    message: 'Votre boutique est visible. Faites-la vérifier pour activer les ventes et les paiements.',
  },
  pending_review: {
    label: 'Vérification en cours',
    icon: Clock3,
    fg: colors.cognac,
    bg: colors.tint,
    message: 'Notre équipe vérifie vos informations (24 à 48 h). Vous pouvez continuer à ajouter des produits.',
  },
  verified: {
    label: 'Boutique vérifiée',
    icon: BadgeCheck,
    fg: colors.success,
    bg: colors.successBg,
    message: 'Ventes et paiements activés. Vos produits apparaissent dans tout BoutiQ.',
  },
  rejected: {
    label: 'À corriger',
    icon: TriangleAlert,
    fg: colors.promo,
    bg: colors.dangerBg,
    message: 'Certaines informations doivent être corrigées avant l’activation des ventes.',
  },
};

export function StatusBadge({ status, size = 'sm' }: { status: VerificationStatus; size?: 'sm' | 'md' }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }, size === 'md' && styles.md]}>
      <Icon size={size === 'md' ? 15 : 13} color={meta.fg} strokeWidth={2} />
      <Text style={[styles.text, { color: meta.fg }, size === 'md' && { fontSize: 13.5 }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.pill },
  md: { paddingHorizontal: 12, paddingVertical: 6 },
  text: { fontFamily: fonts.semibold, fontSize: 12 },
});
