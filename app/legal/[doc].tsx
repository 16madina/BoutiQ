import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { LEGAL_UPDATED } from '@/config/legal';
import { LEGAL_DOCS, type LegalDocId } from '@/content/legal';
import { colors, fonts, spacing } from '@/theme';

/** Politique de confidentialité et conditions d'utilisation, lisibles dans l'application. */
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const insets = useSafeAreaInsets();
  const content = LEGAL_DOCS[(doc as LegalDocId) in LEGAL_DOCS ? (doc as LegalDocId) : 'confidentialite'];
  return (
    <View style={styles.screen}>
      <ScreenHeader title={content.title} />
      <ScrollView contentContainerStyle={{ padding: spacing.screen + 2, paddingBottom: 40 + insets.bottom, gap: 18 }}>
        <Text style={styles.updated}>Dernière mise à jour : {LEGAL_UPDATED}</Text>
        <Text style={styles.intro}>{content.intro}</Text>
        {content.sections.map((section) => (
          <View key={section.title} style={{ gap: 8 }}>
            <Text style={styles.heading} accessibilityRole="header">
              {section.title}
            </Text>
            {section.paragraphs.map((p) => (
              <Text key={p} style={styles.paragraph}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  updated: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  intro: { fontFamily: fonts.medium, fontSize: 15.5, lineHeight: 23, color: colors.text },
  heading: { fontFamily: fonts.bold, fontSize: 16.5, color: colors.text },
  paragraph: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 22, color: colors.textBody },
});
