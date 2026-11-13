-- =============================================================================
-- Annonces : validation et mesure, ajustements
--
--  * admin_review_campaign() : à l'activation, la durée choisie par la boutique
--    démarre à ce moment-là (le temps d'attente de la validation n'est pas perdu).
--  * track_ad_event() : la boutique qui regarde sa propre annonce n'est pas comptée.
-- =============================================================================

create or replace function public.admin_review_campaign(p_campaign_id uuid, p_status public.ad_status, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store public.stores%rowtype;
begin
  if not private.is_admin() then
    raise exception 'Réservé à la modération' using errcode = '42501';
  end if;
  update public.ad_campaigns
     set status = p_status,
         rejection_reason = case when p_status = 'rejected' then left(nullif(btrim(p_reason), ''), 280) end,
         -- Première mise en ligne : la durée demandée commence maintenant.
         ends_at = case when p_status = 'active' and status = 'pending_review' and ends_at is not null then now() + (ends_at - starts_at) else ends_at end,
         starts_at = case when p_status = 'active' and status = 'pending_review' then now() else starts_at end
   where id = p_campaign_id;
  if not found then
    raise exception 'Annonce introuvable' using errcode = 'P0001';
  end if;
  select s.* into v_store from public.stores s join public.ad_campaigns c on c.store_id = s.id where c.id = p_campaign_id;
  if p_status in ('active', 'rejected') then
    insert into public.notifications (user_id, kind, title, body, store_id)
    values (
      v_store.owner_id,
      case when p_status = 'active' then 'ad_active' else 'ad_rejected' end,
      case when p_status = 'active' then 'Annonce en ligne' else 'Annonce refusée' end,
      case when p_status = 'active' then 'Votre annonce est maintenant diffusée sur l’accueil de BoutiQ.'
           else coalesce(left(nullif(btrim(p_reason), ''), 200), 'Votre annonce ne peut pas être diffusée en l’état.') end,
      v_store.id
    );
  end if;
end;
$$;

create or replace function public.track_ad_event(p_campaign_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_store uuid;
begin
  if p_kind not in ('impression', 'click', 'store_visit', 'add_to_cart', 'order') then
    return;
  end if;
  select c.store_id into v_store from public.ad_campaigns c
   where c.id = p_campaign_id and c.status = 'active' and c.starts_at <= now() and (c.ends_at is null or c.ends_at > now());
  if v_store is null then
    return;
  end if;
  -- La boutique qui regarde ou touche sa propre annonce ne compte pas.
  if v_uid is not null and private.is_store_owner(v_store) then
    return;
  end if;
  -- Une même personne qui revoit la même annonce dans la demi-heure ne compte qu'une fois.
  if p_kind = 'impression' and v_uid is not null and exists (
    select 1 from public.ad_events e
     where e.campaign_id = p_campaign_id and e.user_id = v_uid and e.kind = 'impression'
       and e.created_at > now() - interval '30 minutes'
  ) then
    return;
  end if;

  insert into public.ad_events (campaign_id, user_id, kind) values (p_campaign_id, v_uid, p_kind);
  if p_kind = 'impression' then
    update public.ad_campaigns set impressions = impressions + 1 where id = p_campaign_id;
  elsif p_kind = 'click' then
    update public.ad_campaigns set clicks = clicks + 1 where id = p_campaign_id;
  end if;
end;
$$;
