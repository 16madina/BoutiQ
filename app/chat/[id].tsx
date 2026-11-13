import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MessageCircle, Send } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchMessages, markConversationRead, sendMessage, useMessages, type ChatMessage } from '@/api/messages';
import { CircleIconButton } from '@/components/CircleIconButton';
import { colors, fonts, radii, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

const hour = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

/** Discussion entre un client et une boutique. La liste se met à jour toute seule pendant qu'on la regarde. */
export default function ChatScreen() {
  const { id, title: titleParam, sub } = useLocalSearchParams<{ id: string; title?: string; sub?: string }>();
  const insets = useSafeAreaInsets();
  const known = useMessages((s) => s.conversations?.find((c) => c.id === id));
  const title = titleParam ?? known?.title ?? 'Discussion';
  const subtitle = sub ?? (known ? (known.role === 'seller' ? `Client de ${known.storeName}` : 'Boutique') : undefined);

  // Du plus récent au plus ancien : la liste est affichée à l'envers, le dernier message en bas.
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef(0);

  const load = useCallback(async () => {
    try {
      const list = await fetchMessages(id);
      setMessages(list);
      // Nouveau message reçu : la conversation est lue puisqu'on la regarde.
      const received = list.filter((m) => !m.mine).length;
      if (received !== seen.current) {
        seen.current = received;
        markConversationRead(id).catch(() => {});
      }
    } catch {
      setMessages((m) => m ?? []);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
      markConversationRead(id).catch(() => {});
      const timer = setInterval(load, 6000);
      return () => clearInterval(timer);
    }, [load, id]),
  );

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(id, body);
      haptics.light();
      setText('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <CircleIconButton size={40} onPress={() => (router.canGoBack() ? router.back() : router.replace('/messages'))} accessibilityLabel="Retour">
          <ChevronLeft size={22} strokeWidth={1.8} color={colors.text} />
        </CircleIconButton>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {messages == null ? (
        <ActivityIndicator color={colors.caramel} style={{ marginTop: 40, flex: 1 }} />
      ) : messages.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <MessageCircle size={28} color={colors.cognac} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>Écrivez à {title}</Text>
          <Text style={styles.emptyText}>Posez votre question sur un produit, la livraison ou une commande. Votre message arrive directement.</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          inverted
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingVertical: 12, gap: 6 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => {
            const older = messages[index + 1];
            const newDay = !older || !sameDay(older.createdAt, item.createdAt);
            return (
              <View>
                {newDay ? <Text style={styles.day}>{day(item.createdAt)}</Text> : null}
                <View style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.body, item.mine && { color: colors.white }]}>{item.body}</Text>
                  <Text style={[styles.hour, item.mine && { color: 'rgba(255,255,255,0.78)' }]}>{hour(item.createdAt)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          value={text}
          onChangeText={(t) => setText(t.slice(0, 1000))}
          placeholder="Votre message"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          accessibilityLabel="Votre message"
        />
        <Pressable
          onPress={send}
          disabled={!text.trim() || sending}
          style={({ pressed }) => [styles.send, (!text.trim() || sending) && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Envoyer"
        >
          {sending ? <ActivityIndicator size="small" color={colors.white} /> : <Send size={19} color={colors.white} strokeWidth={2} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.screen, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  title: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, marginTop: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, textAlign: 'center' },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
  day: { alignSelf: 'center', fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary, marginVertical: 10, textTransform: 'capitalize' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingTop: 9, paddingBottom: 7, borderRadius: 18, gap: 3 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.accentFill, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderBottomLeftRadius: 6 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.text },
  hour: { alignSelf: 'flex-end', fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  error: { marginHorizontal: spacing.screen, marginBottom: 6, padding: 10, borderRadius: radii.md, backgroundColor: colors.tint, fontFamily: fonts.medium, fontSize: 13, color: colors.chocolate },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: spacing.screen, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  input: { flex: 1, minHeight: 46, maxHeight: 120, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 23, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accentFill, alignItems: 'center', justifyContent: 'center' },
});
