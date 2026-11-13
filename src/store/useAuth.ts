import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { supabase, supabaseEnabled } from '@/lib/supabase';
import { deviceStorage } from '@/store/persist';

/**
 * Connexion par SMS (code à 6 chiffres).
 *
 * - Mode réel (EXPO_PUBLIC_SMS_AUTH=1 dans .env.local, fournisseur SMS configuré dans
 *   Supabase → Authentication → Phone) : le numéro est RATTACHÉ au compte déjà utilisé
 *   sur l'appareil (boutique, commandes, favoris conservés) via updateUser + vérification.
 * - Mode démo (par défaut) : aucun SMS n'est envoyé, le code est DEMO_OTP_CODE.
 */
export const AUTH_DEMO_MODE = !(supabaseEnabled && process.env.EXPO_PUBLIC_SMS_AUTH === '1');
export const DEMO_OTP_CODE = '123456';

export interface Session {
  userId: string;
  phone: string;
  signedInAt: string;
}

interface AuthState {
  session: Session | null;
  /** Lève une erreur avec un message simple si l'envoi échoue. */
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<boolean>;
  signOut: () => void;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const e164 = (phone: string) => phone.replace(/[^\d+]/g, '');
/** Rattachement du numéro à un compte existant (anonyme) plutôt que nouvelle connexion. */
let linking = false;

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      requestOtp: async (phone) => {
        if (AUTH_DEMO_MODE || !supabase) {
          await wait(700);
          return;
        }
        const { data } = await supabase.auth.getSession();
        linking = !!data.session?.user.is_anonymous;
        const { error } = linking
          ? await supabase.auth.updateUser({ phone: e164(phone) })
          : await supabase.auth.signInWithOtp({ phone: e164(phone) });
        if (error) throw new Error('Impossible d’envoyer le SMS. Vérifiez le numéro et réessayez.');
      },
      verifyOtp: async (phone, code) => {
        if (AUTH_DEMO_MODE || !supabase) {
          await wait(600);
          if (code !== DEMO_OTP_CODE) return false;
          set({ session: { userId: `user_${phone.replace(/\D/g, '')}`, phone, signedInAt: new Date().toISOString() } });
          return true;
        }
        const { data, error } = await supabase.auth.verifyOtp({ phone: e164(phone), token: code, type: linking ? 'phone_change' : 'sms' });
        if (error || !data.user) return false;
        set({ session: { userId: data.user.id, phone, signedInAt: new Date().toISOString() } });
        return true;
      },
      // Le compte Supabase est conservé : boutique et commandes restent liées à ce téléphone.
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
