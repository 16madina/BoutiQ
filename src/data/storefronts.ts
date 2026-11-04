/**
 * ⚠️ DONNÉES DE DÉMONSTRATION — vitrines des boutiques.
 *
 * - Réglages de vitrine (modèle, couleur, accroche, produits mis en avant).
 * - Collections illustrées.
 * - Produits supplémentaires visibles UNIQUEMENT sur la vitrine de leur boutique
 *   (l'accueil et la recherche générale ne changent pas).
 * Photos : Unsplash (licence libre). Prix et stocks fictifs.
 */
import type { CategoryId, Product } from '@/types';
import type { StorefrontSettings, StorefrontTemplateId } from '@/types/storefront';

type DemoCollection = { name: string; coverPhotoId: string; productKeys: string[] };

type ExtraProduct = {
  key: string;
  name: string;
  price: number;
  oldPrice?: number;
  categoryId: CategoryId;
  photoId: string;
  /** Hauteur / largeur */
  aspect: number;
  description: string;
  stock: number;
  sizes?: string[];
};

const CLOTHING = ['S', 'M', 'L', 'XL'];

/** Produits supplémentaires par boutique (vitrine uniquement). */
const EXTRA_PRODUCTS: Record<string, ExtraProduct[]> = {
  'mode-afrique': [
    { key: 'ma-ensemble-wax', name: 'Ensemble wax deux pièces', price: 27000, categoryId: 'mode', photoId: '1784160053635-424cf07f567c', aspect: 1.32, stock: 6, sizes: CLOTHING, description: 'Haut noué et jupe longue assortis, imprimé wax éclatant.' },
    { key: 'ma-robe-imprimee', name: 'Robe imprimée fleurie', price: 24500, oldPrice: 29900, categoryId: 'mode', photoId: '1625646741211-711bdd65c570', aspect: 1.45, stock: 4, sizes: CLOTHING, description: 'Robe ajustée rouge et blanche, coupe midi.' },
    { key: 'ma-tenue-moutarde', name: 'Tenue moutarde et chapeau', price: 32000, categoryId: 'mode', photoId: '1696962678565-bee84e6b9cb6', aspect: 1.4, stock: 0, sizes: CLOTHING, description: 'Robe et chapeau assortis, pour vos cérémonies.' },
    { key: 'ma-robe-coloree', name: 'Robe colorée bustier', price: 19900, oldPrice: 23900, categoryId: 'mode', photoId: '1664151100152-333a5c85efbe', aspect: 1.25, stock: 8, sizes: CLOTHING, description: 'Robe bustier aux motifs géométriques.' },
    { key: 'ma-top-wax', name: 'Top wax croisé', price: 12500, categoryId: 'mode', photoId: '1628144029346-8a98676311b6', aspect: 1.5, stock: 12, sizes: CLOTHING, description: 'Top court noué devant, 100 % coton wax.' },
  ],
  'elegance-ci': [
    { key: 'ec-sac-camel', name: 'Sac cartable camel', price: 34000, categoryId: 'mode', photoId: '1691480250099-a63081ecfcb8', aspect: 1.0, stock: 5, description: 'Cuir camel patiné, double boucle, bandoulière réglable.' },
    { key: 'ec-cabas', name: 'Cabas en cuir', price: 32000, oldPrice: 39000, categoryId: 'mode', photoId: '1624687943971-e86af76d57de', aspect: 1.22, stock: 3, description: 'Grand cabas souple, idéal pour le travail.' },
    { key: 'ec-sac-voyage', name: 'Sac week-end', price: 48000, categoryId: 'mode', photoId: '1691480150204-66dd1eb77391', aspect: 0.95, stock: 2, description: 'Sac de voyage en cuir, poignées renforcées.' },
    { key: 'ec-cartable', name: 'Porte-documents', price: 41000, categoryId: 'mode', photoId: '1603219527847-24c87f552a77', aspect: 0.95, stock: 0, description: 'Porte-documents en cuir pour ordinateur 14".' },
    { key: 'ec-montre', name: 'Montre dorée', price: 45000, oldPrice: 52000, categoryId: 'mode', photoId: '1541778480-fc1752bbc2a9', aspect: 1.1, stock: 7, description: 'Boîtier acier doré, bracelet maille milanaise.' },
    { key: 'ec-creoles', name: 'Créoles torsadées', price: 6500, categoryId: 'mode', photoId: '1615655114865-4cc1bda5901e', aspect: 1.0, stock: 20, description: 'Laiton doré à l’or fin, légères et brillantes.' },
  ],
  'belle-parfums': [
    { key: 'bp-creme-karite', name: 'Crème visage au karité', price: 7500, categoryId: 'beaute', photoId: '1779437141537-62577b216307', aspect: 0.8, stock: 30, description: 'Karité pur et huile de baobab. Hydrate 24 h.' },
    { key: 'bp-serum', name: 'Sérum éclat vitamine C', price: 9900, oldPrice: 12900, categoryId: 'beaute', photoId: '1714041691623-35d1b8c5e28b', aspect: 1.25, stock: 14, description: 'Unifie le teint et estompe les taches.' },
    { key: 'bp-soin-tube', name: 'Soin mains nourrissant', price: 4500, categoryId: 'beaute', photoId: '1617614207953-9beba84738a0', aspect: 1.2, stock: 25, description: 'Texture fondante, parfum fleur d’oranger.' },
    { key: 'bp-flacon', name: 'Lait corps éclat', price: 6900, categoryId: 'beaute', photoId: '1633171036157-78d53387fdc0', aspect: 1.1, stock: 0, description: 'Lait corps léger au beurre de cacao.' },
    { key: 'bp-pinceaux', name: 'Coffret de pinceaux', price: 12000, oldPrice: 15000, categoryId: 'beaute', photoId: '1596462502278-27bfdc403348', aspect: 0.9, stock: 9, description: '10 pinceaux de maquillage, poils synthétiques doux.' },
    { key: 'bp-rouges', name: 'Trio rouges à lèvres', price: 8500, categoryId: 'beaute', photoId: '1631214499500-2e34edcaccfe', aspect: 0.85, stock: 11, description: 'Trois teintes mates longue tenue.' },
    { key: 'bp-palette', name: 'Palette maquillage', price: 15500, categoryId: 'beaute', photoId: '1512496015851-a90fb38ba796', aspect: 1.0, stock: 6, description: 'Fards à paupières, blush et highlighter.' },
  ],
  'tech-zone': [
    { key: 'tz-phone-blanc', name: 'Smartphone 256 Go blanc', price: 189000, oldPrice: 209000, categoryId: 'electronique', photoId: '1591337676887-a217a6970a8a', aspect: 1.1, stock: 4, description: 'Double caméra 48 Mpx, 256 Go, garantie 12 mois.' },
    { key: 'tz-phone-gris', name: 'Smartphone triple caméra', price: 245000, categoryId: 'electronique', photoId: '1592750475338-74b7b21085ab', aspect: 1.2, stock: 2, description: 'Triple caméra, écran 6,7", 512 Go.' },
    { key: 'tz-montre-or', name: 'Montre classique or rose', price: 39000, categoryId: 'electronique', photoId: '1772949400107-f35fd026ab77', aspect: 1.0, stock: 0, description: 'Montre analogique, boîtier or rose.' },
    { key: 'tz-ecouteurs', name: 'Écouteurs sans fil', price: 24000, oldPrice: 29000, categoryId: 'electronique', photoId: '1609692814858-f7cd2f0afa4f', aspect: 0.8, stock: 15, description: 'Réduction de bruit, boîtier de charge, 24 h d’autonomie.' },
  ],
  'maison-moderne': [
    { key: 'mm-canape-cuir', name: 'Canapé cuir beige', price: 245000, oldPrice: 279000, categoryId: 'maison', photoId: '1512212621149-107ffe572d2f', aspect: 0.7, stock: 2, description: 'Canapé 2 places en cuir pleine fleur.' },
    { key: 'mm-canape-coussins', name: 'Canapé et coussins orange', price: 165000, categoryId: 'maison', photoId: '1615800001964-5afd0ae8e49a', aspect: 0.8, stock: 3, description: 'Canapé blanc déhoussable, coussins offerts.' },
    { key: 'mm-salon', name: 'Ensemble salon table basse', price: 98000, categoryId: 'maison', photoId: '1672345158827-7f4aa9467b49', aspect: 0.75, stock: 0, description: 'Table basse en bois et tapis assorti.' },
    { key: 'mm-canape-gris', name: 'Canapé gris clair', price: 199000, categoryId: 'maison', photoId: '1759722665629-29df6ee4f9a5', aspect: 0.78, stock: 1, description: 'Assise profonde, tissu anti-taches.' },
  ],
  'marche-frais': [
    { key: 'mf-mangues', name: 'Mangues Kent (le kilo)', price: 1500, categoryId: 'alimentation', photoId: '1601493700631-2b16ec4b4716', aspect: 1.0, stock: 40, description: 'Mangues mûres à point, chair fondante sans fibres.' },
    { key: 'mf-ananas', name: 'Ananas pain de sucre', price: 1000, categoryId: 'alimentation', photoId: '1550258987-190a2d41a8ba', aspect: 1.3, stock: 25, description: 'Très sucré, cueilli il y a moins de 48 h.' },
    { key: 'mf-bananes', name: 'Bananes douces (le régime)', price: 2500, oldPrice: 3000, categoryId: 'alimentation', photoId: '1571771894821-ce9b6c11b08e', aspect: 0.9, stock: 12, description: 'Régime d’environ 2 kg, prêt à consommer.' },
    { key: 'mf-tomates', name: 'Tomates fraîches (1 kg)', price: 900, categoryId: 'alimentation', photoId: '1592924357228-91a4daadcfea', aspect: 1.1, stock: 30, description: 'Tomates rondes, idéales pour sauces et salades.' },
    { key: 'mf-carottes', name: 'Carottes (1 kg)', price: 800, categoryId: 'alimentation', photoId: '1589927986089-35812388d1f4', aspect: 0.85, stock: 0, description: 'Carottes croquantes du maraîcher.' },
    { key: 'mf-pommes-de-terre', name: 'Pommes de terre (2 kg)', price: 1500, oldPrice: 1800, categoryId: 'alimentation', photoId: '1518977676601-b53f82aba655', aspect: 1.0, stock: 18, description: 'Chair ferme, parfaites pour frites et ragoûts.' },
    { key: 'mf-panier-legumes', name: 'Panier de légumes du jour', price: 6000, categoryId: 'alimentation', photoId: '1557844352-761f2565b576', aspect: 1.1, stock: 8, description: 'Sélection de saison pour 4 personnes, environ 5 kg.' },
    { key: 'mf-riz', name: 'Riz parfumé (5 kg)', price: 6500, categoryId: 'alimentation', photoId: '1586201375761-83865001e31c', aspect: 0.9, stock: 20, description: 'Riz long grain parfumé, sac de 5 kg.' },
    { key: 'mf-huile', name: 'Huile d’olive vierge (1 L)', price: 7500, categoryId: 'alimentation', photoId: '1474979266404-7eaacbcd87c5', aspect: 1.25, stock: 10, description: 'Première pression à froid.' },
    { key: 'mf-epices', name: 'Coffret d’épices', price: 4500, oldPrice: 5500, categoryId: 'alimentation', photoId: '1596040033229-a9821ebd058d', aspect: 1.15, stock: 9, description: 'Curry, piment, gingembre, poivre de Penja et plus.' },
    { key: 'mf-pain', name: 'Pain de campagne', price: 1200, categoryId: 'alimentation', photoId: '1509440159596-0249088772ff', aspect: 0.85, stock: 15, description: 'Cuit au feu de bois chaque matin.' },
  ],
};

/** Réglages de vitrine des boutiques de démonstration. */
export const DEMO_STOREFRONTS: Record<string, StorefrontSettings & { collections?: DemoCollection[]; heroPhotoIds?: string[] }> = {
  'mode-afrique': {
    template: 'editorial',
    heroPhotoIds: ['1572804013309-59a88b7e92f1', '1515372039744-b8f02a3ae446', '1595777457583-95e059d581b8', '1539008835657-9e8e9680c956'],
    accentColor: '#58351F',
    tagline: 'Le wax, à la manière de Dakar',
    promoMessage: 'Retouches offertes sur toutes les robes',
    featuredProductIds: ['ma-ensemble-wax', 'robe-wax', 'ma-robe-imprimee'],
    collections: [
      { name: 'Wax', coverPhotoId: '1784160053635-424cf07f567c', productKeys: ['robe-wax', 'ma-ensemble-wax', 'ma-top-wax', 'ma-robe-coloree'] },
      { name: 'Soirée', coverPhotoId: '1595777457583-95e059d581b8', productKeys: ['robe-soiree', 'ma-tenue-moutarde', 'ma-robe-imprimee'] },
      { name: 'Casual', coverPhotoId: '1515372039744-b8f02a3ae446', productKeys: ['robe-blanche', 'robe-fluide'] },
    ],
  },
  'elegance-ci': {
    template: 'mode',
    accentColor: '#B87A3D',
    heroPhotoIds: ['1511499767150-a48a237f0083', '1590874103328-eac38a683ce7', '1691480250099-a63081ecfcb8'],
    tagline: 'Maroquinerie de créateurs',
    featuredProductIds: ['ec-sac-camel', 'sac-cuir', 'ec-montre'],
    collections: [
      { name: 'Sacs', coverPhotoId: '1691480250099-a63081ecfcb8', productKeys: ['sac-cuir', 'sac-rouge', 'ec-sac-camel', 'ec-cabas', 'ec-sac-voyage', 'ec-cartable'] },
      { name: 'Accessoires', coverPhotoId: '1511499767150-a48a237f0083', productKeys: ['lunettes', 'pochette', 'ec-creoles'] },
      { name: 'Montres', coverPhotoId: '1541778480-fc1752bbc2a9', productKeys: ['ec-montre'] },
    ],
  },
  'belle-parfums': {
    template: 'beaute',
    accentColor: '#A8427A',
    heroPhotoIds: ['1588405748880-12d1d2a59f75', '1512496015851-a90fb38ba796'],
    tagline: 'Soins naturels, beauté authentique',
    featuredProductIds: ['bp-serum', 'parfum', 'bp-creme-karite'],
    collections: [
      { name: 'Parfums', coverPhotoId: '1588405748880-12d1d2a59f75', productKeys: ['parfum'] },
      { name: 'Soins', coverPhotoId: '1779437141537-62577b216307', productKeys: ['bp-creme-karite', 'bp-serum', 'bp-soin-tube', 'bp-flacon'] },
      { name: 'Maquillage', coverPhotoId: '1512496015851-a90fb38ba796', productKeys: ['bp-pinceaux', 'bp-rouges', 'bp-palette'] },
    ],
  },
  'tech-zone': {
    template: 'electronique',
    accentColor: '#1F6FD1',
    heroPhotoIds: ['1511707171634-5f897ff02aa9', '1609692814858-f7cd2f0afa4f', '1592750475338-74b7b21085ab'],
    tagline: 'High-tech garanti 12 mois',
    promoMessage: 'Garantie 12 mois sur tous les téléphones',
    featuredProductIds: ['tz-phone-blanc', 'smartphone', 'montre'],
    collections: [
      { name: 'Smartphones', coverPhotoId: '1592750475338-74b7b21085ab', productKeys: ['smartphone', 'tz-phone-blanc', 'tz-phone-gris'] },
      { name: 'Montres', coverPhotoId: '1523275335684-37898b6baf30', productKeys: ['montre', 'tz-montre-or'] },
      { name: 'Audio', coverPhotoId: '1609692814858-f7cd2f0afa4f', productKeys: ['tz-ecouteurs'] },
    ],
  },
  'maison-moderne': {
    template: 'generaliste',
    heroPhotoIds: ['1555041469-a586c61ea9bc', '1615800001964-5afd0ae8e49a', '1507473885765-e6ed057f782c'],
    accentColor: '#B0502E',
    tagline: 'Le confort au design chaleureux',
    featuredProductIds: ['mm-canape-cuir', 'canape', 'fauteuil'],
    collections: [
      { name: 'Salon', coverPhotoId: '1615800001964-5afd0ae8e49a', productKeys: ['canape', 'fauteuil', 'mm-canape-cuir', 'mm-canape-coussins', 'mm-canape-gris', 'mm-salon'] },
      { name: 'Luminaires', coverPhotoId: '1507473885765-e6ed057f782c', productKeys: ['lampe'] },
    ],
  },
  'marche-frais': {
    template: 'alimentation',
    accentColor: '#2F8A3A',
    heroPhotoIds: ['1610832958506-aa56368176cf', '1542838132-92c53300491e', '1488459716781-31db52582fe9'],
    tagline: 'Livré frais le jour même',
    promoMessage: 'Livraison offerte dès 15 000 FCFA d’achat',
    featuredProductIds: ['mf-panier-legumes', 'fruits', 'mf-mangues', 'mf-riz'],
    collections: [
      { name: 'Fruits', coverPhotoId: '1601493700631-2b16ec4b4716', productKeys: ['fruits', 'mf-mangues', 'mf-ananas', 'mf-bananes'] },
      { name: 'Légumes', coverPhotoId: '1557844352-761f2565b576', productKeys: ['mf-tomates', 'mf-carottes', 'mf-pommes-de-terre', 'mf-panier-legumes'] },
      { name: 'Épicerie', coverPhotoId: '1596040033229-a9821ebd058d', productKeys: ['mf-riz', 'mf-huile', 'mf-epices'] },
      { name: 'Boulangerie', coverPhotoId: '1509440159596-0249088772ff', productKeys: ['mf-pain'] },
    ],
  },
};

/** Boutique de démo montrée en exemple pour chaque modèle (bouton « Voir » du sélecteur). */
export const TEMPLATE_EXAMPLES: Record<StorefrontTemplateId, string> = {
  editorial: 'mode-afrique',
  mode: 'elegance-ci',
  beaute: 'belle-parfums',
  electronique: 'tech-zone',
  alimentation: 'marche-frais',
  generaliste: 'maison-moderne',
};

/** Produits de démo réservés aux vitrines, au format catalogue. */
export const STOREFRONT_EXTRA_PRODUCTS: Product[] = Object.entries(EXTRA_PRODUCTS).flatMap(([storeId, list], s) =>
  list.map(({ key, ...p }, i) => ({
    ...p,
    id: key,
    storeId,
    rating: 4.5 + ((i + s) % 5) / 10,
    reviewsCount: 12 + ((i * 37 + s * 11) % 140),
    // Les nouveautés de vitrine passent avant les produits de démo existants.
    createdRank: -500 + s * 20 + i,
  })),
);

/** Stock de démo des produits existants (les autres sont considérés en stock). */
export const DEMO_STOCK: Record<string, number> = {
  'robe-soiree': 0,
  lunettes: 0,
  'casque-jaune': 0,
  fauteuil: 2,
};
