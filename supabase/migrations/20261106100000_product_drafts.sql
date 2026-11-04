-- =============================================================================
-- BoutiQ — Brouillons de produits incomplets
--
-- Un brouillon peut être enregistré en ligne avant d'avoir un nom ou un prix
-- (le vendeur le termine plus tard, même sur un autre téléphone).
-- Un produit en vente ou masqué garde les mêmes exigences qu'avant :
-- nom de 2 à 60 caractères et prix supérieur à 0.
-- =============================================================================

alter table public.products
  drop constraint products_price_check,
  add constraint products_price_check check (price > 0 or (status = 'draft' and price >= 0));

alter table public.products
  drop constraint products_name_check,
  add constraint products_name_check check (
    char_length(btrim(name)) between 2 and 60
    or (status = 'draft' and char_length(name) <= 60)
  );
