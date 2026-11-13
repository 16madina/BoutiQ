import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { deviceStorage } from '@/store/persist';

interface SettingsState {
  /** L'utilisateur veut recevoir les notifications sur ce téléphone. */
  notifications: boolean;
  /** Demander Face ID / l'empreinte à l'ouverture de l'application. */
  biometricLock: boolean;
  set: (patch: Partial<Pick<SettingsState, 'notifications' | 'biometricLock'>>) => void;
}

/** Réglages de l'application, gardés sur l'appareil. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      notifications: false,
      biometricLock: false,
      set: (patch) => set(patch),
    }),
    { name: 'boutiq-settings', storage: deviceStorage },
  ),
);
