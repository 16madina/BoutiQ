import {
  Dumbbell,
  ShoppingBag,
  ShoppingBasket,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';

import { CATEGORIES } from '@/data/demo';
import type { CategoryId } from '@/types';
import type { LocalImage } from '@/types/seller';
import { photoUrl } from '@/utils/images';

/** Pictogramme affiché dans le logo tant que le vendeur n'a pas ajouté le sien. */
export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  mode: Shirt,
  electronique: Smartphone,
  maison: Sofa,
  beaute: Sparkles,
  alimentation: ShoppingBasket,
  sport: Dumbbell,
};

export function categoryIcon(categoryId?: CategoryId): LucideIcon {
  return categoryId ? CATEGORY_ICONS[categoryId] : ShoppingBag;
}

/** Bannière proposée par défaut (portant de vêtements pour la mode, photo de la catégorie sinon). */
const FASHION_BANNER = '1567401893414-76b7b1e5a7a5';

export function defaultBanner(categoryId?: CategoryId): LocalImage {
  const photoId =
    !categoryId || categoryId === 'mode'
      ? FASHION_BANNER
      : (CATEGORIES.find((c) => c.id === categoryId)?.coverPhotoId ?? FASHION_BANNER);
  return { uri: photoUrl(photoId, 600, 0.5), width: 1200, height: 600 };
}

/** Photo d'illustration de l'écran « Ouvrez votre boutique ». */
export const OPEN_STORE_HERO = '1611432579699-484f7990b127';
