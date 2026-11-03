# BoutiQ — Livraison 1 : page d'accueil

Marketplace africaine multivendeurs. Application **native** React Native + Expo (SDK 58), TypeScript, Expo Router.

## Lancer sur un vrai téléphone

Prérequis : [Node.js 22 LTS](https://nodejs.org) et l'application **Expo Go** (App Store / Play Store).

```bash
cd mymarket
npm install
npx expo install --fix   # aligne les versions natives sur le SDK
npx expo start
```

Scannez le QR code avec l'appareil photo (iOS) ou Expo Go (Android).

> Liquid Glass (barre d'onglets) s'active automatiquement sur iOS 26+. Ailleurs : flou natif (iOS) ou surface ivoire (Android).

## Structure

```
app/                      Routes (Expo Router)
  (tabs)/_layout.tsx      Onglets + barre flottante
  (tabs)/index.tsx        ACCUEIL
  (tabs)/categories|stores|favorites|orders.tsx
  product/[id].tsx        Fiche produit
  store/[id].tsx          Vitrine vendeur (suivre, partager, collections)
  search.tsx              Recherche produits + catégories + boutiques
  filters.tsx             Bottom sheet natif (formSheet) : promo, prix, tri
  cart.tsx · notifications.tsx · account.tsx
src/
  theme/                  Couleurs, typographies, espacements, rayons, ombres
  components/             AppHeader, SearchBar, CategoryCarousel, PromoBanner,
                          ProductMasonryGrid, ProductCard, ProductPrice, DiscountBadge,
                          FavoriteButton, AddToCartButton, StoreLink, FloatingTabBar,
                          ProductSkeleton, EmptyState, …
  api/catalog.ts          Accès catalogue (simulé, paginé) — à brancher sur l'API réelle
  data/demo.ts            ⚠️ Données de démonstration (produits, boutiques, bannières)
  hooks/                  usePaginatedProducts (pagination, refresh, erreurs), debounce
  store/useShop.ts        Favoris, panier, boutiques suivies, filtres (zustand)
```

## Choix techniques

| Besoin | Solution |
|---|---|
| Grille asymétrique virtualisée | `@shopify/flash-list` v2, mode `masonry` (placement dans la colonne la plus courte) |
| Images | `expo-image` : cache mémoire + disque, `recyclingKey`, URL dimensionnée à la taille réelle |
| Animations | Reanimated 4 (ressorts sur le thread UI) |
| Barre de verre | `expo-glass-effect` (iOS 26) → `expo-blur` → fond ivoire (Android) |
| Bottom sheet | `formSheet` natif de react-native-screens (paliers + poignée) |
| Haptique | `expo-haptics` (favori, panier, onglets, catégories) |

## Livraison 2 : boutiques vendeurs

Parcours : **Mon compte → Ouvrir ma boutique → connexion SMS → 3 étapes → boutique en ligne**.

```
app/auth.tsx                 Connexion par SMS (MODE DÉMO : code 123456)
app/open-store/              Accueil du parcours, étapes identity / seller / style, succès
app/seller/                  Espace vendeur : Accueil (tableau de bord), Produits, Commandes, Boutique
app/product-editor.tsx       Ajout / modification de produit (6 photos, prix barré, stock, collection)
app/verification.tsx         Statut et envoi en vérification
app/select.tsx               Bottom sheet natif de sélection (catégorie, ville, pays, collection)
src/store/useSeller.ts       Boutique, produits, brouillon, statut — persistés sur l'appareil
src/store/useAuth.ts         Session SMS (démo)
src/api/sellerCatalog.ts     Expose la boutique locale au catalogue public (vitrine, recherche, fiches)
src/config/links.ts          Adresse publique + partage WhatsApp (renseigner PUBLIC_WEB_BASE plus tard)
supabase/migrations/         Schéma + RLS prêts à appliquer (NON appliqués)
```

**Règles métier**
- Une boutique est visible dès sa création ; **ventes et paiements uniquement une fois vérifiée**
  (bouton panier masqué, bandeau « en cours de vérification », commande refusée côté base).
- Vérification : nom + téléphone, pièce d'identité, logo, 1 produit publié → envoi → décision de la modération.
  En démo, l'écran Vérification propose « Approuver / Refuser » pour simuler cette décision.
- Les produits d'une boutique non vérifiée n'apparaissent que sur sa vitrine ; une fois vérifiée, partout.
- L'adresse publique est définitive après création (les liens partagés restent valides).
- Acheteur ⇄ vendeur : bouton « Espace vendeur » (Mon compte) / « Acheteur » (tableau de bord), même session.

**Brancher Supabase plus tard**
1. Créer le projet BoutiQ et appliquer `supabase/migrations/20261103120000_seller_module.sql`.
2. Activer l'authentification par téléphone (fournisseur SMS : Twilio, Vonage…).
3. Remplacer le corps de `useAuth` (signInWithOtp / verifyOtp) et des actions de `useSeller` par les appels Supabase ;
   les écrans n'ont pas à changer.

## À noter

- **Données de démo** : 21 produits × 3 séries (63 articles), 10 boutiques. Photos Unsplash sans logos de marque.
- **Grille 2 colonnes** sur téléphone (3 sur tablette) : la maquette montre 3 colonnes, mais sur un écran de 375 pt les cartes deviendraient trop petites.
- Favoris et panier en mémoire : la persistance arrive avec les comptes utilisateurs.
- Paiement, suivi de commande et espace vendeur : prochaines livraisons.
- Pour tester l'état d'erreur réseau : `SIMULATE_FLAKY_NETWORK = true` dans `src/api/catalog.ts`.
