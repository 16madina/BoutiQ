import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ORDER_STATUS, timeAgo, type Order } from '@/api/account';
import { colors, fonts, radii } from '@/theme';
import { formatFCFA } from '@/utils/format';

/** Ligne de commande (client ou vendeur) : statut, photos, total. */
export function OrderCard({ order }: { order: Order }) {
  const st = ORDER_STATUS[order.status];
  const count = order.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityLabel={`Commande ${order.number}, ${st.label}`}
    >
      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={1}>
          {order.asSeller ? order.delivery.name || 'Client' : order.storeName}
        </Text>
        <View style={[styles.badge, { backgroundColor: st.bg }]}>
          <Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.thumbs}>
          {order.items.slice(0, 3).map((i) =>
            i.imageUri ? <Image key={i.id} source={{ uri: i.imageUri }} style={styles.thumb} contentFit="cover" /> : <View key={i.id} style={styles.thumb} />,
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.total}>{formatFCFA(order.total)}</Text>
          <Text style={styles.meta}>
            {count} article{count > 1 ? 's' : ''} · n° {order.number} · {timeAgo(order.createdAt)}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 14, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 15.5, color: colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumbs: { flexDirection: 'row' },
  thumb: { width: 44, height: 48, borderRadius: 10, marginRight: -10, borderWidth: 2, borderColor: colors.surface, backgroundColor: colors.champagne },
  total: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginLeft: 10 },
  meta: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, marginLeft: 10 },
});
