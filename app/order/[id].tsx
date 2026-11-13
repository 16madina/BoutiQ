import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, CircleCheck, MapPin, MessageCircle, Phone, ReceiptText, Truck, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchOrder, MOBILE_MONEY, ORDER_STATUS, setOrderStatus, type Order, type OrderStatus } from '@/api/account';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SheetAction, StoreSheet } from '@/components/storefront/StoreSheet';
import { colors, fonts, radii, shadows, spacing, typography } from '@/theme';
import { formatFCFA } from '@/utils/format';
import { haptics } from '@/utils/haptics';

const STEPS: { status: OrderStatus; label: string; at: keyof Order }[] = [
  { status: 'pending', label: 'Commande passée', at: 'createdAt' },
  { status: 'confirmed', label: 'Confirmée par le vendeur', at: 'confirmedAt' },
  { status: 'shipped', label: 'En route', at: 'shippedAt' },
  { status: 'delivered', label: 'Reçue', at: 'deliveredAt' },
];

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

type Action = { status: OrderStatus; label: string; confirm: string; danger?: boolean };

/** Détail d'une commande : suivi, articles, livraison, actions (client ou vendeur). */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [pending, setPending] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrder(await fetchOrder(id));
    } catch {
      setOrder(null);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  if (order === undefined) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Commande" />
        <ActivityIndicator color={colors.caramel} style={{ marginTop: 40 }} />
      </View>
    );
  }
  if (!order) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Commande" />
        <EmptyState icon={ReceiptText} title="Commande introuvable" message="Elle a peut-être été supprimée, ou vous n’y avez pas accès." actionLabel="Retour" onAction={() => router.back()} />
      </View>
    );
  }

  const st = ORDER_STATUS[order.status];
  const seller = order.asSeller;
  const actions: Action[] = seller
    ? order.status === 'pending'
      ? [
          { status: 'confirmed', label: 'Confirmer la commande', confirm: 'Vous vous engagez à préparer et livrer cette commande.' },
          { status: 'cancelled', label: 'Refuser la commande', confirm: 'Le client sera prévenu et le stock sera rendu.', danger: true },
        ]
      : order.status === 'confirmed'
        ? [
            { status: 'shipped', label: 'Marquer comme expédiée', confirm: 'Le client sera prévenu que sa commande est en route.' },
            { status: 'cancelled', label: 'Annuler la commande', confirm: 'Le client sera prévenu et le stock sera rendu.', danger: true },
          ]
        : []
    : order.status === 'shipped'
      ? [{ status: 'delivered', label: 'J’ai reçu ma commande', confirm: 'Confirmez seulement si vous avez bien reçu tous vos articles : la vente sera validée pour le vendeur.' }]
      : order.status === 'pending'
        ? [{ status: 'cancelled', label: 'Annuler ma commande', confirm: 'Le vendeur sera prévenu.', danger: true }]
        : [];

  const run = async (a: Action) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setPending(null);
    try {
      await setOrderStatus(order.id, a.status);
      haptics.success();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const phoneDigits = order.delivery.phone.replace(/[^\d+]/g, '');
  const provider = MOBILE_MONEY.find((m) => m.id === order.mobileMoney);
  const primary = actions.find((a) => !a.danger);
  const secondary = actions.find((a) => a.danger);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={`Commande n° ${order.number}`} />
      <ScrollView contentContainerStyle={{ padding: spacing.screen, gap: 16, paddingBottom: 150 + insets.bottom }}>
        <View style={[styles.statusCard, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusLabel, { color: st.fg }]}>{st.label}</Text>
          <Text style={styles.statusText}>
            {seller ? `Commande de ${order.delivery.name}` : `Chez ${order.storeName}`} · {when(order.createdAt)}
          </Text>
        </View>

        {order.status !== 'cancelled' ? (
          <Card title="Suivi">
            {STEPS.map((s, i) => {
              const reached = STEPS.findIndex((x) => x.status === order.status) >= i;
              return (
                <View key={s.status} style={styles.step}>
                  <View style={[styles.stepDot, reached && styles.stepDotOn]}>{reached && <Check size={13} color={colors.white} strokeWidth={3} />}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stepLabel, !reached && { color: colors.textMuted }]}>{s.label}</Text>
                    {reached && order[s.at] ? <Text style={typography.caption}>{when(order[s.at] as string)}</Text> : null}
                  </View>
                </View>
              );
            })}
          </Card>
        ) : (
          <Card title="Commande annulée">
            <Text style={typography.caption}>Annulée le {when(order.cancelledAt)}. Le stock a été rendu à la boutique.</Text>
          </Card>
        )}

        <Card title="Articles">
          {order.items.map((i) => (
            <View key={i.id} style={styles.item}>
              {i.imageUri ? <Image source={{ uri: i.imageUri }} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={typography.productName} numberOfLines={2}>
                  {i.name}
                </Text>
                {i.variant || i.size || i.color ? <Text style={typography.caption}>{[i.variant, i.color, i.size ? `Taille ${i.size}` : null].filter(Boolean).join(' · ')}</Text> : null}
                <Text style={typography.caption}>
                  {i.quantity} × {formatFCFA(i.unitPrice)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatFCFA(i.unitPrice * i.quantity)}</Text>
            </View>
          ))}
          {order.discount > 0 && <Line label={`Code promo${order.promoCode ? ` ${order.promoCode}` : ''}`} value={`− ${formatFCFA(order.discount)}`} />}
          <View style={styles.sumRow}>
            <Text style={typography.h3}>Total</Text>
            <Text style={[typography.price, { fontSize: 19 }]}>{formatFCFA(order.total)}</Text>
          </View>
          {seller && (
            <>
              <Line label="Commission BoutiQ (5 %)" value={`− ${formatFCFA(order.commission)}`} />
              <Line label="Vous recevez" value={formatFCFA(order.total - order.commission)} strong />
            </>
          )}
        </Card>

        <Card title="Livraison et paiement">
          <Info icon={<MapPin size={17} color={colors.cognac} strokeWidth={1.8} />} text={[order.delivery.city, order.delivery.address].filter(Boolean).join(' · ')} />
          {seller && <Info icon={<Phone size={17} color={colors.cognac} strokeWidth={1.8} />} text={`${order.delivery.name} · ${order.delivery.phone}`} />}
          <Info
            icon={<Truck size={17} color={colors.cognac} strokeWidth={1.8} />}
            text={order.paymentMethod === 'mobile_money' ? `Mobile Money à la livraison${provider ? ` (${provider.label})` : ''}` : 'Espèces à la livraison'}
          />
          {order.note ? <Info icon={<MessageCircle size={17} color={colors.cognac} strokeWidth={1.8} />} text={`« ${order.note} »`} /> : null}
          {seller && phoneDigits.length >= 8 && (
            <View style={styles.contactRow}>
              <Pressable onPress={() => Linking.openURL(`tel:${phoneDigits}`)} style={styles.contact} accessibilityRole="button">
                <Phone size={17} color={colors.text} strokeWidth={1.8} />
                <Text style={styles.contactText}>Appeler</Text>
              </Pressable>
              <Pressable onPress={() => Linking.openURL(`https://wa.me/${phoneDigits.replace('+', '')}`)} style={styles.contact} accessibilityRole="button">
                <MessageCircle size={17} color={colors.text} strokeWidth={1.8} />
                <Text style={styles.contactText}>WhatsApp</Text>
              </Pressable>
            </View>
          )}
        </Card>
        {order.status === 'delivered' && !seller && (
          <View style={styles.thanks}>
            <CircleCheck size={20} color="#3F6B3A" strokeWidth={1.8} />
            <Text style={styles.thanksText}>Merci ! La vente est validée pour le vendeur.</Text>
          </View>
        )}
      </ScrollView>

      {(primary || secondary || error) && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {primary && <PrimaryButton label={busy ? 'Un instant…' : primary.label} onPress={() => setPending(primary)} disabled={busy} variant="caramel" style={{ height: 56 }} />}
          {secondary && (
            <Text style={[styles.danger, busy && { opacity: 0.4 }]} onPress={busy ? undefined : () => setPending(secondary)} accessibilityRole="button">
              {secondary.label}
            </Text>
          )}
        </View>
      )}

      <StoreSheet visible={!!pending} title={pending?.label ?? ''} subtitle={pending?.confirm} onClose={() => setPending(null)}>
        {pending && (
          <>
            <SheetAction
              icon={pending.danger ? <X size={18} color={colors.white} strokeWidth={2.2} /> : <Check size={18} color={colors.white} strokeWidth={2.4} />}
              tint={pending.danger ? colors.promo : '#3F6B3A'}
              label={pending.danger ? 'Oui, annuler' : 'Oui, confirmer'}
              onPress={() => run(pending)}
            />
            <SheetAction icon={<X size={18} color={colors.cognac} strokeWidth={2} />} label="Retour" onPress={() => setPending(null)} />
          </>
        )}
      </StoreSheet>
    </View>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Info({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={styles.info}>
      {icon}
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={[styles.sumRow, { paddingTop: 6, borderTopWidth: 0 }]}>
      <Text style={[typography.caption, strong && { fontFamily: fonts.semibold, color: colors.text, fontSize: 14 }]}>{label}</Text>
      <Text style={[styles.itemTotal, strong && { color: '#3F6B3A' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  statusCard: { padding: 16, borderRadius: radii.xl, gap: 4 },
  statusLabel: { fontFamily: fonts.bold, fontSize: 20 },
  statusText: { fontFamily: fonts.medium, fontSize: 13.5, color: '#4A433E' },
  card: { gap: 12, padding: 16, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadows.soft },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16.5, color: colors.text },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  stepDotOn: { backgroundColor: '#3F6B3A', borderColor: '#3F6B3A' },
  stepLabel: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 62, borderRadius: 12, backgroundColor: colors.champagne },
  itemTotal: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.text },
  sumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text, lineHeight: 19 },
  contactRow: { flexDirection: 'row', gap: 10 },
  contact: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  contactText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  thanks: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radii.lg, backgroundColor: '#E7EFDF' },
  thanksText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: '#2F5A2B' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 8, paddingHorizontal: spacing.screen, paddingTop: 12, backgroundColor: colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  error: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.promo, textAlign: 'center' },
  danger: { fontFamily: fonts.semibold, fontSize: 15, color: colors.promo, textAlign: 'center', paddingVertical: 8 },
});
