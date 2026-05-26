
-- enums
create type public.user_type as enum ('farm', 'individual');
create type public.media_type as enum ('image', 'video');
create type public.listing_status as enum ('active', 'sold', 'inactive');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  whatsapp text,
  user_type public.user_type not null default 'individual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- farms
create table public.farms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  location text,
  cover_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.farms enable row level security;
create policy "farms_select_all" on public.farms for select using (true);
create policy "farms_insert_own" on public.farms for insert with check (auth.uid() = owner_id);
create policy "farms_update_own" on public.farms for update using (auth.uid() = owner_id);
create policy "farms_delete_own" on public.farms for delete using (auth.uid() = owner_id);

-- listings
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete set null,
  title text not null,
  description text,
  price numeric(12,2) not null,
  age_months integer,
  weight_kg integer,
  location text,
  phone text,
  whatsapp text,
  status public.listing_status not null default 'active',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.listings enable row level security;
create policy "listings_select_all" on public.listings for select using (true);
create policy "listings_insert_own" on public.listings for insert with check (auth.uid() = seller_id);
create policy "listings_update_own" on public.listings for update using (auth.uid() = seller_id);
create policy "listings_delete_own" on public.listings for delete using (auth.uid() = seller_id);

create index listings_seller_idx on public.listings(seller_id);
create index listings_status_idx on public.listings(status);
create index listings_created_idx on public.listings(created_at desc);

-- listing_media
create table public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  type public.media_type not null default 'image',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.listing_media enable row level security;
create policy "listing_media_select_all" on public.listing_media for select using (true);
create policy "listing_media_insert_own" on public.listing_media for insert
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create policy "listing_media_delete_own" on public.listing_media for delete
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create index listing_media_listing_idx on public.listing_media(listing_id);

-- favorites
create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
alter table public.favorites enable row level security;
create policy "favorites_select_own" on public.favorites for select using (auth.uid() = user_id);
create policy "favorites_insert_own" on public.favorites for insert with check (auth.uid() = user_id);
create policy "favorites_delete_own" on public.favorites for delete using (auth.uid() = user_id);

-- booking_requests
create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid references auth.users(id) on delete set null,
  buyer_name text not null,
  buyer_phone text not null,
  message text,
  created_at timestamptz not null default now()
);
alter table public.booking_requests enable row level security;
create policy "booking_requests_insert_auth" on public.booking_requests for insert
  to authenticated with check (auth.uid() = buyer_id);
create policy "booking_requests_select_buyer" on public.booking_requests for select
  using (auth.uid() = buyer_id);
create policy "booking_requests_select_seller" on public.booking_requests for select
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_set_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger farms_set_updated before update on public.farms
  for each row execute function public.set_updated_at();
create trigger listings_set_updated before update on public.listings
  for each row execute function public.set_updated_at();

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- storage buckets
insert into storage.buckets (id, name, public) values
  ('listing-media', 'listing-media', true),
  ('farm-covers', 'farm-covers', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- storage policies: public read, owner write (files stored under {user_id}/...)
create policy "public_read_listing_media" on storage.objects for select
  using (bucket_id = 'listing-media');
create policy "owner_upload_listing_media" on storage.objects for insert
  with check (bucket_id = 'listing-media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner_update_listing_media" on storage.objects for update
  using (bucket_id = 'listing-media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner_delete_listing_media" on storage.objects for delete
  using (bucket_id = 'listing-media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "public_read_farm_covers" on storage.objects for select
  using (bucket_id = 'farm-covers');
create policy "owner_upload_farm_covers" on storage.objects for insert
  with check (bucket_id = 'farm-covers' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner_update_farm_covers" on storage.objects for update
  using (bucket_id = 'farm-covers' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner_delete_farm_covers" on storage.objects for delete
  using (bucket_id = 'farm-covers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "public_read_avatars" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "owner_upload_avatars" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner_update_avatars" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner_delete_avatars" on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
