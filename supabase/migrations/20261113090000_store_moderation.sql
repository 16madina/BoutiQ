-- =============================================================================
-- Modération des boutiques depuis l'application
--
-- Jusqu'ici, une boutique ne passait « vérifiée » que par une modification manuelle
-- de la base (review_store réservé au service_role). Cette migration ajoute :
--   - private.admins        : comptes autorisés à modérer (hors de l'API) ;
--   - is_admin()            : l'app affiche l'écran « Modération » seulement si vrai ;
--   - admin_list_stores()   : boutiques à vérifier, avec les informations privées du vendeur ;
--   - admin_review_store()  : approuver ou refuser (motif obligatoire), le vendeur est notifié ;
--   - lecture de la pièce d'identité (dossier privé seller-documents) par la modération.
--
-- Pour nommer un modérateur (une seule fois, depuis l'éditeur SQL de Supabase) :
--   insert into private.admins (user_id) values ('<identifiant du compte>');
-- L'identifiant du compte est affiché dans Authentication > Users.
-- =============================================================================

create table private.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
-- Schéma « private » : jamais exposé par l'API. Aucun droit accordé aux rôles de l'app.
revoke all on table private.admins from public, anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins a where a.user_id = (select auth.uid()));
$$;
revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- Pour l'interface : faut-il afficher l'entrée « Modération » ?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin();
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Boutiques d'un statut donné (par défaut : en attente), les plus anciennes demandes d'abord.
create or replace function public.admin_list_stores(p_status public.store_status default 'pending_review')
returns table (
  id uuid,
  slug text,
  name text,
  description text,
  city text,
  country text,
  category text,
  status public.store_status,
  submitted_at timestamptz,
  rejection_reason text,
  logo_path text,
  full_name text,
  phone text,
  whatsapp text,
  seller_type public.seller_type,
  business_name text,
  id_document_path text,
  product_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Réservé à la modération BoutiQ' using errcode = '42501';
  end if;
  return query
    select s.id, s.slug::text, s.name, s.description, s.city, s.country, s.category, s.status,
           s.submitted_at, s.rejection_reason, s.logo_path,
           d.full_name, d.phone, d.whatsapp, d.seller_type, d.business_name, d.id_document_path,
           (select count(*) from public.products p where p.store_id = s.id and p.status = 'published')
      from public.stores s
      left join public.seller_details d on d.store_id = s.id
     where s.status = p_status
     order by s.submitted_at asc nulls last, s.created_at asc
     limit 200;
end;
$$;
revoke execute on function public.admin_list_stores(public.store_status) from public, anon;
grant execute on function public.admin_list_stores(public.store_status) to authenticated;

-- Décision : « verified » active les ventes ; « rejected » exige un motif affiché au vendeur.
create or replace function public.admin_review_store(p_store_id uuid, p_decision public.store_status, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_name text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not private.is_admin() then
    raise exception 'Réservé à la modération BoutiQ' using errcode = '42501';
  end if;
  if p_decision not in ('verified', 'rejected') then
    raise exception 'Décision invalide';
  end if;
  if p_decision = 'rejected' and v_reason is null then
    raise exception 'Indiquez le motif du refus';
  end if;

  update public.stores
     set status = p_decision,
         rejection_reason = case when p_decision = 'rejected' then left(v_reason, 280) end,
         verified_at = case when p_decision = 'verified' then now() else verified_at end
   where id = p_store_id
  returning owner_id, name into v_owner, v_name;
  if not found then
    raise exception 'Boutique introuvable';
  end if;

  insert into public.notifications (user_id, kind, title, body, store_id)
  values (
    v_owner,
    case when p_decision = 'verified' then 'store_verified' else 'store_rejected' end,
    case when p_decision = 'verified' then 'Votre boutique est vérifiée' else 'Votre boutique doit être corrigée' end,
    case when p_decision = 'verified'
      then '« ' || v_name || ' » peut maintenant recevoir des commandes.'
      else left(v_reason, 200)
    end,
    p_store_id
  );
end;
$$;
revoke execute on function public.admin_review_store(uuid, public.store_status, text) from public, anon;
grant execute on function public.admin_review_store(uuid, public.store_status, text) to authenticated;

-- La modération peut consulter la pièce d'identité (lecture seule, lien temporaire signé).
create policy "seller-documents: lecture par la modération" on storage.objects
  for select to authenticated
  using (bucket_id = 'seller-documents' and private.is_admin());
