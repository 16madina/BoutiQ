import { router } from 'expo-router';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { Fragment, useEffect, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/GlassSurface';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts, radii, shadows, spacing } from '@/theme';

export const STEP_TITLES = ['Identité', 'Détails', 'Terminer'];

function StepDot({ index, step }: { index: number; step: number }) {
  const state = index < step ? 'done' : index === step ? 'active' : 'todo';
  const scale = useSharedValue(state === 'active' ? 0.8 : 1);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 220 });
  }, [step, scale]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.dotCol}>
      <Animated.View style={[styles.dot, state !== 'todo' && styles.dotFilled, anim]}>
        {state === 'done' ? (
          <Check size={16} color={colors.white} strokeWidth={3} />
        ) : (
          <Text style={[styles.dotText, state === 'active' && { color: colors.white }]}>{index}</Text>
        )}
      </Animated.View>
      <Text style={[styles.dotLabel, state !== 'todo' && styles.dotLabelOn]}>{STEP_TITLES[index - 1]}</Text>
    </View>
  );
}

function Connector({ filled }: { filled: boolean }) {
  const p = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(filled ? 1 : 0, { duration: 350 });
  }, [filled, p]);
  const anim = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [colors.champagne, colors.caramel]),
  }));
  return <Animated.View style={[styles.line, anim]} />;
}

/** Barre d'étapes numérotées : Identité — Détails — Terminer. */
export function Stepper({ step }: { step: number }) {
  return (
    <View style={styles.stepper} accessibilityRole="progressbar" accessibilityLabel={`Étape ${step} sur 3`}>
      {[1, 2, 3].map((i) => (
        <Fragment key={i}>
          <StepDot index={i} step={step} />
          {i < 3 && <Connector filled={i < step} />}
        </Fragment>
      ))}
    </View>
  );
}

interface Props {
  step: number;
  children: ReactNode;
  ctaLabel?: string;
  onNext: () => void;
  ctaDisabled?: boolean;
  /** Le contenu est-il placé dans la carte blanche ? (oui par défaut) */
  card?: boolean;
  intro?: ReactNode;
}

/** Gabarit des 3 étapes, fidèle à la maquette : titre centré, étapes, carte, bouton noir « Suivant → ». */
export function OnboardingScaffold({ step, children, ctaLabel = 'Suivant', onNext, ctaDisabled, card = true, intro }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft size={24} strokeWidth={1.8} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Créer ma boutique</Text>
      </View>
      <Stepper step={step} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 130 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {intro}
          <Animated.View entering={FadeInDown.duration(380)} style={card ? styles.card : { gap: spacing.xl }}>
            {children}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <GlassSurface borderRadius={0} />
        <PrimaryButton
          label={ctaLabel}
          onPress={onNext}
          disabled={ctaDisabled}
          trailingIcon={<ArrowRight size={22} color={colors.white} strokeWidth={2} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.screen, paddingBottom: 14 },
  back: { position: 'absolute', left: spacing.screen, bottom: 14 },
  title: { fontFamily: fonts.bold, fontSize: 21, color: colors.text, letterSpacing: -0.3 },
  stepper: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 34, paddingBottom: 14 },
  dotCol: { alignItems: 'center', width: 70, gap: 6 },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.chocolate,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotFilled: { backgroundColor: colors.cognac, borderColor: colors.cognac },
  dotText: { fontFamily: fonts.bold, fontSize: 14, color: colors.chocolate },
  dotLabel: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary },
  dotLabelOn: { fontFamily: fonts.semibold, color: colors.chocolate },
  line: { flex: 1, height: 1.5, marginTop: 14, marginHorizontal: -18 },
  content: { paddingHorizontal: spacing.screen, paddingTop: spacing.xs, gap: spacing.lg },
  card: {
    padding: spacing.lg,
    gap: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.soft,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screen,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
