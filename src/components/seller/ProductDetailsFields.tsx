import { randomUUID } from 'expo-crypto';
import { Check, Minus, Plus, Trash2, Wand2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { colors, fonts, radii } from '@/theme';
import type { ProductVariant } from '@/types/seller';
import { COLOR_PRESETS, groupDigits, SIZE_PRESETS, toNumber } from '@/utils/productForm';
import { haptics } from '@/utils/haptics';

/* --------------------------------------------------------------- Quantité */

export function StockStepper({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <View style={[styles.stepper, disabled && { opacity: 0.5 }]}>
      <Pressable
        disabled={disabled}
        onPress={() => {
          haptics.selection();
          onChange(Math.max(0, value - 1));
        }}
        style={styles.stepBtn}
        accessibilityRole="button"
        accessibilityLabel="Diminuer la quantité"
      >
        <Minus size={18} color={colors.text} strokeWidth={2.2} />
      </Pressable>
      <TextInput
        editable={!disabled}
        value={String(value)}
        onChangeText={(t) => onChange(Math.min(99999, toNumber(t)))}
        keyboardType="number-pad"
        style={styles.stepValue}
        accessibilityLabel="Quantité disponible"
        selectTextOnFocus
      />
      <Pressable
        disabled={disabled}
        onPress={() => {
          haptics.selection();
          onChange(value + 1);
        }}
        style={styles.stepBtn}
        accessibilityRole="button"
        accessibilityLabel="Augmenter la quantité"
      >
        <Plus size={18} color={colors.text} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

/* ---------------------------------------------------- Tailles et couleurs */

function Chip({ label, active, onPress, swatch }: { label: string; active: boolean; onPress: () => void; swatch?: string }) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
    >
      {swatch ? <View style={[styles.swatch, { backgroundColor: swatch }]} /> : null}
      <Text style={[styles.chipText, active && { color: colors.white }]}>{label}</Text>
      {active && <Check size={13} color={colors.white} strokeWidth={3} />}
    </Pressable>
  );
}

function CustomAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [text, setText] = useState('');
  const add = () => {
    const v = text.trim();
    if (!v) return;
    onAdd(v.slice(0, 20));
    setText('');
  };
  return (
    <View style={styles.customRow}>
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={add}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
        maxLength={20}
        style={styles.customInput}
      />
      <Pressable onPress={add} style={styles.customAdd} accessibilityRole="button" accessibilityLabel={`Ajouter : ${placeholder}`}>
        <Plus size={18} color={colors.white} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v].slice(0, 20));

export function SizesField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const custom = value.filter((v) => !SIZE_PRESETS.some((g) => g.values.includes(v)));
  return (
    <View style={{ gap: 10 }}>
      {SIZE_PRESETS.map((g) => (
        <View key={g.label} style={{ gap: 6 }}>
          <Text style={styles.groupLabel}>{g.label}</Text>
          <View style={styles.chips}>
            {g.values.map((v) => (
              <Chip key={v} label={v} active={value.includes(v)} onPress={() => onChange(toggle(value, v))} />
            ))}
          </View>
        </View>
      ))}
      {custom.length > 0 && (
        <View style={styles.chips}>
          {custom.map((v) => (
            <Chip key={v} label={v} active onPress={() => onChange(toggle(value, v))} />
          ))}
        </View>
      )}
      <CustomAdd placeholder="Autre taille (ex. 2 ans, 500 ml)" onAdd={(v) => !value.includes(v) && onChange([...value, v])} />
    </View>
  );
}

export function ColorsField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const custom = value.filter((v) => !COLOR_PRESETS.some((c) => c.name === v));
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.chips}>
        {COLOR_PRESETS.map((c) => (
          <Chip key={c.name} label={c.name} swatch={c.hex} active={value.includes(c.name)} onPress={() => onChange(toggle(value, c.name))} />
        ))}
        {custom.map((v) => (
          <Chip key={v} label={v} active onPress={() => onChange(toggle(value, v))} />
        ))}
      </View>
      <CustomAdd placeholder="Autre couleur (ex. Bordeaux)" onAdd={(v) => !value.includes(v) && onChange([...value, v])} />
    </View>
  );
}

/* --------------------------------------------------- Variantes et prix */

export function VariantsField({
  value,
  onChange,
  basePrice,
  sizes,
  colorsList,
  currency,
  error,
}: {
  value: ProductVariant[];
  onChange: (v: ProductVariant[]) => void;
  basePrice: number;
  sizes: string[];
  colorsList: string[];
  currency: string;
  error?: string | null;
}) {
  const update = (id: string, patch: Partial<ProductVariant>) => onChange(value.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const add = (label = '') => onChange([...value, { id: randomUUID(), label, price: basePrice, stock: 1 }].slice(0, 30));
  const combos =
    sizes.length && colorsList.length
      ? colorsList.flatMap((c) => sizes.map((s) => `${c} · ${s}`))
      : [...sizes, ...colorsList];
  const canGenerate = combos.length > 0 && value.length === 0;

  return (
    <View style={{ gap: 10 }}>
      {value.map((v) => (
        <Animated.View key={v.id} entering={FadeIn} exiting={FadeOut} layout={LinearTransition} style={styles.variant}>
          <View style={styles.variantTop}>
            <TextInput
              value={v.label}
              onChangeText={(t) => update(v.id, { label: t.slice(0, 40) })}
              placeholder="Nom (ex. Rouge · M, 500 ml)"
              placeholderTextColor={colors.textMuted}
              style={[styles.variantName, !v.label.trim() && error ? { borderColor: colors.promo } : null]}
              accessibilityLabel="Nom de la variante"
            />
            <Pressable
              onPress={() => {
                haptics.light();
                onChange(value.filter((x) => x.id !== v.id));
              }}
              hitSlop={8}
              style={styles.variantDelete}
              accessibilityRole="button"
              accessibilityLabel={`Supprimer la variante ${v.label}`}
            >
              <Trash2 size={18} color={colors.promo} strokeWidth={1.8} />
            </Pressable>
          </View>
          <View style={styles.variantBottom}>
            <View style={styles.variantPrice}>
              <TextInput
                value={groupDigits(v.price)}
                onChangeText={(t) => update(v.id, { price: toNumber(t) })}
                keyboardType="number-pad"
                placeholder="Prix"
                placeholderTextColor={colors.textMuted}
                style={styles.variantPriceInput}
                accessibilityLabel="Prix de la variante"
              />
              <Text style={styles.currency}>{currency}</Text>
            </View>
            <StockStepper value={v.stock} onChange={(stock) => update(v.id, { stock })} />
          </View>
        </Animated.View>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.chips}>
        <Pressable onPress={() => add()} style={styles.addVariant} accessibilityRole="button">
          <Plus size={16} color={colors.chocolate} strokeWidth={2.2} />
          <Text style={styles.addVariantText}>Ajouter une variante</Text>
        </Pressable>
        {canGenerate && (
          <Pressable
            onPress={() => {
              haptics.medium();
              onChange(combos.slice(0, 30).map((label) => ({ id: randomUUID(), label, price: basePrice, stock: 1 })));
            }}
            style={styles.addVariant}
            accessibilityRole="button"
          >
            <Wand2 size={16} color={colors.chocolate} strokeWidth={2} />
            <Text style={styles.addVariantText}>Créer depuis tailles et couleurs</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4, borderRadius: radii.pill, backgroundColor: colors.backgroundAlt },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepValue: { width: 56, fontFamily: fonts.bold, fontSize: 17, textAlign: 'center', color: colors.text, paddingVertical: 4 },
  groupLabel: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  swatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  customRow: { flexDirection: 'row', gap: 8 },
  customInput: { flex: 1, height: 46, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  customAdd: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center' },
  variant: { gap: 10, padding: 12, borderRadius: radii.lg, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  variantTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  variantName: { flex: 1, height: 46, paddingHorizontal: 14, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  variantDelete: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  variantBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  variantPrice: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 46, paddingHorizontal: 14, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  variantPriceInput: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.text, paddingVertical: 0 },
  currency: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.promo },
  addVariant: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 42, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.champagne },
  addVariantText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.chocolate },
});
