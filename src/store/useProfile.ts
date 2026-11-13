import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { deviceStorage } from '@/store/persist';
import type { LocalImage } from '@/types/seller';

/** Profil du client : sert à saluer et à préremplir la livraison. */
export interface Profile {
  fullName: string;
  phone: string;
  city: string;
  address: string;
  /** Photo de profil (gardée sur l'appareil, puis envoyée en ligne). */
  avatar?: LocalImage;
  /** Date de création du compte (« Membre depuis… »). */
  memberSince?: string;
}

interface ProfileState extends Profile {
  update: (patch: Partial<Profile>) => void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      fullName: '',
      phone: '',
      city: '',
      address: '',
      update: (patch) => set(patch),
    }),
    { name: 'boutiq-profile', storage: deviceStorage },
  ),
);

/** Prénom pour « Bonjour … ». */
export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? '';

/** Initiales pour l'avatar. */
export const initialsOf = (fullName: string) =>
  fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
