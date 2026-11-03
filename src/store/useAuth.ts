import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { deviceStorage } from '@/store/persist';

/**
 * Connexion par SMS (code à 6 chiffres).
 *
 * MODE DÉMO : aucun SMS n'est envoyé, le code est toujours DEMO_OTP_CODE.
 * Production : remplacer requestOtp / verifyOtp par
 *   supabase.auth.signInWithOtp({ phone })  et  supabase.auth.verifyOtp({ phone, token, type: 'sms' })
 * (fournisseur SMS à configurer dans Supabase : Twilio, MessageBird, Vonage…).
 */
export const AUTH_DEMO_MODE = true;
export const DEMO_OTP_CODE = '123456';

export interface Session {
  userId: string;
  phone: string;
  signedInAt: string;
}

interface AuthState {
  session: Session | null;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<boolean>;
  signOut: () => void;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      requestOtp: async () => {
        await wait(700);
      },
      verifyOtp: async (phone, code) => {
        await wait(600);
        if (code !== DEMO_OTP_CODE) return false;
        set({ session: { userId: `user_${phone.replace(/\D/g, '')}`, phone, signedInAt: new Date().toISOString() } });
        return true;
      },
      signOut: () => set({ session: null }),
    }),
    { name: 'mymarket-auth', storage: deviceStorage },
  ),
);

/** Indicatifs proposés (Afrique de l'Ouest et centrale en priorité). */
export const COUNTRIES = [
  { code: 'CI', name: "Côte d'Ivoire", dial: '+225', flag: '🇨🇮', digits: 10 },
  { code: 'SN', name: 'Sénégal', dial: '+221', flag: '🇸🇳', digits: 9 },
  { code: 'CM', name: 'Cameroun', dial: '+237', flag: '🇨🇲', digits: 9 },
  { code: 'BJ', name: 'Bénin', dial: '+229', flag: '🇧🇯', digits: 10 },
  { code: 'TG', name: 'Togo', dial: '+228', flag: '🇹🇬', digits: 8 },
  { code: 'BF', name: 'Burkina Faso', dial: '+226', flag: '🇧🇫', digits: 8 },
  { code: 'ML', name: 'Mali', dial: '+223', flag: '🇲🇱', digits: 8 },
  { code: 'GN', name: 'Guinée', dial: '+224', flag: '🇬🇳', digits: 9 },
  { code: 'GA', name: 'Gabon', dial: '+241', flag: '🇬🇦', digits: 8 },
  { code: 'CD', name: 'RD Congo', dial: '+243', flag: '🇨🇩', digits: 9 },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭', digits: 9 },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬', digits: 10 },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]['code'];
