-- =============================================================================
-- Suppression du compte depuis l'application (exigée par l'App Store et Google Play)
--
-- delete_my_account() supprime le compte connecté et ses données :
--  * refusée tant qu'une commande est en cours (comme client ou comme vendeur) ;
--  * achats terminés : gardés pour les comptes du vendeur, mais sans nom, téléphone,
--    adresse ni message (orders.buyer_id devient vide) ;
--  * boutiques du compte : supprimées avec leurs produits, codes promo, discussions et
--    ventes terminées ;
--  * profil, favoris, abonnements, notifications, messages : supprimés avec le compte.
-- Les photos (stockage) sont retirées par l'application juste avant l'appel.
-- =============================================================================

alter table public.orders alter column buyer_id drop not null;
alter table public.orders drop constraint orders_buyer_id_fkey;
alter table public.orders
  add constraint orders_buyer_id_fkey foreign key (buyer_id) references auth.users (id) on delete set null;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.orders o
     where o.status in ('pending', 'confirmed', 'shipped')
       and (o.buyer_id = v_uid or o.store_id in (select s.id from public.stores s where s.owner_id = v_uid))
  ) then
    raise exception 'Vous avez des commandes en cours. Terminez-les ou annulez-les avant de supprimer votre compte.' using errcode = 'P0001';
  end if;

  -- Achats terminés : le vendeur garde la trace de la vente, sans données personnelles.
  update public.orders
     set delivery_name = 'Compte supprimé', delivery_phone = null, delivery_address = null, note = null
   where buyer_id = v_uid;

  -- Boutiques du compte : ventes terminées, puis la boutique et tout ce qui en dépend.
  delete from public.orders where store_id in (select s.id from public.stores s where s.owner_id = v_uid);
  delete from public.stores where owner_id = v_uid;

  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
