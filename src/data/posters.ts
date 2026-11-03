import type { Banner } from '@/types';

type SearchLink = Banner['link'];

/** Affiche verticale de l'accueil : une grande photo, ou une grille de 4 produits. */
export type Poster =
  | {
      kind: 'photo';
      id: string;
      kicker: string;
      title: string;
      background: string;
      photoId: string;
      link: SearchLink;
    }
  | {
      kind: 'grid';
      id: string;
      title: string;
      background: string;
      /** 4 produits du catalogue */
      productIds: [string, string, string, string];
      /** Affiche le pourcentage de remise sous chaque produit */
      showDiscount: boolean;
      link: SearchLink;
    };

export const POSTERS: Poster[] = [
  {
    kind: 'photo',
    id: 'fetes',
    kicker: 'La saison des fêtes commence',
    title: 'Tenues de fête\nen wax',
    background: '#9E2B25',
    photoId: '1595777457583-95e059d581b8',
    link: { pathname: '/search', params: { category: 'mode' } },
  },
  {
    kind: 'photo',
    id: 'tech',
    kicker: 'Nouveau sur BoutiQ',
    title: 'Découvrez\nla tech 2.0',
    background: '#3B2A1F',
    photoId: '1505740420928-5e560c06d30e',
    link: { pathname: '/search', params: { category: 'electronique' } },
  },
  {
    kind: 'grid',
    id: 'fin-bientot',
    title: 'Offres qui se terminent bientôt',
    background: '#D83A35',
    productIds: ['sac-cuir', 'smartphone', 'baskets', 'collier'],
    showDiscount: true,
    link: { pathname: '/search', params: { promo: '1' } },
  },
  {
    kind: 'grid',
    id: 'boutiques',
    title: 'Économisez avec nos boutiques',
    background: '#B87A3D',
    productIds: ['fruits', 'lampe', 'parfum', 'fauteuil'],
    showDiscount: false,
    link: { pathname: '/search', params: { sort: 'relevance' } },
  },
  {
    kind: 'grid',
    id: 'populaires',
    title: 'Offres populaires',
    background: '#5E6B33',
    productIds: ['montre', 'lunettes', 'casque-jaune', 'ballon'],
    showDiscount: true,
    link: { pathname: '/search', params: { promo: '1' } },
  },
];

/** Produits de la bande « Offres à durée limitée ». */
export const LIMITED_DEAL_IDS = ['sac-cuir', 'smartphone', 'montre', 'baskets', 'collier', 'lunettes', 'casque-jaune', 'ballon'];
