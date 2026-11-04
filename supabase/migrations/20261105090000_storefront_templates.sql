-- =============================================================================
-- BoutiQ — Cinq modèles de boutique et message promotionnel
--
--  * Modèle « maison » renommé « alimentation » (les boutiques maison utilisent
--    désormais le modèle généraliste ; la table était vide au moment du changement).
--  * storefront_settings.promo_message : message promotionnel écrit par le vendeur.
--  * storefront_public expose promo_message (colonne ajoutée en fin de vue).
-- Aucune donnée supprimée.
-- =============================================================================

alter type public.storefront_template rename value 'maison' to 'alimentation';

alter table public.storefront_settings
  add column promo_message text check (char_length(promo_message) <= 80);

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
  f.promo_message
from public.stores s
left join public.storefront_settings f on f.store_id = s.id
where s.status <> 'suspended';
