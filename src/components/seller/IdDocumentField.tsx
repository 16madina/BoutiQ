import { Image } from 'expo-image';
import { IdCard, Lock } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { pickImage } from '@/components/seller/ImagePickers';
import { colors, fonts, radii } from '@/theme';
import type { LocalImage } from '@/types/seller';

/** Pièce d'identité : facultative à la création, requise pour activer les ventes. */
export function IdDocumentField({ uri, onPick }: { uri?: string; onPick: (img: LocalImage) => void }) {
  return (
    <View style={styles.idCard}>
      <View style={styles.idHeader}>
        <IdCard size={20} color={colors.cognac} strokeWidth={1.6} />
        <View style={{ flex: 1 }}>
          <Text style={styles.idTitle}>Pièce d’identité</Text>
          <Text style={styles.idText}>CNI, passeport ou permis. Nécessaire pour activer les ventes et les paiements.</Text>
        </View>
      </View>
      <Pressable
        onPress={async () => {
          const img = await pickImage([3, 2]);
          if (img) onPick(img);
        }}
        style={styles.idPick}
        accessibilityRole="button"
        accessibilityLabel="Ajouter la pièce d’identité"
      >
        {uri ? (
          <Animated.View entering={FadeIn} style={StyleSheet.absoluteFill}>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={6} />
            <View style={styles.idDone}>
              <Text style={styles.idDoneText}>Document ajouté ✓ · Changer</Text>
            </View>
          </Animated.View>
        ) : (
          <Text style={styles.idPickText}>Prendre ou choisir une photo</Text>
        )}
      </Pressable>
      <View style={styles.lockRow}>
        <Lock size={13} color={colors.textSecondary} strokeWidth={1.8} />
        <Text style={styles.lockText}>Visible uniquement par l’équipe de vérification BoutiQ.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  idCard: { padding: 16, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 12 },
  idHeader: { flexDirection: 'row', gap: 12 },
  idTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  idText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  idPick: {
    height: 96,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.champagne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idPickText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.chocolate },
  idDone: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,23,23,0.35)' },
  idDoneText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
});
