
-- fix function search path
create or replace function public.set_updated_at()
returns trigger language plpgsql
security invoker
set search_path = public
as $$
begin new.updated_at = now(); return new; end; $$;

-- revoke execute on security definer fns from clients (only trigger uses them)
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- replace broad SELECT policies on storage objects with owner-only listing
-- (public buckets are still readable via public URLs without SELECT policy)
drop policy if exists "public_read_listing_media" on storage.objects;
drop policy if exists "public_read_farm_covers" on storage.objects;
drop policy if exists "public_read_avatars" on storage.objects;

create policy "owner_list_listing_media" on storage.objects for select
  using (bucket_id = 'listing-media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner_list_farm_covers" on storage.objects for select
  using (bucket_id = 'farm-covers' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner_list_avatars" on storage.objects for select
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
