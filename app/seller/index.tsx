import { router, type Href } from 'expo-router';
import {
  ChartColumn,
  Check,
  ChevronRight,
  Eye,
  MessageCircle,
  Package,
  ReceiptText,
  Share2,
  Store as StoreIcon,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toPublicStore } from '@/api/sellerCatalog';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { PressableScale } from '@/components/PressableScale';
import { STATUS_META, StatusBadge } from '@/components/seller/StatusBadge';
import { SpaceSwitchPill } from '@/components/seller/SpaceSwitch';
import { StoreAvatar } from '@/components/StoreAvatar';
import { shareOnWhatsApp, storeShareMessage } from '@/config/links';
import { useSeller } from '@/store/useSeller';
import { colors, fonts, radii, shadows, spacing, typography } from '@/theme';
import { formatCount, formatFCFA } from '@/utils/format';
import { haptics } from '@/utils/haptics';

function Kpi({ icon: Icon, label, value, delay }: { icon: LucideIcon; label: string; value: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380)} style={styles.kpi}>
      <View style={styles.kpiIcon}>
        <Icon size={17} color={colors.cognac} strokeWidth={1.8} />
      </View>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </Animated.View>
  );
}

function ChecklistItem({ done, label, onPress }: { done: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={done} style={({ pressed }) => [styles.checkRow, pressed && { opacity: 0.6 }]}>
      <View style={[styles.checkCircle, done && styles.checkCircleDone]}>{done && <Check size={13} color={colors.white} strokeWidth={3} />}</View>
      <Text style={[styles.checkLabel, done && styles.checkLabelDone]}>{label}</Text>
      {!done && <ChevronRight size={17} color={colors.textSecondary} />}
    </Pressable>
  );
}

/** Tableau de bord vendeur. */
export default function SellerDashboard() {
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const store = useSeller((s) => s.store);
  const products = useSeller((s) => s.products);
  const views = useSeller((s) => s.storeViews);
  if (!store) return null;

  const publicStore = toPublicStore(store);
  const published = products.filter((p) => p.status === 'published').length;
  const status = STATUS_META[store.status];
  const checklist = [
    { done: !!store.logo && !!store.banner, label: 'Ajouter un logo et une bannière', href: '/seller/settings' as Href },
    { done: published >= 3, label: `Publier 3 produits (${Math.min(published, 3)}/3)`, href: '/product-editor' as Href },
    { done: store.status === 'verified' || store.status === 'pending_review', label: 'Faire vérifier ma boutique', href: '/verification' as Href },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: bottomSpace + 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <StoreAvatar store={publicStore} size={48} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.storeName} numberOfLines={1}>
            {store.name}
          </Text>
          <StatusBadge status={store.status} />
        </View>
        <SpaceSwitchPill to="buyer" />
      </View>

      {/* Action principale, toujours en tête */}
      <Animated.View entering={FadeInDown.duration(380)} style={styles.section}>
        <PressableScale
          onPress={() => {
            haptics.medium();
            router.push('/product-editor');
          }}
          style={styles.addCard}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un produit"
        >
          <View style={styles.addIcon}>
            <Text style={styles.addPlus}>+</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addTitle}>Ajouter un produit</Text>
            <Text style={styles.addText}>Photos, prix, c’est en ligne en 1 minute</Text>
          </View>
          <ChevronRight size={20} color="#EAD5BC" />
        </PressableScale>
      </Animated.View>

      {store.status !== 'verified' && (
        <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.section}>
          <Pressable onPress={() => router.push('/verification')} style={[styles.verifyCard, { backgroundColor: status.bg }]}>
            <status.icon size={22} color={status.fg} strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.verifyTitle, { color: status.fg }]}>
                {store.status === 'draft' ? 'Activez les ventes et paiements' : status.label}
              </Text>
              <Text style={styles.verifyText}>{store.status === 'rejected' && store.rejectionReason ? store.rejectionReason : status.message}</Text>
            </View>
            <ChevronRight size={18} color={status.fg} />
          </Pressable>
        </Animated.View>
      )}

      <View style={[styles.section, styles.kpis]}>
        <Kpi icon={Wallet} label="Ventes" value={formatFCFA(0)} delay={100} />
        <Kpi icon={ReceiptText} label="Commandes" value="0" delay={140} />
        <Kpi icon={Eye} label="Vues de la vitrine" value={formatCount(views)} delay={180} />
        <Kpi icon={Package} label="Produits en ligne" value={`${published}/${products.length}`} delay={220} />
      </View>

      {doneCount < checklist.length && (
        <Animated.View entering={FadeInDown.delay(240).duration(380)} style={[styles.section, styles.card]}>
          <View style={styles.cardHeader}>
            <Text style={typography.h3}>Bien démarrer</Text>
            <Text style={styles.progress}>
              {doneCount}/{checklist.length}
            </Text>
          </View>
          {checklist.map((c) => (
            <ChecklistItem key={c.label} done={c.done} label={c.label} onPress={() => router.push(c.href)} />
          ))}
        </Animated.View>
      )}

      <View style={[styles.section, styles.quick]}>
        <PressableScale onPress={() => router.push({ pathname: '/store/[id]', params: { id: store.slug } })} style={styles.quickItem}>
          <StoreIcon size={20} color={colors.cognac} strokeWidth={1.7} />
          <Text style={styles.quickText}>Voir ma vitrine</Text>
        </PressableScale>
        <PressableScale onPress={() => shareOnWhatsApp(storeShareMessage(store.name, store.slug))} style={styles.quickItem}>
          <MessageCircle size={20} color={colors.cognac} strokeWidth={1.7} />
          <Text style={styles.quickText}>WhatsApp</Text>
        </PressableScale>
        <PressableScale onPress={() => router.push('/seller/settings')} style={styles.quickItem}>
          <Share2 size={20} color={colors.cognac} strokeWidth={1.7} />
          <Text style={styles.quickText}>Mon lien</Text>
        </PressableScale>
      </View>

      <View style={[styles.section, styles.card]}>
        <View style={styles.cardHeader}>
          <Text style={typography.h3}>Statistiques</Text>
          <ChartColumn size={18} color={colors.textSecondary} strokeWidth={1.7} />
        </View>
        <Text style={styles.statsEmpty}>
          Vos ventes et visites des 30 derniers jours s’afficheront ici dès vos premières commandes.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.screen },
  storeName: { fontFamily: fonts.bold, fontSize: 19, color: colors.text },
  section: { marginHorizontal: spacing.screen, marginTop: spacing.lg },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: radii.xl,
    backgroundColor: colors.buttonPrimary,
    ...shadows.card,
  },
  addIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center' },
  addPlus: { fontFamily: fonts.regular, fontSize: 30, lineHeight: 34, color: colors.white },
  addTitle: { fontFamily: fonts.bold, fontSize: 17.5, color: colors.white },
  addText: { fontFamily: fonts.regular, fontSize: 13, color: '#D9BFA3', marginTop: 2 },
  verifyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radii.lg },
  verifyTitle: { fontFamily: fonts.bold, fontSize: 15 },
  verifyText: { fontFamily: fonts.regular, fontSize: 13, color: '#4A433E', marginTop: 2, lineHeight: 18 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: {
    width: '48.5%',
    flexGrow: 1,
    flexBasis: '45%',
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.soft,
  },
  kpiIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  kpiLabel: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
  card: { padding: 16, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  progress: { fontFamily: fonts.semibold, fontSize: 13, color: colors.caramel },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  checkCircleDone: { backgroundColor: colors.caramel, borderColor: colors.caramel },
  checkLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 14.5, color: colors.text },
  checkLabelDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  quick: { flexDirection: 'row', gap: 10 },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.backgroundAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  quickText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.chocolate },
  statsEmpty: { ...typography.caption, fontSize: 13.5, lineHeight: 19 },
});
