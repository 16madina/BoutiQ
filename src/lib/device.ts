import { Linking, Platform } from 'react-native';

/**
 * Fonctions du téléphone utilisées par les Paramètres : Face ID / empreinte, autorisation
 * des notifications, réglages du système. Rien de tout cela n'existe dans un navigateur :
 * les fonctions y répondent « indisponible » sans charger les modules natifs.
 */

const native = Platform.OS !== 'web';

/* ------------------------------------------------------ Face ID / empreinte */

export interface BiometricSupport {
  /** Le téléphone a un capteur ET une empreinte ou un visage enregistré. */
  available: boolean;
  /** « Face ID », « Empreinte digitale »… pour les libellés. */
  label: string;
  /** Pourquoi ce n'est pas disponible (affiché sous le réglage). */
  reason?: string;
}

export async function biometricSupport(): Promise<BiometricSupport> {
  if (!native) return { available: false, label: 'Face ID ou empreinte', reason: 'Disponible dans l’application sur téléphone.' };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Auth = require('expo-local-authentication') as typeof import('expo-local-authentication');
    const types = await Auth.supportedAuthenticationTypesAsync();
    const face = types.includes(Auth.AuthenticationType.FACIAL_RECOGNITION);
    const label = Platform.OS === 'ios' ? (face ? 'Face ID' : 'Touch ID') : face && types.length === 1 ? 'Reconnaissance du visage' : 'Empreinte digitale';
    if (!(await Auth.hasHardwareAsync())) return { available: false, label: 'Face ID ou empreinte', reason: 'Ce téléphone n’a pas de capteur d’empreinte ou de visage.' };
    if (!(await Auth.isEnrolledAsync())) return { available: false, label, reason: `Activez d’abord ${label} dans les réglages de votre téléphone.` };
    return { available: true, label };
  } catch {
    return { available: false, label: 'Face ID ou empreinte', reason: 'Indisponible sur cet appareil.' };
  }
}

/** Demande le visage, l'empreinte ou, à défaut, le code du téléphone. */
export async function authenticate(reason: string): Promise<boolean> {
  if (!native) return true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Auth = require('expo-local-authentication') as typeof import('expo-local-authentication');
    const result = await Auth.authenticateAsync({ promptMessage: reason, cancelLabel: 'Annuler', disableDeviceFallback: false });
    return result.success;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------ Notifications */

export type NotificationPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function notificationPermission(): Promise<NotificationPermission> {
  if (!native) return 'unavailable';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    return status === 'denied' && !canAskAgain ? 'denied' : 'undetermined';
  } catch {
    return 'unavailable';
  }
}

/** Affiche la demande d'autorisation du téléphone (une seule fois par installation sur iPhone). */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!native) return 'unavailable';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/* ------------------------------------------------------ Réglages du système */

/** Ouvre la page de BoutiQ dans les réglages du téléphone (photos, appareil photo, notifications). */
export const openSystemSettings = () => Linking.openSettings().catch(() => {});
export const systemSettingsAvailable = native;
