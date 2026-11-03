import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Stockage persistant sur l'appareil (remplacé par Supabase quand le backend sera branché). */
export const deviceStorage = createJSONStorage(() => AsyncStorage);

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
