-- =============================================================================
-- BoutiQ — Durcissement après les contrôles Supabase (security / performance advisors)
--
--  1. Les fonctions utilisées par les règles RLS quittent le schéma `public`
--     (exposé par l'API) pour un schéma `private` non exposé : on ne peut plus
--     les appeler via /rest/v1/rpc. Les politiques existantes restent liées
--     (elles référencent la fonction, pas son nom).
--  2. Nombre d'abonnés public via une fonction dédiée : la table store_follows
--     n'est lisible que par l'abonné et la boutique (RLS), un simple count()
--     dans la vue renverrait 0 aux visiteurs.
--  3. `is_slug_available` réservée aux comptes connectés (le parcours de
--     création démarre après la connexion par SMS).
--  4. Performance : index manquant, une seule politique SELECT par table.
--
-- Avertissements restants, volontaires :
--  * reserved_slugs : RLS sans politique = illisible côté client (voulu).
--  * is_slug_available / submit_store_for_review / store_dashboard_stats :
--    appelables par un compte connecté (elles vérifient elles-mêmes la propriété).
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- 1. Fonctions d'aide RLS hors de l'API
alter function public.is_store_owner(uuid) set schema private;
-- Les politiques de lecture publique l'évaluent aussi pour les visiteurs : sans ce droit,
-- un visiteur obtiendrait une erreur au lieu de « false ». Sans risque : hors de l'API.
grant execute on function private.is_store_owner(uuid) to anon, authenticated;

create or replace function private.owns_storage_folder(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_folder text := (storage.foldername(p_name))[1];
begin
  if v_folder !~ '^[0-9a-f-]{36}$' then
    return false;
  end if;
  return private.is_store_owner(v_folder::uuid);
end;
$$;
revoke execute on function private.owns_storage_folder(text) from public;
grant execute on function private.owns_storage_folder(text) to authenticated;

-- Les politiques de stockage pointent vers la nouvelle fonction
drop policy "store-media: envoi dans son dossier" on storage.objects;
drop policy "store-media: remplacement dans son dossier" on storage.objects;
drop policy "store-media: suppression dans son dossier" on storage.objects;
drop policy "seller-documents: propriétaire uniquement" on storage.objects;

create policy "store-media: envoi dans son dossier" on storage.objects
  for insert to authenticated with check (bucket_id = 'store-media' and private.owns_storage_folder(name));
create policy "store-media: remplacement dans son dossier" on storage.objects
  for update to authenticated
  using (bucket_id = 'store-media' and private.owns_storage_folder(name))
  with check (bucket_id = 'store-media' and private.owns_storage_folder(name));
create policy "store-media: suppression dans son dossier" on storage.objects
  for delete to authenticated using (bucket_id = 'store-media' and private.owns_storage_folder(name));
create policy "seller-documents: propriétaire uniquement" on storage.objects
  for all to authenticated
  using (bucket_id = 'seller-documents' and private.owns_storage_folder(name))
  with check (bucket_id = 'seller-documents' and private.owns_storage_folder(name));

drop function public.owns_storage_folder(text);

-- Statistiques : le corps appelait public.is_store_owner
create or replace function public.store_dashboard_stats(p_store_id uuid)
returns table (revenue bigint, orders_count bigint, views_30d bigint, followers bigint, published_products bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select sum(o.total) from public.orders o where o.store_id = p_store_id and o.status <> 'cancelled' and o.created_at > now() - interval '30 days'), 0),
    (select count(*) from public.orders o where o.store_id = p_store_id and o.created_at > now() - interval '30 days'),
    (select count(*) from public.store_views v where v.store_id = p_store_id and v.viewed_at > now() - interval '30 days'),
    (select count(*) from public.store_follows f where f.store_id = p_store_id),
    (select count(*) from public.products p where p.store_id = p_store_id and p.status = 'published')
  where private.is_store_owner(p_store_id);
$$;

-- 2. Nombre d'abonnés public
create or replace function private.store_follower_count(p_store_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.store_follows f where f.store_id = p_store_id;
$$;
revoke execute on function private.store_follower_count(uuid) from public;
grant execute on function private.store_follower_count(uuid) to anon, authenticated;

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
  private.store_follower_count(s.id) as followers
from public.stores s
left join public.storefront_settings f on f.store_id = s.id
where s.status <> 'suspended';

-- 3. Disponibilité d'une adresse : comptes connectés uniquement
revoke execute on function public.is_slug_available(text) from anon;

-- 4a. Index manquant
create index if not exists order_items_product_idx on public.order_items (product_id);

-- 4b. Une seule politique SELECT par table : les politiques « gestion » ne couvrent plus que l'écriture
drop policy "products: gestion par le propriétaire" on public.products;
create policy "products: ajout par le propriétaire" on public.products
  for insert to authenticated with check (private.is_store_owner(store_id));
create policy "products: modification par le propriétaire" on public.products
  for update to authenticated using (private.is_store_owner(store_id)) with check (private.is_store_owner(store_id));
create policy "products: suppression par le propriétaire" on public.products
  for delete to authenticated using (private.is_store_owner(store_id));

drop policy "product_images: gestion par le propriétaire" on public.product_images;
create policy "product_images: ajout par le propriétaire" on public.product_images
  for insert to authenticated
  with check (exists (select 1 from public.products p where p.id = product_id and private.is_store_owner(p.store_id)));
create policy "product_images: modification par le propriétaire" on public.product_images
  for update to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and private.is_store_owner(p.store_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and private.is_store_owner(p.store_id)));
create policy "product_images: suppression par le propriétaire" on public.product_images
  for delete to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and private.is_store_owner(p.store_id)));

drop policy "collections: gestion par le propriétaire" on public.store_collections;
create policy "collections: ajout par le propriétaire" on public.store_collections
  for insert to authenticated with check (private.is_store_owner(store_id));
create policy "collections: modification par le propriétaire" on public.store_collections
  for update to authenticated using (private.is_store_owner(store_id)) with check (private.is_store_owner(store_id));
create policy "collections: suppression par le propriétaire" on public.store_collections
  for delete to authenticated using (private.is_store_owner(store_id));

drop policy "storefront: lecture publique" on public.storefront_settings;
drop policy "storefront: gestion par le propriétaire" on public.storefront_settings;
create policy "storefront: lecture" on public.storefront_settings
  for select to anon, authenticated
  using (
    exists (select 1 from public.stores s where s.id = store_id and s.status <> 'suspended')
    or private.is_store_owner(store_id)
  );
create policy "storefront: ajout par le propriétaire" on public.storefront_settings
  for insert to authenticated with check (private.is_store_owner(store_id));
create policy "storefront: modification par le propriétaire" on public.storefront_settings
  for update to authenticated using (private.is_store_owner(store_id)) with check (private.is_store_owner(store_id));
create policy "storefront: suppression par le propriétaire" on public.storefront_settings
  for delete to authenticated using (private.is_store_owner(store_id));
