-- =============================================================================
-- BoutiQ — Module d'ajout de produits
--
--  * product_status 'hidden' : produit retiré de la vente par le vendeur (il peut le
--    remettre en vente). 'draft' reste le brouillon jamais publié. Seuls les produits
--    'published' sont visibles des clients (politique « products: lecture » inchangée).
--  * Détails facultatifs : tailles, couleurs, variantes avec prix, livraison.
--  * L'identifiant du produit est généré par l'app : renvoyer la même publication
--    (double appui, réseau instable) met à jour la même ligne au lieu d'en créer deux.
-- Aucune donnée supprimée ; politiques RLS inchangées (propriétaire de la boutique).
-- =============================================================================

alter type public.product_status add value if not exists 'hidden';

alter table public.products
  add column sizes text[] not null default '{}' check (cardinality(sizes) <= 20),
  add column colors text[] not null default '{}' check (cardinality(colors) <= 20),
  -- [{ "id": "…", "label": "Rouge · M", "price": 15000, "stock": 3 }]
  add column variants jsonb not null default '[]'
    check (jsonb_typeof(variants) = 'array' and jsonb_array_length(variants) <= 30),
  add column delivery_note text check (char_length(delivery_note) <= 160);
