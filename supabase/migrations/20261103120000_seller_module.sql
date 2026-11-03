-- =============================================================================
-- BoutiQ — Module boutiques vendeurs
-- Schéma + règles RLS. NON APPLIQUÉ : à exécuter sur le projet Supabase dédié
-- à BoutiQ (supabase db push, ou éditeur SQL du tableau de bord).
--
-- Principes de sécurité :
--  * Toute table a RLS activé ; aucune donnée n'est lisible sans politique.
--  * Un vendeur ne peut jamais modifier lui-même son statut de vérification :
--    la colonne `status` n'est pas dans les privilèges UPDATE du rôle
--    `authenticated` ; elle change uniquement via des fonctions dédiées.
--  * Les ventes ne sont possibles que pour une boutique vérifiée
--    (`sales_enabled`, contrôlé dans la politique d'insertion des commandes).
--  * Les informations vendeur et la pièce d'identité ne sont visibles que par
--    leur propriétaire (et le service_role utilisé par la modération).
-- =============================================================================

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.store_status as enum ('draft', 'pending_review', 'verified', 'rejected', 'suspended');
create type public.seller_type as enum ('individual', 'business');
create type public.product_status as enum ('draft', 'published');
create type public.order_status as enum ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
create type public.app_space as enum ('buyer', 'seller');

-- ---------------------------------------------------------------------------
-- Utilitaire : updated_at automatique
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profils (un par compte, créé à l'inscription par SMS)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 80),
  phone text,
  active_space public.app_space not null default 'buyer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone) values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Boutiques
-- ---------------------------------------------------------------------------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  slug extensions.citext not null unique
    check (char_length(slug) between 3 and 40 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 2 and 40),
  description text not null default '' check (char_length(description) <= 280),
  city text not null,
  country text not null,
  category text not null,
  logo_path text,
  banner_path text,
  status public.store_status not null default 'draft',
  sales_enabled boolean generated always as (status = 'verified') stored,
  rejection_reason text,
  submitted_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stores_status_idx on public.stores (status);

create trigger stores_updated_at before update on public.stores
  for each row execute function public.set_updated_at();

-- Adresses réservées
create table public.reserved_slugs (slug extensions.citext primary key);
insert into public.reserved_slugs (slug) values
  ('admin'), ('api'), ('app'), ('aide'), ('help'), ('support'), ('mymarket'), ('boutiq'), ('boutique'),
  ('boutiques'), ('store'), ('stores'), ('seller'), ('vendeur'), ('login'), ('auth'),
  ('search'), ('cart'), ('panier'), ('compte'), ('account'), ('settings');

-- Fonction d'aide (security definer : évite la récursion des politiques RLS)
create or replace function public.is_store_owner(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.stores s
    where s.id = p_store_id and s.owner_id = (select auth.uid())
  );
$$;

-- Informations privées du vendeur
create table public.seller_details (
  store_id uuid primary key references public.stores (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) >= 3),
  phone text not null,
  whatsapp text,
  seller_type public.seller_type not null default 'individual',
  business_name text,
  id_document_path text,
  updated_at timestamptz not null default now(),
  check (seller_type = 'individual' or char_length(coalesce(business_name, '')) >= 2)
);

create trigger seller_details_updated_at before update on public.seller_details
  for each row execute function public.set_updated_at();

-- Collections
create table public.store_collections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 24),
  position smallint not null default 0,
  unique (store_id, name)
);

create index store_collections_store_idx on public.store_collections (store_id);

-- Produits
create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  collection_id uuid references public.store_collections (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 2 and 60),
  description text not null default '' check (char_length(description) <= 600),
  price integer not null check (price > 0),
  old_price integer check (old_price is null or old_price > price),
  category text not null,
  stock integer not null default 1 check (stock >= 0),
  status public.product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_store_status_idx on public.products (store_id, status);
create index products_collection_idx on public.products (collection_id);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  position smallint not null default 0 check (position between 0 and 5)
);

create index product_images_product_idx on public.product_images (product_id);

-- Abonnés
create table public.store_follows (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);

create index store_follows_store_idx on public.store_follows (store_id);

-- Vues de vitrine (statistiques)
create table public.store_views (
  id bigint generated always as identity primary key,
  store_id uuid not null references public.stores (id) on delete cascade,
  viewer_id uuid default auth.uid(),
  viewed_at timestamptz not null default now()
);

create index store_views_store_time_idx on public.store_views (store_id, viewed_at desc);

-- Commandes (le paiement sera géré par une Edge Function)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  buyer_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  status public.order_status not null default 'pending',
  total integer not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_store_idx on public.orders (store_id, created_at desc);
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price > 0)
);

create index order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.reserved_slugs enable row level security;
alter table public.seller_details enable row level security;
alter table public.store_collections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.store_follows enable row level security;
alter table public.store_views enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- profiles : chacun ne voit et ne modifie que le sien
create policy "profiles: lecture du sien" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: mise à jour du sien" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- stores : vitrines publiques (sauf suspendues) ; le propriétaire voit tout de la sienne
create policy "stores: lecture publique" on public.stores
  for select to anon, authenticated
  using (status <> 'suspended' or owner_id = (select auth.uid()));
create policy "stores: création par son propriétaire" on public.stores
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and status = 'draft');
create policy "stores: modification par son propriétaire" on public.stores
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "stores: suppression par son propriétaire" on public.stores
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Le vendeur ne peut modifier QUE ces colonnes (ni slug, ni statut, ni dates de vérification)
revoke update on public.stores from anon, authenticated;
grant update (name, description, city, country, category, logo_path, banner_path)
  on public.stores to authenticated;

-- reserved_slugs : aucune politique → illisible côté client (lu via is_slug_available)

-- seller_details : strictement privé
create policy "seller_details: propriétaire" on public.seller_details
  for all to authenticated
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

-- store_collections
create policy "collections: lecture publique" on public.store_collections
  for select to anon, authenticated
  using (exists (select 1 from public.stores s where s.id = store_id));
create policy "collections: gestion par le propriétaire" on public.store_collections
  for all to authenticated
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

-- products : publiés visibles par tous, brouillons visibles par le propriétaire
create policy "products: lecture" on public.products
  for select to anon, authenticated
  using (
    (status = 'published' and exists (select 1 from public.stores s where s.id = store_id and s.status <> 'suspended'))
    or public.is_store_owner(store_id)
  );
create policy "products: gestion par le propriétaire" on public.products
  for all to authenticated
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

-- product_images : suivent la visibilité du produit
create policy "product_images: lecture" on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "product_images: gestion par le propriétaire" on public.product_images
  for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and public.is_store_owner(p.store_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.is_store_owner(p.store_id)));

-- store_follows
create policy "follows: lecture des siens" on public.store_follows
  for select to authenticated using (user_id = (select auth.uid()) or public.is_store_owner(store_id));
create policy "follows: suivre" on public.store_follows
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "follows: ne plus suivre" on public.store_follows
  for delete to authenticated using (user_id = (select auth.uid()));

-- store_views : tout visiteur peut enregistrer une vue ; seul le propriétaire les lit
create policy "views: enregistrer" on public.store_views
  for insert to anon, authenticated
  with check (viewer_id is not distinct from (select auth.uid()) and viewed_at > now() - interval '1 minute');
create policy "views: lecture par le propriétaire" on public.store_views
  for select to authenticated using (public.is_store_owner(store_id));

-- orders : l'acheteur et la boutique ; création seulement si la boutique est VÉRIFIÉE
create policy "orders: lecture acheteur ou boutique" on public.orders
  for select to authenticated
  using (buyer_id = (select auth.uid()) or public.is_store_owner(store_id));
create policy "orders: création si ventes activées" on public.orders
  for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and status = 'pending'
    and exists (select 1 from public.stores s where s.id = store_id and s.sales_enabled)
  );
create policy "orders: suivi par la boutique" on public.orders
  for update to authenticated
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
revoke update on public.orders from anon, authenticated;
grant update (status) on public.orders to authenticated;

create policy "order_items: lecture" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.buyer_id = (select auth.uid()) or public.is_store_owner(o.store_id))));
create policy "order_items: ajout par l'acheteur" on public.order_items
  for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id
                      and o.buyer_id = (select auth.uid()) and o.status = 'pending'));

-- ---------------------------------------------------------------------------
-- Fonctions appelées par l'application
-- ---------------------------------------------------------------------------

-- Disponibilité d'une adresse (format, réservée, déjà prise)
create or replace function public.is_slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select char_length(p_slug) between 3 and 40
     and p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     and not exists (select 1 from public.reserved_slugs r where r.slug = p_slug::extensions.citext)
     and not exists (select 1 from public.stores s where s.slug = p_slug::extensions.citext);
$$;

-- Envoi en vérification : seul chemin pour passer de draft/rejected à pending_review
create or replace function public.submit_store_for_review(p_store_id uuid)
returns public.store_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store public.stores%rowtype;
begin
  select * into v_store from public.stores where id = p_store_id and owner_id = (select auth.uid()) for update;
  if not found then
    raise exception 'Boutique introuvable' using errcode = '42501';
  end if;
  if v_store.status not in ('draft', 'rejected') then
    return v_store.status;
  end if;
  if v_store.logo_path is null then
    raise exception 'Logo manquant' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.seller_details d
    where d.store_id = p_store_id and d.id_document_path is not null and char_length(d.phone) >= 8
  ) then
    raise exception 'Informations vendeur incomplètes' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.products p where p.store_id = p_store_id and p.status = 'published') then
    raise exception 'Aucun produit publié' using errcode = 'P0001';
  end if;

  update public.stores
     set status = 'pending_review', submitted_at = now(), rejection_reason = null
   where id = p_store_id;
  return 'pending_review';
end;
$$;

-- Décision de modération : réservée au service_role (back-office / Edge Function)
create or replace function public.review_store(p_store_id uuid, p_decision public.store_status, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_decision not in ('verified', 'rejected', 'suspended') then
    raise exception 'Décision invalide';
  end if;
  update public.stores
     set status = p_decision,
         rejection_reason = case when p_decision = 'rejected' then p_reason end,
         verified_at = case when p_decision = 'verified' then now() else verified_at end
   where id = p_store_id;
end;
$$;

-- Statistiques du tableau de bord (30 derniers jours)
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
  where public.is_store_owner(p_store_id);
$$;

revoke execute on function public.is_store_owner(uuid) from public, anon;
grant execute on function public.is_store_owner(uuid) to authenticated;
revoke execute on function public.is_slug_available(text) from public;
grant execute on function public.is_slug_available(text) to anon, authenticated;
revoke execute on function public.submit_store_for_review(uuid) from public, anon;
grant execute on function public.submit_store_for_review(uuid) to authenticated;
revoke execute on function public.store_dashboard_stats(uuid) from public, anon;
grant execute on function public.store_dashboard_stats(uuid) to authenticated;
revoke execute on function public.review_store(uuid, public.store_status, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Stockage des fichiers
--   store-media      : public  — {store_id}/logo.jpg, {store_id}/banner.jpg, {store_id}/products/…
--   seller-documents : PRIVÉ   — {store_id}/id-document.jpg
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('store-media', 'store-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('seller-documents', 'seller-documents', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create or replace function public.owns_storage_folder(p_name text)
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
  return public.is_store_owner(v_folder::uuid);
end;
$$;
revoke execute on function public.owns_storage_folder(text) from public, anon;
grant execute on function public.owns_storage_folder(text) to authenticated;

create policy "store-media: lecture publique" on storage.objects
  for select to anon, authenticated using (bucket_id = 'store-media');
create policy "store-media: envoi dans son dossier" on storage.objects
  for insert to authenticated with check (bucket_id = 'store-media' and public.owns_storage_folder(name));
create policy "store-media: remplacement dans son dossier" on storage.objects
  for update to authenticated
  using (bucket_id = 'store-media' and public.owns_storage_folder(name))
  with check (bucket_id = 'store-media' and public.owns_storage_folder(name));
create policy "store-media: suppression dans son dossier" on storage.objects
  for delete to authenticated using (bucket_id = 'store-media' and public.owns_storage_folder(name));

create policy "seller-documents: propriétaire uniquement" on storage.objects
  for all to authenticated
  using (bucket_id = 'seller-documents' and public.owns_storage_folder(name))
  with check (bucket_id = 'seller-documents' and public.owns_storage_folder(name));
