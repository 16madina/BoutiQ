import { LockKeyhole } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { authenticate } from '@/lib/device';
import { useSettings } from '@/store/useSettings';
import { colors, fonts } from '@/theme';

/** Temps passé hors de l'application au-delà duquel on redemande le visage ou l'empreinte. */
const RELOCK_AFTER_MS = 60_000;

/**
 * Écran de verrouillage : quand « Face ID / empreinte » est activé dans les Paramètres,
 * l'application reste cachée jusqu'à ce que la personne se soit identifiée.
 */
export function AppLock() {
  const insets = useSafeAreaInsets();
  const enabled = useSettings((s) => s.biometricLock) && Platform.OS !== 'web';
  const [locked, setLocked] = useState(true);
  const [failed, setFailed] = useState(false);
  const asking = useRef(false);
  const leftAt = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    if (asking.current) return;
    asking.current = true;
    const ok = await authenticate('Déverrouiller BoutiQ');
    asking.current = false;
    setFailed(!ok);
    if (ok) setLocked(false);
  }, []);

  // À l'ouverture, puis au retour dans l'application après une absence.
  useEffect(() => {
    if (!enabled) return;
    unlock();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') leftAt.current = Date.now();
      if (state === 'active' && leftAt.current && Date.now() - leftAt.current > RELOCK_AFTER_MS) {
        leftAt.current = null;
        setLocked(true);
        unlock();
      }
    });
    return () => sub.remove();
  }, [enabled, unlock]);

  if (!enabled || !locked) return null;
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 90, paddingBottom: insets.bottom + 28 }]} accessibilityViewIsModal>
      <View style={{ alignItems: 'center', gap: 14 }}>
        <View style={styles.icon}>
          <LockKeyhole size={34} color={colors.cognac} strokeWidth={1.7} />
        </View>
        <Text style={styles.title}>BoutiQ est verrouillé</Text>
        <Text style={styles.text}>{failed ? 'Nous n’avons pas pu vous reconnaître. Réessayez.' : 'Identifiez-vous pour ouvrir l’application.'}</Text>
      </View>
      <PrimaryButton label="Déverrouiller" onPress={unlock} variant="caramel" style={{ alignSelf: 'stretch', height: 56 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFill, zIndex: 1000, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  icon: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, textAlign: 'center' },
  text: { fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 22, color: colors.textSoft, textAlign: 'center' },
});
