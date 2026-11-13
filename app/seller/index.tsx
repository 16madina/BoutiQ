import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Paintbrush, ReceiptText, type LucideIcon } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarSpace } from '@/components/FloatingTabBar';
import { PressableScale } from '@/components/PressableScale';
import { AddProductFab } from '@/components/seller/AddProductFab';
import { SpaceSwitchPill } from '@/components/seller/SpaceSwitch';
import { STATUS_META, StatusBadge } from '@/components/seller/StatusBadge';
import { StorefrontScreen } from '@/components/storefront/StorefrontScreen';
import { useSeller } from '@/store/useSeller';
import { useSellerOrders } from '@/store/useSellerOrders';
import { colors, fonts, radii } from '@/theme';
import { haptics } from '@/utils/haptics';

/**
 * Accueil de l'espace vendeur : la boutique elle-même, telle que les clients la voient.
 * Au-dessus, une fine barre réservée au vendeur (statut, modifier, commandes à traiter).
 */
export default function SellerHome() {
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  // Petit écran : le bouton « Modifier » garde seulement son icône, pour que le statut tienne sur une ligne.
  const narrow = useWindowDimensions().width < 390;
  const store = useSeller((s) => s.store);
  const productCount = useSeller((s) => s.products.length);

  // Commandes en attente de confirmation : rappel discret en haut de la boutique.
  const todo = useSellerOrders((s) => s.pending);
  useFocusEffect(
    useCallback(() => {
      useSellerOrders.getState().refresh();
    }, []),
  );

  if (!store) return null;
  const status = STATUS_META[store.status];
  const needsReview = store.status === 'draft' || store.status === 'rejected';

  return (
    <View style={styles.screen}>
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <View style={styles.barRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.kicker} numberOfLines={1}>
              Ma boutique en ligne
            </Text>
            <StatusBadge status={store.status} />
          </View>
          <PressableScale
            onPress={() => {
              haptics.light();
              router.push('/customize');
            }}
            activeScale={0.94}
            style={[styles.edit, narrow && styles.editNarrow]}
            accessibilityRole="button"
            accessibilityLabel="Modifier ma boutique"
          >
            <Paintbrush size={15} color={colors.white} strokeWidth={2} />
            {!narrow && <Text style={styles.editText}>Modifier</Text>}
          </PressableScale>
          <SpaceSwitchPill to="buyer" />
        </View>

        {todo > 0 ? (
          <Notice
            icon={ReceiptText}
            bg={colors.tint}
            fg={colors.chocolate}
            text={todo > 1 ? `${todo} commandes à traiter` : '1 commande à traiter'}
            onPress={() => router.navigate('/seller/orders')}
          />
        ) : needsReview ? (
          <Notice
            icon={status.icon}
            bg={status.bg}
            fg={status.fg}
            text={store.status === 'rejected' ? 'Des informations sont à corriger' : 'Faites vérifier la boutique pour vendre'}
            onPress={() => router.push('/verification')}
          />
        ) : null}
      </View>

      <StorefrontScreen id={store.slug} owner bottomInset={bottomSpace + (productCount > 0 ? 64 : 0)} />
      {productCount > 0 && <AddProductFab />}
    </View>
  );
}

function Notice({ icon: Icon, bg, fg, text, onPress }: { icon: LucideIcon; bg: string; fg: string; text: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.notice, { backgroundColor: bg }, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      <Icon size={16} color={fg} strokeWidth={2} />
      <Text style={[styles.noticeText, { color: fg }]} numberOfLines={1}>
        {text}
      </Text>
      <ChevronRight size={16} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 10,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 13, borderRadius: radii.pill, backgroundColor: colors.buttonPrimary },
  editNarrow: { width: 36, paddingHorizontal: 0, justifyContent: 'center' },
  editText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 40, borderRadius: radii.md },
  noticeText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13.5 },
});
