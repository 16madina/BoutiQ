-- =============================================================================
-- BoutiQ — Sixième modèle (« Éditorial Élégance ») et diaporama de bannière
--
--  * storefront_template : nouvelle valeur 'editorial'.
--  * storefront_settings.hero_paths : photos du diaporama (dossier store-media, 5 au plus),
--    dans l'ordre d'affichage. La bannière principale reste stores.banner_path.
--  * storefront_public expose hero_paths (colonne ajoutée en fin de vue).
-- Aucune donnée supprimée.
-- =============================================================================

alter type public.storefront_template add value if not exists 'editorial' before 'mode';

alter table public.storefront_settings
  add column hero_paths text[] not null default '{}'
  check (cardinality(hero_paths) <= 5);

create or replace view public.storefront_public
with (security_invoker = true) as
select
  s.id,
  s.slug,
  s.name,
  s.description,
  s.city,
  s.country,
  s.category,
  s.logo_path,
  s.banner_path,
  s.sales_enabled,
  s.status = 'verified' as verified,
  coalesce(f.template, 'generaliste') as template,
  coalesce(f.accent_color, '#B87A3D') as accent_color,
  f.tagline,
  f.contact_phone,
  private.store_follower_count(s.id) as followers,
  f.promo_message,
  coalesce(f.hero_paths, '{}') as hero_paths
from public.stores s
left join public.storefront_settings f on f.store_id = s.id
where s.status <> 'suspended';
