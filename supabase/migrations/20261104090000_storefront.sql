-- =============================================================================
-- BoutiQ — Vitrine publique des boutiques
-- NON APPLIQUÉ : à exécuter après 20261103120000_seller_module.sql.
--
-- Ajouts (aucune table existante n'est supprimée ni renommée) :
--  * storefront_settings : modèle, couleur, accroche, contact public, produits mis en avant.
--  * store_collections.cover_path : photo de couverture d'une collection.
--  * products.featured_position : ordre des produits « mis en avant ».
--  * storefront_public : vue en lecture seule utilisée par l'app ET la future vitrine web.
-- =============================================================================

create type public.storefront_template as enum ('mode', 'beaute', 'electronique', 'maison', 'generaliste');

create table public.storefront_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  template public.storefront_template not null default 'generaliste',
  accent_color text not null default '#B87A3D' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  tagline text check (char_length(tagline) <= 60),
  -- Numéro affiché sur la vitrine (facultatif, choisi par le vendeur ; distinct des infos privées).
  contact_phone text check (contact_phone is null or contact_phone ~ '^\+?[0-9 ]{8,20}$'),
  updated_at timestamptz not null default now()
);

create trigger storefront_settings_updated_at before update on public.storefront_settings
  for each row execute function public.set_updated_at();

alter table public.store_collections add column cover_path text;
alter table public.products add column featured_position smallint check (featured_position between 0 and 11);

create index products_featured_idx on public.products (store_id, featured_position) where featured_position is not null;

-- RLS : lecture publique (comme les vitrines), modification par le propriétaire uniquement.
alter table public.storefront_settings enable row level security;

create policy "storefront: lecture publique" on public.storefront_settings
  for select to anon, authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.status <> 'suspended'));

create policy "storefront: gestion par le propriétaire" on public.storefront_settings
  for all to authenticated
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

-- Le vendeur peut maintenant ordonner ses produits mis en avant.
grant update (featured_position) on public.products to authenticated;

-- Vue publique d'une vitrine (adresse /<slug>) : une seule requête pour l'app et le web.
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
  (select count(*) from public.store_follows sf where sf.store_id = s.id) as followers
from public.stores s
left join public.storefront_settings f on f.store_id = s.id
where s.status <> 'suspended';

grant select on public.storefront_public to anon, authenticated;
