import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { colors, fonts, radii } from '@/theme';
import type { CategoryId } from '@/types';
import { haptics } from '@/utils/haptics';

const SUGGESTIONS: Record<CategoryId, string[]> = {
  mode: ['Robes', 'Wax', 'Sacs', 'Chaussures', 'Accessoires'],
  electronique: ['Smartphones', 'Accessoires', 'Audio', 'Montres'],
  maison: ['Salon', 'Cuisine', 'Déco', 'Luminaires'],
  beaute: ['Parfums', 'Soins', 'Maquillage', 'Cheveux'],
  alimentation: ['Fruits', 'Épicerie', 'Boissons', 'Paniers'],
  sport: ['Football', 'Fitness', 'Vêtements', 'Chaussures'],
};

export const MAX_COLLECTIONS = 6;

/** Collections de la boutique : pastilles + suggestions en un toucher. */
export function CollectionsEditor({
  value,
  onChange,
  categoryId,
  suggestions: suggested,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  categoryId?: CategoryId;
  /** Suggestions du modèle de boutique (prioritaires sur celles de la catégorie). */
  suggestions?: string[];
}) {
  const [text, setText] = useState('');
  const add = (name: string) => {
    const n = name.trim();
    if (!n || value.some((v) => v.toLowerCase() === n.toLowerCase()) || value.length >= MAX_COLLECTIONS) return;
    haptics.selection();
    onChange([...value, n]);
    setText('');
  };
  const suggestions = (suggested ?? (categoryId ? SUGGESTIONS[categoryId] : SUGGESTIONS.mode)).filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()),
  );

  return (
    <View style={{ gap: 12 }}>
      <Animated.View layout={LinearTransition.springify().damping(18)} style={styles.chips}>
        {value.map((c) => (
          <Animated.View key={c} entering={FadeIn} exiting={FadeOut} layout={LinearTransition} style={styles.chip}>
            <Text style={styles.chipText}>{c}</Text>
            <Pressable
              onPress={() => {
                haptics.light();
                onChange(value.filter((v) => v !== c));
              }}
              hitSlop={8}
              accessibilityLabel={`Retirer ${c}`}
            >
              <X size={14} color={colors.white} strokeWidth={2.4} />
            </Pressable>
          </Animated.View>
        ))}
      </Animated.View>

      {value.length < MAX_COLLECTIONS && (
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => add(text)}
            placeholder="Nouvelle collection"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.caramel}
            returnKeyType="done"
            maxLength={24}
            style={styles.input}
          />
          <Pressable onPress={() => add(text)} style={styles.addButton} accessibilityLabel="Ajouter la collection">
            <Plus size={18} color={colors.white} strokeWidth={2.4} />
          </Pressable>
        </View>
      )}

      {suggestions.length > 0 && value.length < MAX_COLLECTIONS && (
        <View style={styles.chips}>
          {suggestions.map((s) => (
            <Pressable key={s} onPress={() => add(s)} style={styles.suggestion}>
              <Plus size={13} color={colors.cognac} strokeWidth={2.2} />
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, paddingRight: 10, height: 36, borderRadius: radii.pill, backgroundColor: colors.buttonPrimary },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.white },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  addButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 34, borderRadius: radii.pill, backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.border },
  suggestionText: { fontFamily: fonts.medium, fontSize: 13, color: colors.chocolate },
});
