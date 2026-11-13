-- =============================================================================
-- Couleur choisie par le client
--
-- order_items.color : la couleur choisie sur la fiche produit (parmi products.colors).
-- place_order() la reçoit avec chaque article, vérifie qu'elle existe pour ce produit,
-- et la garde sur la ligne de commande : le vendeur sait quoi préparer.
-- =============================================================================

alter table public.order_items add column color text check (char_length(color) <= 40);

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
  v_color text;
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
    v_color := nullif(btrim(coalesce(v_item->>'color', '')), '');
    if v_color is not null and not (v_color = any (v_product.colors)) then
      raise exception 'Couleur indisponible pour « % ».', v_product.name using errcode = 'P0001';
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
    insert into public.order_items (order_id, product_id, quantity, unit_price, product_name, variant, size, color, image_path)
    values (v_order, v_product.id, v_qty, v_price, v_product.name, v_label, v_size, v_color, v_image);
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
