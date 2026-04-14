# UNDERWAVE (Web Rebuild)

UNDERWAVE is now a web-only React + Vite app with a simplified Supabase upload flow.

## Required Environment Variables

Use either `VITE_*` or `EXPO_PUBLIC_*` names (both are supported):

- `VITE_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Optional: `VITE_SUPABASE_COVER_BUCKET` / `EXPO_PUBLIC_SUPABASE_COVER_BUCKET` (default: `cover`)

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

## Upload Expectations

- Audio bucket: `audio`
- Cover bucket: `cover` (or env override)
- The app uploads files directly with Supabase Storage and then inserts metadata into `tracks`.

## Supabase SQL (Complete Library Backend)

Run this in the Supabase SQL editor to provision the app tables, relations, indexes, and RLS policies:

```sql
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  updated_at timestamptz not null default now()
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  artist text,
  genre text,
  audio_url text not null,
  cover_url text,
  play_count integer not null default 0,
  like_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, track_id)
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (playlist_id, track_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.play_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_tracks_created_at on public.tracks (created_at desc);
create index if not exists idx_tracks_user_id on public.tracks (user_id);
create index if not exists idx_likes_user_track on public.likes (user_id, track_id);
create index if not exists idx_play_events_user_created on public.play_events (user_id, created_at desc);
create index if not exists idx_comments_track_created on public.comments (track_id, created_at desc);
create index if not exists idx_playlist_tracks_playlist on public.playlist_tracks (playlist_id);

alter table public.profiles enable row level security;
alter table public.tracks enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.comments enable row level security;
alter table public.play_events enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "tracks_select_all" on public.tracks;
drop policy if exists "tracks_insert_own" on public.tracks;
drop policy if exists "tracks_update_own" on public.tracks;
drop policy if exists "tracks_delete_own" on public.tracks;
create policy "tracks_select_all" on public.tracks for select using (true);
create policy "tracks_insert_own" on public.tracks for insert with check (auth.uid() = user_id);
create policy "tracks_update_own" on public.tracks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tracks_delete_own" on public.tracks for delete using (auth.uid() = user_id);

drop policy if exists "likes_select_own" on public.likes;
drop policy if exists "likes_insert_own" on public.likes;
drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_select_own" on public.likes for select using (auth.uid() = user_id);
create policy "likes_insert_own" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on public.likes for delete using (auth.uid() = user_id);

drop policy if exists "follows_select_all" on public.follows;
drop policy if exists "follows_insert_own" on public.follows;
drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_select_all" on public.follows for select using (true);
create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on public.follows for delete using (auth.uid() = follower_id);

drop policy if exists "playlists_select_own" on public.playlists;
drop policy if exists "playlists_insert_own" on public.playlists;
drop policy if exists "playlists_update_own" on public.playlists;
drop policy if exists "playlists_delete_own" on public.playlists;
create policy "playlists_select_own" on public.playlists for select using (auth.uid() = user_id);
create policy "playlists_insert_own" on public.playlists for insert with check (auth.uid() = user_id);
create policy "playlists_update_own" on public.playlists for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "playlists_delete_own" on public.playlists for delete using (auth.uid() = user_id);

drop policy if exists "playlist_tracks_select_own" on public.playlist_tracks;
drop policy if exists "playlist_tracks_insert_own" on public.playlist_tracks;
drop policy if exists "playlist_tracks_delete_own" on public.playlist_tracks;
create policy "playlist_tracks_select_own" on public.playlist_tracks for select using (auth.uid() = user_id);
create policy "playlist_tracks_insert_own" on public.playlist_tracks for insert with check (auth.uid() = user_id);
create policy "playlist_tracks_delete_own" on public.playlist_tracks for delete using (auth.uid() = user_id);

drop policy if exists "comments_select_all" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_update_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_select_all" on public.comments for select using (true);
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_update_own" on public.comments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = user_id);

drop policy if exists "play_events_select_own" on public.play_events;
drop policy if exists "play_events_insert_own" on public.play_events;
create policy "play_events_select_own" on public.play_events for select using (auth.uid() = user_id);
create policy "play_events_insert_own" on public.play_events for insert with check (auth.uid() = user_id);
```

Recommended storage buckets:

- `audio` (public)
- `cover` (public)
- `avatars` (public)

## Vercel

`vercel.json` is configured for a Vite build output from `dist`.
