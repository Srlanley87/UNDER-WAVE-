# UNDERWAVE — Supabase Configuration Guide

Follow every step below **once** and your app will work end-to-end: authentication (email + Google), instant sign-up (no email confirmation), track uploads, playback, persistent sessions, profile editing and logout.

---

## 1. Environment Variables (Vercel + local)

In Vercel → Project → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | your `anon` / `public` key from Supabase → Settings → API |
| `EXPO_PUBLIC_SITE_URL` | `https://<your-vercel-domain>.vercel.app` |

> Find URL and anon key at: Supabase Dashboard → Settings (gear icon) → API

Also create a `.env.local` at the project root for local dev:
```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_SITE_URL=http://localhost:8081
```

---

## 2. Disable Email Confirmation (instant sign-up)

1. Supabase Dashboard → **Authentication** → **Providers** → **Email**
2. Toggle **"Confirm email"** to **OFF**
3. Click **Save**

> This lets users sign up and immediately sign in — no email required.
> Once you have a custom domain + SMTP set up, you can re-enable it.

---

## 3. Auth Redirect URLs

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL** to your Vercel URL: `https://<your-app>.vercel.app`
3. Under **Redirect URLs**, add ALL of:
   ```
   https://<your-app>.vercel.app/auth/callback
   http://localhost:8081/auth/callback
   http://localhost:19006/auth/callback
   ```
4. Click **Save**

---

## 4. Google OAuth (optional but recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → Create a project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
2. Application type: **Web application**
3. Authorised redirect URIs: add `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client Secret**
5. In Supabase → **Authentication** → **Providers** → **Google**:
   - Enable it
   - Paste Client ID and Client Secret
   - Save

---

## 5. Database Tables (run in SQL Editor)

Go to Supabase → **SQL Editor** → New query, paste and run:

```sql
-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    text NOT NULL,
  avatar_url  text,
  bio         text,
  has_uploaded boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

-- Users can insert/update only their own profile
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- TRACKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tracks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  artist      text NOT NULL,
  cover_url   text,
  audio_url   text NOT NULL,
  genre       text,
  play_count  integer DEFAULT 0,
  like_count  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Anyone can read tracks
CREATE POLICY "tracks_select" ON public.tracks
  FOR SELECT USING (true);

-- Authenticated users can insert their own tracks
CREATE POLICY "tracks_insert" ON public.tracks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update/delete only their own tracks
CREATE POLICY "tracks_update" ON public.tracks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "tracks_delete" ON public.tracks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGN-UP (TRIGGER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, bio, has_uploaded)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    '',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- OTHER TABLES (comments, play_events, follows)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id          uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  timestamp_seconds integer NOT NULL,
  body              text NOT NULL,
  created_at        timestamptz DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.play_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id       uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  segment_index  integer NOT NULL,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE public.play_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "play_events_select" ON public.play_events FOR SELECT USING (true);
CREATE POLICY "play_events_insert" ON public.play_events FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_select" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);
```

---

## 6. Storage Buckets

The app uses **two separate public buckets**:

| Bucket name | Purpose |
|-------------|---------|
| `audio` | Audio files (MP3, WAV, etc.) |
| `cover` | Cover art images (JPG, PNG, WebP) |

### Create both buckets

Repeat these steps **twice** — once for `audio` and once for `cover`:

1. Supabase → **Storage** → **New Bucket**
2. Name: `audio` (first time) / `cover` (second time)
3. Toggle **"Public bucket"** to **ON** (so audio/image URLs are playable without sign-in)
4. Click **Save**

### Storage Policies (run in SQL Editor)

```sql
-- 1) Create/ensure new buckets exist and are public-readable
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('cover', 'cover', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2) Remove old/conflicting policies (safe if not present)
DROP POLICY IF EXISTS "audio_select" ON storage.objects;
DROP POLICY IF EXISTS "audio_insert" ON storage.objects;
DROP POLICY IF EXISTS "audio_update_own" ON storage.objects;
DROP POLICY IF EXISTS "audio_delete_own" ON storage.objects;

DROP POLICY IF EXISTS "cover_select" ON storage.objects;
DROP POLICY IF EXISTS "cover_insert" ON storage.objects;
DROP POLICY IF EXISTS "cover_update_own" ON storage.objects;
DROP POLICY IF EXISTS "cover_delete_own" ON storage.objects;

-- optional cleanup of old-name policies
DROP POLICY IF EXISTS "tracks_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "tracks_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "tracks_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "tracks_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "covers_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "covers_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "covers_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "covers_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read tracks storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload tracks" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own track files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own track files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read covers storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own cover files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own cover files" ON storage.objects;

-- 3) AUDIO policies
CREATE POLICY "audio_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio');

CREATE POLICY "audio_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio');

CREATE POLICY "audio_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "audio_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4) COVER policies
CREATE POLICY "cover_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'cover');

CREATE POLICY "cover_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cover');

CREATE POLICY "cover_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'cover' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "cover_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cover' AND (storage.foldername(name))[1] = auth.uid()::text);
```

> ⚠️ **Important**: The app code now uploads audio to `audio` and cover art to `cover`.  
> If you use different names, set `EXPO_PUBLIC_SUPABASE_COVER_BUCKET` or update the bucket constants in code.

---

## 7. Backfill profiles for existing users (if needed)

If you already have users in `auth.users` who don't have a row in `profiles`, run:

```sql
INSERT INTO public.profiles (id, username, has_uploaded)
SELECT
  id,
  COALESCE(
    raw_user_meta_data->>'username',
    split_part(email, '@', 1),
    'user_' || substr(id::text, 1, 8)
  ),
  false
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
```

---

## 8. Test Checklist

After completing all steps above:

1. **Deploy** to Vercel (or run `npm run web` locally)
2. **Sign up** with email + password → should log you in immediately (no email confirmation)
3. **Check** Supabase → Table Editor → `profiles` → your row should be there
4. **Sign out** → auth modal should appear immediately
5. **Sign in** with same credentials → should work
6. **Upload** a track in the Studio tab → progress should complete to 100%
7. **Check** Supabase → Table Editor → `tracks` → your track row should be there
8. **Play** the track in the Discovery tab → audio should stream
9. **Google sign-in** → should redirect back to Discovery (not a blank page)
10. **Edit profile** → username and bio changes should persist after page refresh

---

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| Upload stuck at 10% / "Bucket not found" | Create the `audio` and `cover` buckets in Supabase Storage (step 6) |
| Upload blocked by policy | Add storage INSERT policy for authenticated users (step 6) |
| "Email not confirmed" on sign-in | Disable email confirmation in Supabase Auth settings (step 2) |
| Blank page after Google auth | Set correct redirect URLs in Supabase URL Configuration (step 3) |
| Profile not created after sign-up | Run the trigger SQL (step 5) |
| Session lost on page refresh | Check environment variables are set in Vercel (step 1) |
