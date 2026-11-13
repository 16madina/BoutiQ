import { ChevronDown } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radii } from '@/theme';
import { haptics } from '@/utils/haptics';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  required?: boolean;
  children: ReactNode;
}

function FieldShell({ label, hint, error, optional, required, children }: FieldShellProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: colors.promo }}> *</Text> : null}
        {optional ? <Text style={styles.optional}>  facultatif</Text> : null}
      </Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

type FormFieldProps = Omit<FieldShellProps, 'children'> &
  TextInputProps & {
    prefix?: ReactNode;
    suffix?: ReactNode;
  };

/** Champ texte large et lisible, pensé pour une saisie au pouce. */
export function FormField({ label, hint, error, optional, required, prefix, suffix, multiline, style, ...input }: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} required={required}>
      <View
        style={[
          styles.box,
          multiline && styles.boxMultiline,
          focused && styles.boxFocused,
          !!error && styles.boxError,
        ]}
      >
        {prefix}
        <TextInput
          {...input}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.caramel}
          style={[styles.input, multiline && styles.inputMultiline, style]}
        />
        {suffix}
      </View>
    </FieldShell>
  );
}

interface SelectFieldProps extends Omit<FieldShellProps, 'children'> {
  value?: string;
  placeholder: string;
  onPress: () => void;
  leading?: ReactNode;
}

/** Champ de sélection : ouvre un bottom sheet. */
export function SelectField({ label, hint, error, optional, required, value, placeholder, onPress, leading }: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} required={required}>
      <Pressable
        onPress={() => {
          haptics.selection();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${value ?? placeholder}`}
        style={({ pressed }) => [styles.box, !!error && styles.boxError, pressed && { opacity: 0.7 }]}
      >
        {leading}
        <Text style={[styles.input, styles.selectText, !value && { color: colors.textMuted }]} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} strokeWidth={1.8} />
      </Pressable>
    </FieldShell>
  );
}

/** Choix en pastilles (2–4 options). */
export function SegmentedChoice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; caption?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <FieldShell label={label}>
      <View style={styles.segments}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => {
                haptics.selection();
                onChange(o.value);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentLabel, active && { color: colors.white }]}>{o.label}</Text>
              {o.caption ? <Text style={[styles.segmentCaption, active && { color: '#EAD5BC' }]}>{o.caption}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  optional: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  box: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boxMultiline: { alignItems: 'flex-start', paddingVertical: 12 },
  boxFocused: { borderColor: colors.caramel, borderWidth: 1.5 },
  boxError: { borderColor: colors.promo },
  // minWidth 0 : sur le web, un <input> a une largeur intrinsèque qui repousserait le suffixe.
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  inputMultiline: { minHeight: 84, textAlignVertical: 'top' },
  selectText: { paddingVertical: 15 },
  hint: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, lineHeight: 17 },
  error: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.promo },
  segments: { flexDirection: 'row', gap: 10 },
  segment: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  segmentActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  segmentLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  segmentCaption: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
});
