import { router, useFocusEffect, type Href } from 'expo-router';
import { Check, ChevronRight, Eye, Package, ReceiptText, Wallet, type LucideIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchDashboardStats, type DashboardStats } from '@/api/sellerSync';
import { useSeller } from '@/store/useSeller';
import { colors, fonts, radii, shadows, typography } from '@/theme';
import { formatCount, formatFCFA } from '@/utils/format';

function Kpi({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <View style={styles.kpiIcon}>
        <Icon size={17} color={colors.cognac} strokeWidth={1.8} />
      </View>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

/** Chiffres de la boutique (30 derniers jours) et liste « Bien démarrer ». */
export function StoreInsights() {
  const store = useSeller((s) => s.store);
  const products = useSeller((s) => s.products);
  const views = useSeller((s) => s.storeViews);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  useFocusEffect(
    useCallback(() => {
      fetchDashboardStats()
        .then(setStats)
        .catch(() => {});
    }, []),
  );
  if (!store) return null;

  const published = products.filter((p) => p.status === 'published').length;
  const checklist: { done: boolean; label: string; href: Href }[] = [
    { done: !!store.logo && !!store.banner, label: 'Ajouter un logo et une bannière', href: '/customize' },
    { done: published >= 3, label: `Publier 3 produits (${Math.min(published, 3)}/3)`, href: '/product-editor' },
    { done: store.status === 'verified' || store.status === 'pending_review', label: 'Faire vérifier ma boutique', href: '/verification' },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <View style={{ gap: 14 }}>
      {doneCount < checklist.length && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={typography.h3}>Bien démarrer</Text>
            <Text style={styles.progress}>
              {doneCount}/{checklist.length}
            </Text>
          </View>
          {checklist.map((c) => (
            <Pressable key={c.label} onPress={() => router.push(c.href)} disabled={c.done} style={({ pressed }) => [styles.checkRow, pressed && { opacity: 0.6 }]}>
              <View style={[styles.checkCircle, c.done && styles.checkCircleDone]}>{c.done && <Check size={13} color={colors.white} strokeWidth={3} />}</View>
              <Text style={[styles.checkLabel, c.done && styles.checkLabelDone]}>{c.label}</Text>
              {!c.done && <ChevronRight size={17} color={colors.textSecondary} />}
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.kpis}>
        <Kpi icon={Wallet} label="Ventes (30 jours)" value={formatFCFA(stats?.revenue ?? 0)} />
        <Kpi icon={ReceiptText} label="Commandes (30 jours)" value={String(stats?.orders ?? 0)} />
        <Kpi icon={Eye} label="Visites de la boutique" value={formatCount(stats?.views ?? views)} />
        <Kpi icon={Package} label="Produits en vente" value={`${published}/${products.length}`} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: {
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
});
