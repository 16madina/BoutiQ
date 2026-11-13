-- =============================================================================
-- Codes promo des boutiques
--
--  * promo_codes : un vendeur crée des codes pour SA boutique (pourcentage de réduction,
--    achat minimum, date de fin, nombre d'utilisations, affichage public ou non).
--  * Un code « visible » s'affiche sur la boutique et ses fiches produit ; un code
--    « privé » n'est lisible que par le vendeur (il le donne lui-même à ses clients).
--  * La réduction est calculée par la base dans place_order() : le téléphone n'envoie
--    que le code. check_promo_code() donne l'aperçu de la réduction avant de commander.
--  * orders.discount / orders.promo_code gardent la trace ; le total est le montant à payer.
--  * Commande annulée : l'utilisation du code est rendue.
-- =============================================================================

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9]{3,16}$'),
  percent integer not null check (percent between 1 and 90),
  min_total integer not null default 0 check (min_total >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  is_public boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, code)
);

alter table public.promo_codes enable row level security;

create policy "promo_codes: lecture par le vendeur" on public.promo_codes
  for select to authenticated using (private.is_store_owner(store_id));

create policy "promo_codes: codes visibles et valables" on public.promo_codes
  for select to anon, authenticated
  using (
    is_public and active
    and (expires_at is null or expires_at > now())
    and (max_uses is null or used_count < max_uses)
  );

create policy "promo_codes: création par le vendeur" on public.promo_codes
  for insert to authenticated with check (private.is_store_owner(store_id));

create policy "promo_codes: réglage par le vendeur" on public.promo_codes
  for update to authenticated
  using (private.is_store_owner(store_id)) with check (private.is_store_owner(store_id));

create policy "promo_codes: suppression par le vendeur" on public.promo_codes
  for delete to authenticated using (private.is_store_owner(store_id));

-- Le vendeur choisit le code et ses règles à la création, puis ne peut que l'activer,
-- le désactiver ou le rendre visible : le compteur d'utilisations reste à la base.
revoke all on table public.promo_codes from anon, authenticated;
grant select on table public.promo_codes to anon, authenticated;
grant insert (store_id, code, percent, min_total, max_uses, expires_at, is_public) on table public.promo_codes to authenticated;
grant update (active, is_public) on table public.promo_codes to authenticated;
grant delete on table public.promo_codes to authenticated;

alter table public.orders
  add column discount integer not null default 0 check (discount >= 0),
  add column promo_code text;

-- Vérifie un code pour une boutique et un montant ; renvoie le code ou explique le refus.
create or replace function private.promo_for(p_store_id uuid, p_code text, p_subtotal integer)
returns public.promo_codes
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.promo_codes%rowtype;
begin
  select * into v from public.promo_codes
   where store_id = p_store_id and code = upper(btrim(coalesce(p_code, '')));
  if not found or not v.active then
    raise exception 'Ce code promo n’est pas valable pour cette boutique.' using errcode = 'P0001';
  end if;
  if v.expires_at is not null and v.expires_at <= now() then
    raise exception 'Ce code promo a expiré.' using errcode = 'P0001';
  end if;
  if v.max_uses is not null and v.used_count >= v.max_uses then
    raise exception 'Ce code promo a atteint son nombre maximum d’utilisations.' using errcode = 'P0001';
  end if;
  if p_subtotal < v.min_total then
    raise exception 'Ce code s’applique à partir de % FCFA d’achats dans cette boutique.', v.min_total using errcode = 'P0001';
  end if;
  return v;
end;
$$;
revoke execute on function private.promo_for(uuid, text, integer) from public, anon, authenticated;

-- Aperçu avant de commander : réduction obtenue avec ce code pour ce montant.
create or replace function public.check_promo_code(p_store_id uuid, p_code text, p_subtotal integer)
returns table (code text, percent integer, discount integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.promo_codes%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  v := private.promo_for(p_store_id, p_code, greatest(coalesce(p_subtotal, 0), 0));
  return query select v.code, v.percent, round(greatest(coalesce(p_subtotal, 0), 0) * v.percent / 100.0)::integer;
end;
$$;
revoke execute on function public.check_promo_code(uuid, text, integer) from public, anon;
grant execute on function public.check_promo_code(uuid, text, integer) to authenticated;

-- place_order() reçoit en plus le code promo (ancienne version retirée : une seule signature).
drop function public.place_order(uuid, jsonb, jsonb, public.payment_method, text, text);

create or replace function public.place_order(
  p_store_id uuid,
  p_items jsonb,
  p_delivery jsonb,
  p_payment public.payment_method default 'cash_on_delivery',
  p_provider text default null,
  p_note text default null,
  p_promo_code text default null
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
  v_code text := nullif(upper(btrim(coalesce(p_promo_code, ''))), '');
  v_promo public.promo_codes%rowtype;
  v_discount integer := 0;
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

  -- Code promo : vérifié ici (jamais sur le téléphone), puis compté comme utilisé.
  if v_code is not null then
    v_promo := private.promo_for(p_store_id, v_code, v_total);
    update public.promo_codes set used_count = used_count + 1
     where id = v_promo.id and (max_uses is null or used_count < max_uses);
    if not found then
      raise exception 'Ce code promo a atteint son nombre maximum d’utilisations.' using errcode = 'P0001';
    end if;
    v_discount := round(v_total * v_promo.percent / 100.0);
    v_total := v_total - v_discount;
  end if;

  update public.orders
     set total = v_total, discount = v_discount, promo_code = v_promo.code, commission = round(v_total * 0.05)
   where id = v_order;

  insert into public.notifications (user_id, kind, title, body, order_id)
  values (v_store.owner_id, 'order_new', 'Nouvelle commande',
          format('%s FCFA · %s', to_char(v_total, 'FM999G999G999'), left(btrim(p_delivery->>'name'), 40)), v_order);
  return v_order;
end;
$$;

revoke execute on function public.place_order(uuid, jsonb, jsonb, public.payment_method, text, text, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, jsonb, public.payment_method, text, text, text) to authenticated;

-- Annulation d'une commande : le code promo utilisé est rendu.
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
    -- Le code promo utilisé redevient disponible.
    if old.promo_code is not null then
      update public.promo_codes set used_count = greatest(used_count - 1, 0)
       where store_id = old.store_id and code = old.promo_code;
    end if;
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

revoke execute on function private.order_status_change() from public, anon, authenticated;
