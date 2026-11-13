-- =============================================================================
-- BoutiQ — Espace client : profil, favoris, commandes, « Reçu », notifications
--
--  * profiles : ville et adresse (préremplissent la livraison).
--  * favorites : produits favoris du client (clé texte : produits réels et de démo).
--  * orders / order_items : livraison, mode de paiement, commission 5 %, photo et nom figés.
--  * place_order() : SEULE façon de créer une commande. Les prix, le total et la
--    commission sont recalculés par la base (le téléphone n'envoie que les quantités),
--    le stock est réservé, la boutique doit être vérifiée (ventes activées).
--  * Cycle : pending → confirmed → shipped → delivered (le CLIENT confirme « Reçu »,
--    ce qui libère l'argent au vendeur) ; annulation possible avant l'expédition,
--    le stock est alors rendu.
--  * notifications : nouvelle commande (vendeur), suivi (client), nouveau produit
--    d'une boutique suivie (abonnés).
-- =============================================================================

-- ------------------------------------------------------------------ Profils
alter table public.profiles
  add column city text check (char_length(city) <= 60),
  add column address text check (char_length(address) <= 160);

-- ------------------------------------------------------------------ Favoris
create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_key text not null check (char_length(product_key) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (user_id, product_key)
);
alter table public.favorites enable row level security;
create policy "favorites: lecture des siens" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "favorites: ajout" on public.favorites
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "favorites: retrait" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- Commandes
create type public.payment_method as enum ('cash_on_delivery', 'mobile_money');

alter table public.orders
  add column delivery_name text check (char_length(delivery_name) <= 80),
  add column delivery_phone text check (char_length(delivery_phone) <= 30),
  add column delivery_city text check (char_length(delivery_city) <= 60),
  add column delivery_address text check (char_length(delivery_address) <= 160),
  add column payment_method public.payment_method not null default 'cash_on_delivery',
  add column mobile_money_provider text check (mobile_money_provider in ('wave', 'orange', 'mtn', 'moov')),
  add column note text check (char_length(note) <= 280),
  add column commission integer not null default 0 check (commission >= 0),
  add column confirmed_at timestamptz,
  add column shipped_at timestamptz,
  add column delivered_at timestamptz,
  add column cancelled_at timestamptz;

alter table public.order_items
  add column product_name text,
  add column variant text,
  add column size text,
  add column image_path text;

-- Les commandes ne se créent plus directement : uniquement via place_order().
drop policy if exists "orders: création si ventes activées" on public.orders;
drop policy if exists "order_items: ajout par l'acheteur" on public.order_items;

-- Le client peut changer le statut de SA commande (le déclencheur limite à « Reçu » / annulation).
create policy "orders: suivi par le client" on public.orders
  for update to authenticated
  using (buyer_id = (select auth.uid())) with check (buyer_id = (select auth.uid()));

create or replace function public.place_order(
  p_store_id uuid,
  p_items jsonb,
  p_delivery jsonb,
  p_payment public.payment_method default 'cash_on_delivery',
  p_provider text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_store public.stores%rowtype;
  v_order uuid;
  v_total integer := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_price integer;
  v_variant jsonb;
  v_label text;
  v_size text;
  v_image text;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  select * into v_store from public.stores where id = p_store_id;
  if not found or not v_store.sales_enabled then
    raise exception 'Cette boutique ne vend pas encore : elle attend sa vérification.' using errcode = 'P0001';
  end if;
  if v_store.owner_id = v_uid then
    raise exception 'Vous ne pouvez pas commander dans votre propre boutique.' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Panier vide.' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_delivery->>'name', ''))) < 2
     or char_length(regexp_replace(coalesce(p_delivery->>'phone', ''), '\D', '', 'g')) < 8
     or char_length(btrim(coalesce(p_delivery->>'city', ''))) < 2 then
    raise exception 'Indiquez votre nom, votre téléphone et votre ville.' using errcode = 'P0001';
  end if;
  if p_payment = 'mobile_money' and coalesce(p_provider, '') not in ('wave', 'orange', 'mtn', 'moov') then
    raise exception 'Choisissez votre service Mobile Money.' using errcode = 'P0001';
  end if;

  insert into public.orders (buyer_id, store_id, total, status, delivery_name, delivery_phone, delivery_city,
                             delivery_address, payment_method, mobile_money_provider, note)
  values (v_uid, p_store_id, 0, 'pending', left(btrim(p_delivery->>'name'), 80), left(p_delivery->>'phone', 30),
          left(btrim(p_delivery->>'city'), 60), left(nullif(btrim(p_delivery->>'address'), ''), 160), p_payment,
          case when p_payment = 'mobile_money' then p_provider end, left(nullif(btrim(p_note), ''), 280))
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'Quantité invalide.' using errcode = 'P0001';
    end if;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and store_id = p_store_id and status = 'published'
      for update;
    if not found then
      raise exception 'Un produit n’est plus disponible.' using errcode = 'P0001';
    end if;
    v_label := nullif(v_item->>'variant', '');
    v_size := nullif(v_item->>'size', '');
    if v_size is not null and not (v_size = any (v_product.sizes)) then
      raise exception 'Taille indisponible pour « % ».', v_product.name using errcode = 'P0001';
    end if;

    if v_label is not null then
      select v into v_variant from jsonb_array_elements(v_product.variants) v where v->>'label' = v_label;
      if v_variant is null then
        raise exception 'Choix indisponible pour « % ».', v_product.name using errcode = 'P0001';
      end if;
      if coalesce((v_variant->>'stock')::integer, 0) < v_qty then
        raise exception 'Stock insuffisant pour « % ».', v_product.name using errcode = 'P0001';
      end if;
      v_price := (v_variant->>'price')::integer;
      update public.products
         set variants = (select jsonb_agg(case when x->>'label' = v_label
                                               then jsonb_set(x, '{stock}', to_jsonb((x->>'stock')::integer - v_qty))
                                               else x end)
                           from jsonb_array_elements(v_product.variants) x),
             stock = greatest(stock - v_qty, 0)
       where id = v_product.id;
    else
      if v_product.stock < v_qty then
        raise exception 'Stock insuffisant pour « % ».', v_product.name using errcode = 'P0001';
      end if;
      v_price := v_product.price;
      update public.products set stock = stock - v_qty where id = v_product.id;
    end if;

    select path into v_image from public.product_images where product_id = v_product.id order by position limit 1;
    insert into public.order_items (order_id, product_id, quantity, unit_price, product_name, variant, size, image_path)
    values (v_order, v_product.id, v_qty, v_price, v_product.name, v_label, v_size, v_image);
    v_total := v_total + v_price * v_qty;
  end loop;

  update public.orders set total = v_total, commission = round(v_total * 0.05) where id = v_order;

  insert into public.notifications (user_id, kind, title, body, order_id)
  values (v_store.owner_id, 'order_new', 'Nouvelle commande',
          format('%s FCFA · %s', to_char(v_total, 'FM999G999G999'), left(btrim(p_delivery->>'name'), 40)), v_order);
  return v_order;
end;
$$;

-- ------------------------------------------------------------ Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  order_id uuid references public.orders (id) on delete cascade,
  store_id uuid references public.stores (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "notifications: lecture des siennes" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: marquer comme lues" on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Cycle de commande : qui peut faire quoi, horodatage, stock rendu en cas d'annulation, notification.
create or replace function private.order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_ok boolean := false;
  v_item record;
begin
  if new.status = old.status then
    return new;
  end if;
  select owner_id into v_owner from public.stores where id = old.store_id;

  if v_uid is null then
    v_ok := true; -- back-office (service_role)
  elsif v_uid = v_owner then
    v_ok := (old.status = 'pending' and new.status in ('confirmed', 'cancelled'))
         or (old.status = 'confirmed' and new.status in ('shipped', 'cancelled'));
  elsif v_uid = old.buyer_id then
    v_ok := (old.status = 'pending' and new.status = 'cancelled')
         or (old.status = 'shipped' and new.status = 'delivered');
  end if;
  if not v_ok then
    raise exception 'Changement de statut impossible.' using errcode = '42501';
  end if;

  case new.status
    when 'confirmed' then new.confirmed_at := now();
    when 'shipped' then new.shipped_at := now();
    when 'delivered' then new.delivered_at := now();
    when 'cancelled' then new.cancelled_at := now();
    else null;
  end case;

  -- Annulation : le stock réservé est rendu.
  if new.status = 'cancelled' then
    for v_item in select product_id, quantity, variant from public.order_items where order_id = old.id and product_id is not null loop
      if v_item.variant is not null then
        update public.products
           set variants = (select jsonb_agg(case when x->>'label' = v_item.variant
                                                 then jsonb_set(x, '{stock}', to_jsonb((x->>'stock')::integer + v_item.quantity))
                                                 else x end)
                             from jsonb_array_elements(variants) x),
               stock = stock + v_item.quantity
         where id = v_item.product_id;
      else
        update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
      end if;
    end loop;
  end if;

  -- Notification à l'autre partie.
  insert into public.notifications (user_id, kind, title, body, order_id)
  values (
    case when v_uid = old.buyer_id then v_owner else old.buyer_id end,
    'order_' || new.status,
    case new.status
      when 'confirmed' then 'Commande confirmée'
      when 'shipped' then 'Commande en route'
      when 'delivered' then 'Commande reçue par le client'
      when 'cancelled' then 'Commande annulée'
      else 'Commande mise à jour'
    end,
    case new.status
      when 'confirmed' then 'Le vendeur prépare votre commande.'
      when 'shipped' then 'Le vendeur a expédié votre commande. Touchez « Reçu » à la livraison.'
      when 'delivered' then format('Le client a confirmé la réception : %s FCFA vous seront versés.', to_char(old.total - old.commission, 'FM999G999G999'))
      when 'cancelled' then 'La commande a été annulée.'
      else ''
    end,
    old.id
  );
  return new;
end;
$$;

create trigger orders_status_change before update of status on public.orders
  for each row execute function private.order_status_change();

-- Nouveau produit publié : les abonnés de la boutique sont prévenus.
create or replace function private.notify_followers_new_product()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status = 'draft') then
    insert into public.notifications (user_id, kind, title, body, store_id, product_id)
    select f.user_id, 'product_new', s.name, format('Nouveau : %s', new.name), s.id, new.id
      from public.store_follows f
      join public.stores s on s.id = new.store_id
     where f.store_id = new.store_id
     limit 5000;
  end if;
  return new;
end;
$$;

create trigger products_notify_followers after insert or update of status on public.products
  for each row execute function private.notify_followers_new_product();

-- Droits d'exécution
revoke execute on function public.place_order(uuid, jsonb, jsonb, public.payment_method, text, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, jsonb, public.payment_method, text, text) to authenticated;
revoke execute on function private.order_status_change() from public, anon, authenticated;
revoke execute on function private.notify_followers_new_product() from public, anon, authenticated;

create index if not exists favorites_user_idx on public.favorites (user_id, created_at desc);
