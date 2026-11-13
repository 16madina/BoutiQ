-- =============================================================================
-- Fil d'accueil : annonces sponsorisées et réglages modifiables à distance
--
--  * ad_campaigns : une boutique met en avant un produit ou sa boutique. Une campagne
--    n'est diffusée qu'une fois « active » (validée par l'équipe) et dans ses dates.
--    Budget et mode de facturation sont enregistrés mais RIEN n'est facturé : les règles
--    commerciales ne sont pas encore définies.
--  * ad_events : affichages réels, clics, ajouts au panier… Écrits uniquement par
--    track_ad_event(), qui tient aussi les compteurs de la campagne.
--  * admin_review_campaign() : l'équipe active, met en pause, refuse ou termine.
--  * app_config : réglages lus par l'application (ordre des sections de l'accueil,
--    fréquence des annonces…) ; seuls les modérateurs les modifient.
-- =============================================================================

create type public.ad_status as enum ('pending_review', 'active', 'paused', 'rejected', 'ended');

create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  kind text not null default 'product' check (kind in ('product', 'store')),
  product_id uuid references public.products (id) on delete cascade,
  headline text not null check (char_length(btrim(headline)) between 3 and 60),
  tagline text check (char_length(tagline) <= 90),
  cta text not null default 'Découvrir' check (char_length(cta) between 2 and 24),
  status public.ad_status not null default 'pending_review',
  billing_model text not null default 'daily' check (billing_model in ('cpc', 'cpm', 'daily')),
  budget integer not null default 0 check (budget >= 0),
  spent integer not null default 0 check (spent >= 0),
  countries text[] not null default '{}',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  impressions integer not null default 0,
  clicks integer not null default 0,
  rejection_reason text,
  created_at timestamptz not null default now(),
  check (kind = 'store' or product_id is not null)
);
create index ad_campaigns_live_idx on public.ad_campaigns (status, starts_at);
create index ad_campaigns_store_idx on public.ad_campaigns (store_id);
create index ad_campaigns_product_idx on public.ad_campaigns (product_id);

alter table public.ad_campaigns enable row level security;

create policy "ad_campaigns: annonces en cours" on public.ad_campaigns
  for select to anon, authenticated
  using (status = 'active' and starts_at <= now() and (ends_at is null or ends_at > now()));

create policy "ad_campaigns: lecture par la boutique" on public.ad_campaigns
  for select to authenticated using (private.is_store_owner(store_id));

create policy "ad_campaigns: lecture par la modération" on public.ad_campaigns
  for select to authenticated using (private.is_admin());

create policy "ad_campaigns: création par la boutique" on public.ad_campaigns
  for insert to authenticated with check (private.is_store_owner(store_id));

create policy "ad_campaigns: suppression par la boutique" on public.ad_campaigns
  for delete to authenticated using (private.is_store_owner(store_id));

-- La boutique propose une annonce ; le statut et les compteurs restent à la base.
revoke all on table public.ad_campaigns from anon, authenticated;
grant select on table public.ad_campaigns to anon, authenticated;
grant insert (store_id, kind, product_id, headline, tagline, cta, billing_model, budget, countries, starts_at, ends_at)
  on table public.ad_campaigns to authenticated;
grant delete on table public.ad_campaigns to authenticated;

create table public.ad_events (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.ad_campaigns (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('impression', 'click', 'store_visit', 'add_to_cart', 'order')),
  created_at timestamptz not null default now()
);
create index ad_events_campaign_idx on public.ad_events (campaign_id, kind, created_at desc);
create index ad_events_user_idx on public.ad_events (user_id);

alter table public.ad_events enable row level security;

create policy "ad_events: lecture par la boutique ou la modération" on public.ad_events
  for select to authenticated
  using (
    private.is_admin()
    or exists (select 1 from public.ad_campaigns c where c.id = campaign_id and private.is_store_owner(c.store_id))
  );

revoke all on table public.ad_events from anon, authenticated;
grant select on table public.ad_events to authenticated;

-- Enregistre un affichage réel, un clic, etc. pour une annonce en cours.
create or replace function public.track_ad_event(p_campaign_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if p_kind not in ('impression', 'click', 'store_visit', 'add_to_cart', 'order') then
    return;
  end if;
  if not exists (
    select 1 from public.ad_campaigns c
     where c.id = p_campaign_id and c.status = 'active' and c.starts_at <= now() and (c.ends_at is null or c.ends_at > now())
  ) then
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
revoke execute on function public.track_ad_event(uuid, text) from public;
grant execute on function public.track_ad_event(uuid, text) to anon, authenticated;

-- Modération d'une annonce : activer, mettre en pause, refuser, terminer.
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
     set status = p_status, rejection_reason = case when p_status = 'rejected' then left(nullif(btrim(p_reason), ''), 280) end
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
revoke execute on function public.admin_review_campaign(uuid, public.ad_status, text) from public, anon;
grant execute on function public.admin_review_campaign(uuid, public.ad_status, text) to authenticated;

-- Réglages lus par l'application.
create table public.app_config (
  key text primary key check (char_length(key) between 1 and 60),
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;

create policy "app_config: lecture par tous" on public.app_config
  for select to anon, authenticated using (true);
create policy "app_config: ajout par la modération" on public.app_config
  for insert to authenticated with check (private.is_admin());
create policy "app_config: modification par la modération" on public.app_config
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

revoke all on table public.app_config from anon, authenticated;
grant select on table public.app_config to anon, authenticated;
grant insert, update on table public.app_config to authenticated;
