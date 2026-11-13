import { Appearance, Platform } from 'react-native';

/**
 * Thème choisi dans Paramètres → Apparence.
 *
 * Les couleurs de l'application sont fixées une fois, au démarrage (src/theme/index.ts).
 * Le choix doit donc se lire tout de suite, sans attendre : petit fichier sur le téléphone,
 * localStorage dans un navigateur. Changer de thème relance l'application.
 */

export type ThemePreference = 'light' | 'dark' | 'system';

const KEY = 'boutiq-theme';

function nativeFile() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  return new File(Paths.document, `${KEY}.txt`);
}

export function readThemePreference(): ThemePreference {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    } else {
      const file = nativeFile();
      raw = file.exists ? file.textSync() : null;
    }
    const value = raw?.trim();
    return value === 'dark' || value === 'system' ? value : 'light';
  } catch {
    return 'light';
  }
}

export function writeThemePreference(preference: ThemePreference) {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(KEY, preference);
      return;
    }
    const file = nativeFile();
    if (!file.exists) file.create();
    file.write(preference);
  } catch {
    // Écriture impossible : le thème actuel est gardé.
  }
}

/** Thème réellement affiché pour un choix donné (« Automatique » suit le téléphone). */
export function resolveScheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference;
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

/** Relance l'application pour appliquer un nouveau thème. */
export async function restartApp() {
  if (Platform.OS === 'web') {
    window.location.reload();
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { reloadAppAsync } = require('expo') as typeof import('expo');
  await reloadAppAsync('Changement de thème');
}
