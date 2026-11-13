import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { timeAgo } from '@/api/account';
import { useMessages, type Conversation } from '@/api/messages';
import { EmptyState } from '@/components/EmptyState';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts, radii, spacing } from '@/theme';

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

function Row({ item }: { item: Conversation }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = item.role === 'buyer' && !logoFailed ? item.storeLogoUri : undefined;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id, title: item.title, sub: item.role === 'seller' ? `Client de ${item.storeName}` : 'Boutique' } })}
      style={({ pressed }) => [styles.row, item.unread > 0 && styles.rowUnread, pressed && { opacity: 0.75 }]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.unread > 0 ? `${item.unread} non lu${item.unread > 1 ? 's' : ''}, ` : ''}${item.lastMessage}`}
    >
      <View style={[styles.avatar, item.role === 'seller' && { backgroundColor: colors.accentFill }]}>
        {logo ? <Image source={{ uri: logo }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setLogoFailed(true)} /> : <Text style={styles.initials}>{initials(item.title)}</Text>}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.time}>{timeAgo(item.lastMessageAt)}</Text>
        </View>
        {item.role === 'seller' ? (
          <Text style={styles.role} numberOfLines={1}>
            Client de {item.storeName}
          </Text>
        ) : null}
        <View style={styles.top}>
          <Text style={[styles.preview, item.unread > 0 && { color: colors.text, fontFamily: fonts.semibold }]} numberOfLines={1}>
            {item.lastFromMe ? 'Vous : ' : ''}
            {item.lastMessage}
          </Text>
          {item.unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unread > 9 ? '9+' : item.unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Boîte de réception : mes conversations avec des boutiques, et celles des clients de ma boutique. */
export function MessagesInbox() {
  const bottomSpace = useTabBarSpace();
  const conversations = useMessages((s) => s.conversations);
  const refresh = useMessages((s) => s.refresh);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, 15_000);
      return () => clearInterval(timer);
    }, [refresh]),
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Messages" back={false} large />
      {conversations == null ? (
        <ActivityIndicator color={colors.caramel} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: bottomSpace, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await refresh();
                setRefreshing(false);
              }}
              tintColor={colors.caramel}
              colors={[colors.caramel]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={MessageCircle}
              title="Aucun message"
              message="Pour écrire à une boutique, ouvrez sa page et touchez « Contacter »."
              actionLabel="Découvrir les boutiques"
              onAction={() => router.navigate({ pathname: '/categories', params: { view: 'stores' } })}
            />
          }
          renderItem={({ item }) => <Row item={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  rowUnread: { borderColor: colors.champagne, backgroundColor: colors.tintSoft },
  avatar: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.bold, fontSize: 17, color: colors.white },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 15.5, color: colors.text },
  time: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  role: { fontFamily: fonts.medium, fontSize: 12, color: colors.cognac },
  preview: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, color: colors.textSecondary },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },
});
