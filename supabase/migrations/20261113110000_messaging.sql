-- =============================================================================
-- Messagerie entre un client et une boutique
--
-- Une conversation par couple (boutique, client). Seuls les deux participants la lisent :
-- le client, et le propriétaire de la boutique. Toute écriture passe par des fonctions
-- (aucun droit d'insertion direct) : elles vérifient qui parle et tiennent les compteurs
-- de messages non lus.
-- =============================================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  buyer_id uuid not null references auth.users (id) on delete cascade,
  last_message text not null default '',
  last_message_at timestamptz not null default now(),
  last_sender_id uuid,
  buyer_unread integer not null default 0,
  seller_unread integer not null default 0,
  created_at timestamptz not null default now(),
  unique (store_id, buyer_id)
);
create index conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index conversations_store_idx on public.conversations (store_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_id);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "conversations: lecture par les participants" on public.conversations
  for select to authenticated
  using (buyer_id = (select auth.uid()) or private.is_store_owner(store_id));

create policy "messages: lecture par les participants" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
       where c.id = conversation_id
         and (c.buyer_id = (select auth.uid()) or private.is_store_owner(c.store_id))
    )
  );

-- Ouvre (ou retrouve) la conversation du client connecté avec une boutique.
create or replace function public.open_conversation(p_store_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if not exists (select 1 from public.stores s where s.id = p_store_id) then
    raise exception 'Boutique introuvable';
  end if;
  if private.is_store_owner(p_store_id) then
    raise exception 'Vous ne pouvez pas écrire à votre propre boutique';
  end if;
  insert into public.conversations (store_id, buyer_id)
  values (p_store_id, v_uid)
  on conflict (store_id, buyer_id) do update set store_id = excluded.store_id
  returning id into v_id;
  return v_id;
end;
$$;

-- Envoie un message dans une conversation dont on est participant.
create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_conv public.conversations%rowtype;
  v_body text := btrim(coalesce(p_body, ''));
  v_seller boolean;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if char_length(v_body) = 0 then
    raise exception 'Message vide';
  end if;
  select * into v_conv from public.conversations c where c.id = p_conversation_id;
  if not found then
    raise exception 'Conversation introuvable';
  end if;
  v_seller := private.is_store_owner(v_conv.store_id);
  if v_conv.buyer_id <> v_uid and not v_seller then
    raise exception 'Conversation introuvable' using errcode = '42501';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_uid, left(v_body, 1000))
  returning id into v_id;

  update public.conversations
     set last_message = left(v_body, 140),
         last_message_at = now(),
         last_sender_id = v_uid,
         buyer_unread = case when v_seller then buyer_unread + 1 else buyer_unread end,
         seller_unread = case when v_seller then seller_unread else seller_unread + 1 end
   where id = p_conversation_id;
  return v_id;
end;
$$;

-- Marque la conversation comme lue pour la personne connectée.
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  update public.conversations c
     set buyer_unread = case when c.buyer_id = v_uid then 0 else c.buyer_unread end,
         seller_unread = case when private.is_store_owner(c.store_id) then 0 else c.seller_unread end
   where c.id = p_conversation_id
     and (c.buyer_id = v_uid or private.is_store_owner(c.store_id));
end;
$$;

-- Boîte de réception : mes conversations comme client ET comme vendeur, avec le nom à afficher.
-- Le nom du client n'est lisible que par la boutique à qui il a écrit.
create or replace function public.my_conversations()
returns table (
  id uuid,
  role text,
  store_id uuid,
  store_slug text,
  store_name text,
  store_logo_path text,
  buyer_name text,
  last_message text,
  last_message_at timestamptz,
  last_from_me boolean,
  unread integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
         case when c.buyer_id = (select auth.uid()) then 'buyer' else 'seller' end,
         s.id, s.slug::text, s.name, s.logo_path,
         coalesce(nullif(btrim(p.full_name), ''), 'Client'),
         c.last_message, c.last_message_at,
         c.last_sender_id = (select auth.uid()),
         case when c.buyer_id = (select auth.uid()) then c.buyer_unread else c.seller_unread end
    from public.conversations c
    join public.stores s on s.id = c.store_id
    left join public.profiles p on p.id = c.buyer_id
   where c.last_message <> ''
     and (c.buyer_id = (select auth.uid()) or s.owner_id = (select auth.uid()))
   order by c.last_message_at desc
   limit 200;
$$;

revoke execute on function public.open_conversation(uuid) from public, anon;
revoke execute on function public.send_message(uuid, text) from public, anon;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.open_conversation(uuid) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.my_conversations() to authenticated;
