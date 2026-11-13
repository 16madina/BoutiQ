import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';

import { isDark } from '@/theme';
import { reportStatusBarStyle } from '@/utils/devicePreview';

/**
 * Couleur de la barre d'état (heure, batterie) pour l'écran affiché.
 * « light » = icônes blanches, pour les en-têtes sur photo sombre.
 * Revient au réglage de l'app (icônes foncées) quand on quitte l'écran.
 */
export function useScreenStatusBar(style: 'light' | 'dark') {
  // En mode sombre, toute l'application a un fond foncé : les icônes restent claires partout.
  const wanted = isDark ? 'light' : style;
  const base = isDark ? 'light' : 'dark';
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(wanted, true);
      reportStatusBarStyle(wanted);
      return () => {
        setStatusBarStyle(base, true);
        reportStatusBarStyle(base);
      };
    }, [wanted, base]),
  );
}
