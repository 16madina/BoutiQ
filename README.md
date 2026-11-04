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

## Livraison 3 : vitrine publique des boutiques

Page `app/store/[id].tsx` (même route : les liens existants restent valides). L'accueil n'est pas modifié.

**Contenu de la vitrine** : grande bannière, logo, nom, accroche, ville · Suivre / Contacter / Partager ·
Coups de cœur · Collections illustrées · Nouveautés · Promotions · catalogue complet en Masonry avec
recherche limitée à la boutique et filtres (catégorie, prix, disponibilité, promotions, tri).

**6 modèles prêts à l'emploi** (`src/storefront/templates.ts`), d'après la maquette « Les 6 modèles de boutiques
BoutiQ » — mêmes données boutique / produits / commandes, présentation différente :

| Modèle | En-tête | Rayons | Cartes produits | Exemple |
|---|---|---|---|---|
| Éditorial Élégance | nom en serif dans la barre, collage de photos, grand titre centré | grandes cartes photo | portrait | `mode-afrique` |
| Mode & Accessoires | photo sombre en diaporama, logo + nom en haut, titre + « Explorer » | icônes rondes | portrait | `elegance-ci` |
| Beauté & Cosmétiques | (inchangé) photo puis logo et nom centrés | photos rondes | grille best-sellers | `belle-parfums` |
| Électronique | photo en diaporama puis bloc sombre (logo, nom, boutons) | vignettes photo carrées | produit phare sombre + carrousel | `tech-zone` |
| Alimentation | photo encadrée en diaporama, identité, services (ville, livraison) | vignettes photo | grille 2 × 2 + carrousel | `marche-frais` |
| Généraliste | tons terracotta : logo + nom centrés, photo d'ambiance, « Explorer les rayons » | grille 3 × 2 | carte claire | `maison-moderne` |

La bannière est un **diaporama** : le vendeur ajoute jusqu'à 5 photos (`SellerStore.banners`,
`storefront_settings.hero_paths`). Le bouton de la bannière, la loupe et « Voir tout » mènent au catalogue.
Les rayons sont illustrés automatiquement d'après leur nom (`src/storefront/collectionIcons.ts`).
Suivre / Contacter / Partager : mêmes trois boutons sur toutes les vitrines.

Chaque modèle a aussi ses titres de sections, ses collections suggérées et sa couleur conseillée.
Les statistiques sont une ligne discrète sous le nom. Le message promotionnel n'apparaît que si le vendeur
l'écrit, et les promotions ne montrent que de vrais prix barrés. Une boutique sans produit affiche un état vide
(aucun faux produit).

**Création** : l'étape 3 propose le modèle adapté à la catégorie (accepter ou en choisir un autre) ;
les collections sont facultatives.

**Personnaliser ma boutique** (`app/customize.tsx`, accessible depuis l'accueil vendeur, l'onglet Boutique et
l'écran « Boutique prête ») : aperçu en direct de la vraie vitrine + onglets Modèle, Couleur, Textes et photos
(logo, bannière, nom, description, accroche, message promotionnel), Collections (ajout, ordre), Vedettes (6 max).
Bouton « Modèle initial » et « Enregistrer » ; quitter sans enregistrer demande confirmation.
Pas de constructeur libre ni de glisser-déposer.

```
src/types/storefront.ts         Types purs (réutilisables par une vitrine web)
src/storefront/templates.ts     5 modèles + calcul des couleurs (sans dépendance React Native)
src/api/storefront.ts           getStorefront / buildOwnStorefront (aperçu) / getStorefrontSections
src/components/storefront/      StoreHero, StorefrontBody, StoreSections, TemplatePicker, filtres, contact, partage
src/data/storefronts.ts         ⚠️ Démo : réglages des vitrines + produits visibles uniquement sur leur vitrine
```


## Livraison 4 : ajout de produits ultra-simple

Écran `app/product-editor.tsx` (« Ajouter un produit » / « Modifier le produit ») :
1. **Photos** : grands boutons « Prendre une photo » et « Choisir dans ma galerie », 6 photos au plus,
   flèches pour changer l'ordre (la première est la couverture).
2. **Nom et prix** (obligatoires, devise de la boutique : FCFA, GNF pour la Guinée).
3. **Catégorie** proposée d'après le nom (« Mangues » → Alimentation), modifiable d'un toucher.
4. **Plus de détails** (facultatif) : description, quantité / épuisé, tailles, couleurs, variantes avec prix
   et stock, ancien prix (promotion), collection, livraison propre au produit.

Brouillon gardé automatiquement, aperçu client, messages simples (« Il manque : le prix »), anti double
publication (même identifiant sur l'appareil et en ligne → mise à jour, jamais de doublon), écran de
confirmation. « Mes produits » : En vente / Masqué / Brouillon / Épuisé, modifier, masquer, remettre en vente,
supprimer (avec confirmation), tirer pour actualiser depuis Supabase.

**Enregistrement en ligne** (`src/api/sellerSync.ts`, `src/lib/media.ts`) :
- connexion anonyme Supabase du vendeur (à activer : Authentication → Allow anonymous sign-ins) ;
  le numéro de téléphone pourra y être rattaché plus tard (`updateUser({ phone })`) sans perdre la boutique ;
- boutique créée une seule fois dans `stores` (+ réglages de vitrine, collections, informations vendeur) ;
- photos compressées (JPEG, 1600 px max) envoyées dans `store-media/<boutique>/products/<produit>/` ;
- nouvelles tentatives automatiques en cas de coupure ; sans réseau, le produit reste sur le téléphone
  (« Sur ce téléphone seulement · Envoyer ») ;
- relecture de la boutique et de tous les produits du vendeur à l'ouverture de l'espace vendeur.

**« Remplir avec l'IA »** (`src/api/productAssistant.ts`) : prêt mais désactivé. S'active seulement si
`EXPO_PUBLIC_PRODUCT_ASSISTANT_URL` pointe vers un service BoutiQ (ex. Edge Function qui garde la clé d'IA).
Ne propose que nom, catégorie et description ; jamais de prix, marque, composition ni caractéristiques.

Testé de bout en bout sur Supabase : publication (2 photos compressées), affichage dans la boutique,
modification du prix, masquer / remettre en vente, rupture de stock, brouillon sans prix, suppression
(fiche + photos), coupure réseau puis nouvel essai, relecture après effacement local ; un visiteur voit
les produits en vente mais ne peut ni modifier ni déposer de photo (RLS).

## Supabase (connecté)

Projet **BoutiQ** dans l'organisation **kidi+** : `ddfnbjdsszopriydvhaf` (Paris, eu-west-3). Distinct du projet Kidi+.

Migrations appliquées (dans cet ordre) :
1. `20261103120000_seller_module.sql` : boutiques, vendeurs, collections, produits, photos, abonnés, vues, commandes, RLS, stockage (`store-media` public, `seller-documents` privé).
2. `20261104090000_storefront.sql` : réglages de vitrine + vue `storefront_public`.
3. `20261104100000_security_hardening.sql` : fonctions RLS déplacées dans un schéma `private` non exposé, nombre d'abonnés public, index, une seule politique de lecture par table.
4. `20261105090000_storefront_templates.sql` : modèle « maison » renommé « alimentation », message promotionnel (`promo_message`) exposé dans `storefront_public`.
5. `20261105120000_storefront_editorial_slides.sql` : modèle « editorial », photos du diaporama (`hero_paths`).
6. `20261106090000_product_module.sql` : statut « hidden », tailles, couleurs, variantes, livraison du produit.
7. `20261106100000_product_drafts.sql` : un brouillon peut être enregistré sans nom ni prix.

Configuration de l'app : copier `.env.example` en `.env.local` (clé **publishable** uniquement, jamais `service_role`).
Sans ces variables, l'app reste en mode démo.

```
src/lib/supabase.ts         Client (session persistée), URL publique des fichiers store-media
src/types/database.ts       Types générés depuis le schéma
src/api/remoteCatalog.ts    Lecture des vitrines, produits publiés et collections (ajoutés à la démo)
```

Les boutiques et produits réels apparaissent automatiquement : sur leur vitrine dès la publication,
dans l'accueil et la recherche une fois la boutique vérifiée.

**Reste à faire pour écrire dans la base :**
1. Activer la connexion par téléphone : Supabase → Authentication → Sign In / Providers → Phone,
   avec un fournisseur SMS (Twilio, Vonage, MessageBird…).
2. Remplacer la session de démo (`useAuth`) par `signInWithOtp` / `verifyOtp`.
3. Enregistrer la boutique, les produits et les photos du vendeur dans Supabase (aujourd'hui sur l'appareil).
   Les réglages de « Personnaliser ma boutique » iront dans `storefront_settings` (modèle, couleur, accroche,
   message promo) et `products.featured_position` (vedettes) — les colonnes existent déjà.
