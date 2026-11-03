import { Bell } from 'lucide-react-native';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { DEMO_NOTIFICATIONS } from '@/data/demo';
import { colors, fonts, radii, spacing, typography } from '@/theme';

export default function NotificationsScreen() {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Notifications" />
      <FlatList
        data={DEMO_NOTIFICATIONS}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: spacing.screen, gap: 10 }}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.icon}>
              <Bell size={18} color={colors.cognac} strokeWidth={1.7} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={typography.caption}>{item.time}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  body: { ...typography.caption, fontSize: 13.5, color: '#4A433E', lineHeight: 19 },
});
