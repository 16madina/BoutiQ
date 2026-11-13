-- =============================================================================
-- Photo de profil
--
-- profiles.avatar_path : chemin de la photo dans le dossier public « store-media ».
-- Chaque compte ne peut écrire que dans son propre dossier : users/<identifiant du compte>/…
-- (les boutiques gardent leur dossier <identifiant de la boutique>/…, inchangé).
-- =============================================================================

alter table public.profiles add column if not exists avatar_path text;

create or replace function private.owns_user_folder(p_name text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (storage.foldername(p_name))[1] = 'users'
     and (storage.foldername(p_name))[2] = (select auth.uid())::text;
$$;
revoke execute on function private.owns_user_folder(text) from public, anon;
grant execute on function private.owns_user_folder(text) to authenticated;

create policy "store-media: photo de profil, envoi" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'store-media' and private.owns_user_folder(name));

create policy "store-media: photo de profil, remplacement" on storage.objects
  for update to authenticated
  using (bucket_id = 'store-media' and private.owns_user_folder(name))
  with check (bucket_id = 'store-media' and private.owns_user_folder(name));

create policy "store-media: photo de profil, suppression" on storage.objects
  for delete to authenticated
  using (bucket_id = 'store-media' and private.owns_user_folder(name));
