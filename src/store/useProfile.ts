import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { deviceStorage } from '@/store/persist';

/** Profil du client : sert à saluer et à préremplir la livraison. */
export interface Profile {
  fullName: string;
  phone: string;
  city: string;
  address: string;
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
