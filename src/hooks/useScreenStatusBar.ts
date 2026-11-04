import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';

import { reportStatusBarStyle } from '@/utils/devicePreview';

/**
 * Couleur de la barre d'état (heure, batterie) pour l'écran affiché.
 * « light » = icônes blanches, pour les en-têtes sur photo sombre.
 * Revient au réglage de l'app (icônes foncées) quand on quitte l'écran.
 */
export function useScreenStatusBar(style: 'light' | 'dark') {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(style, true);
      reportStatusBarStyle(style);
      return () => {
        setStatusBarStyle('dark', true);
        reportStatusBarStyle('dark');
      };
    }, [style]),
  );
}
