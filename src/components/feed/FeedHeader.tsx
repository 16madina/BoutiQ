import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { colors, spacing, typography } from '@/theme';

/** Titre d'une section du fil, avec une flèche « tout voir » facultative. */
export function FeedHeader({ title, subtitle, onAction, actionLabel }: { title: string; subtitle?: string; onAction?: () => void; actionLabel?: string }) {
  const body = (
    <>
      <View style={{ flex: 1 }}>
        <Text style={typography.h2} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={[typography.caption, { marginTop: 2, fontSize: 13 }]}>{subtitle}</Text> : null}
      </View>
      {onAction ? <ChevronRight size={22} strokeWidth={1.8} color={colors.text} /> : null}
    </>
  );
  if (!onAction) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable onPress={onAction} accessibilityRole="link" accessibilityLabel={actionLabel ?? `${title} : tout voir`} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      {body}
    </Pressable>
  );
}

/** Apparition douce d'une section ; immobile si la personne a demandé moins d'animations. */
export function Appear({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return <Animated.View entering={reduce ? undefined : FadeInDown.duration(320)}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.screen, marginBottom: spacing.md },
});
