import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, Search, X } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radii, shadows, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

export const SEARCH_PLACEHOLDER = 'Rechercher un produit, une boutique...';

/** Ouvre la galerie puis la recherche visuelle (démo : produits de la même famille). */
export async function startVisualSearch() {
  haptics.light();
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Accès refusé', 'Autorisez l’accès à vos photos pour rechercher un produit par image.');
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
  if (result.canceled) return;
  router.push({ pathname: '/search', params: { visual: '1' } });
}

interface Props {
  /** Mode bouton (accueil) : toute la barre ouvre l'écran de recherche. */
  asButton?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SearchBar({ asButton, value, onChangeText, onSubmit, autoFocus, style }: Props) {
  const camera = (
    <Pressable
      onPress={startVisualSearch}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Rechercher par image"
      style={({ pressed }) => [styles.iconRight, pressed && { opacity: 0.5 }]}
    >
      <Camera size={23} strokeWidth={1.6} color={colors.text} />
    </Pressable>
  );

  if (asButton) {
    return (
      <View style={[styles.bar, style]}>
        <Pressable
          style={styles.pressArea}
          onPress={() => router.push('/search')}
          accessibilityRole="search"
          accessibilityLabel={SEARCH_PLACEHOLDER}
        >
          <Search size={22} strokeWidth={1.8} color={colors.text} />
          <Text style={styles.placeholder} numberOfLines={1}>
            {SEARCH_PLACEHOLDER}
          </Text>
        </Pressable>
        {camera}
      </View>
    );
  }

  return (
    <View style={[styles.bar, style]}>
      <View style={styles.pressArea}>
        <Search size={22} strokeWidth={1.8} color={colors.text} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          autoFocus={autoFocus}
          placeholder={SEARCH_PLACEHOLDER}
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          autoCorrect={false}
          selectionColor={colors.caramel}
          style={styles.input}
        />
      </View>
      {value ? (
        <Pressable
          onPress={() => onChangeText?.('')}
          hitSlop={10}
          accessibilityLabel="Effacer"
          style={[styles.iconRight, styles.clear]}
        >
          <X size={14} strokeWidth={2.5} color={colors.white} />
        </Pressable>
      ) : (
        camera
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 54,
    marginHorizontal: spacing.screen,
    borderRadius: radii.xxl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.soft,
  },
  pressArea: { flex: 1, height: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 18 },
  placeholder: { flex: 1, fontFamily: fonts.regular, fontSize: 15.5, color: colors.textSecondary },
  input: { flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 15.5, color: colors.text, padding: 0 },
  iconRight: { paddingHorizontal: 18, height: '100%', justifyContent: 'center' },
  clear: {
    width: 22,
    height: 22,
    paddingHorizontal: 0,
    marginRight: 16,
    borderRadius: 11,
    backgroundColor: colors.sand,
    alignItems: 'center',
  },
});
