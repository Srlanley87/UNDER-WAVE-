# UNDER-WAVE-
The music app for underground music

## Deploying to Vercel (Web Preview)

This project is configured to deploy to [Vercel](https://vercel.com) as a static Expo web app — **no terminal required**.

### Step-by-Step: Deploy via the Vercel Dashboard

1. **Push this repository to GitHub** (or ensure it is already on GitHub).

2. **Go to [vercel.com](https://vercel.com)** and sign in (you can sign in with your GitHub account).

3. Click **"Add New…"** → **"Project"**.

4. Under *"Import Git Repository"*, find and select **UNDER-WAVE-** from the list, then click **"Import"**.

5. On the *"Configure Project"* screen, Vercel will auto-detect the settings from `vercel.json`. You just need to add your **Environment Variables** before deploying:

   | Name | Value |
   |---|---|
   | `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase `anon` public API key |
   | `EXPO_PUBLIC_SITE_URL` | Your Vercel deployment URL (e.g. `https://under-wave-xyz.vercel.app`) |

   Click **"Add"** for each variable, pasting in the values from your Supabase Dashboard → **Settings → API**.

6. Click **"Deploy"** and wait for the build to finish (usually 2–4 minutes).

7. Once done, Vercel will give you a live preview URL like `https://under-wave-abc123.vercel.app`. Open it in your browser to test the web version of your app!

### How it works

| Setting | Value |
|---|---|
| Build Command | `npx expo export --platform web` |
| Output Directory | `dist` |
| Framework | Other (Static) |

The `vercel.json` file in this repository automatically configures all of the above for you.

---

## Supabase Configuration Checklist

If you are experiencing any of the following issues, follow this checklist to configure Supabase correctly:

- ❌ Black screen after Google sign-in (OAuth callback)
- ❌ Confirmation email never arrives after sign-up
- ❌ Music upload stuck at 10%
- ❌ Profile page shows "Not signed in" even after logging in

---

### 1. Auth — Site URL & Redirect URIs

**Go to:** Supabase Dashboard → **Authentication** → **URL Configuration**

| Setting | What to set |
|---|---|
| **Site URL** | Your Vercel URL — e.g. `https://under-wave-xyz.vercel.app` |
| **Redirect URLs** | Add `https://under-wave-xyz.vercel.app/auth/callback` |

> ⚠️ If **Site URL** is still set to `http://localhost:3000` or `http://localhost:8081`, Google OAuth will redirect users back to localhost instead of your live app, causing the black screen.

**Also check Google OAuth (if enabled):**

1. Go to **Authentication** → **Providers** → **Google**
2. Make sure Google is **enabled**
3. Copy the **Callback URL** shown there (e.g. `https://omtogejokixledtcgvrg.supabase.co/auth/v1/callback`)
4. Paste that URL into your Google Cloud Console → OAuth 2.0 Client → **Authorized redirect URIs**

---

### 2. Email Confirmation — SMTP Setup

By default, Supabase uses its own built-in email service, which has a **rate limit of 2 emails per hour** and is meant for testing only. To reliably send confirmation emails in production, you must configure a custom SMTP provider.

**Go to:** Supabase Dashboard → **Project Settings** → **Authentication** → **SMTP Settings** (or **Email** section)

**Recommended free SMTP providers:**
- [Resend](https://resend.com) — 3,000 emails/month free, easy setup
- [SendGrid](https://sendgrid.com) — 100 emails/day free
- [Brevo (formerly Sendinblue)](https://brevo.com) — 300 emails/day free

**Steps with Resend (recommended):**
1. Sign up at [resend.com](https://resend.com) and verify your sending domain (or use their sandbox for testing)
2. Create an API key
3. In Supabase → Project Settings → Authentication → SMTP:
   - **Enable Custom SMTP**: ON
   - **Sender email**: e.g. `noreply@yourdomain.com`
   - **Sender name**: `UNDERWAVE`
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **Username**: `resend`
   - **Password**: your Resend API key
4. Click **Save**

**To verify it works:**
1. Go to **Authentication** → **Email Templates** and confirm the "Confirm signup" template is enabled
2. Sign up with a new test email — you should receive a confirmation link within 1 minute

**Optional – Disable email confirmation (for testing only):**
Go to **Authentication** → **Providers** → **Email** → Turn **OFF** "Confirm email". This lets users log in immediately without confirming. *Re-enable this for production.*

---

### 3. Storage Buckets & Policies

#### Create the `tracks` bucket

1. Go to **Storage** in the left menu
2. Click **New Bucket**
3. Name: `tracks`
4. Toggle **"Public bucket"** → **ON**
5. Click **Save**

#### Apply Storage RLS Policies

Go to **SQL Editor** → **New Query**, paste the following, and click **Run**:

```sql
-- Allow anyone to read/stream audio and cover art
CREATE POLICY "Anyone can read tracks storage"
ON storage.objects FOR SELECT
USING ( bucket_id = 'tracks' );

-- Allow signed-in users to upload
CREATE POLICY "Authenticated users can upload tracks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'tracks' );

-- Allow users to replace their own files
CREATE POLICY "Users can update their own track files"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'tracks' AND auth.uid() = owner );

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own track files"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'tracks' AND auth.uid() = owner );
```

> ℹ️ If you store cover images separately, repeat the above for a bucket named `images`.

**To verify:** Try uploading a small MP3 from the Upload tab. If it still fails, check **Storage** → **Policies** to confirm the policies are listed.

---

### 4. Database Tables & RLS Policies

#### Enable RLS on all tables

Go to **Table Editor** → select each table → **RLS** tab → **Enable RLS** (if not already on).

Then go to **SQL Editor** → **New Query**, paste the following, and click **Run**:

```sql
-- ==========================================
-- PROFILES POLICIES
-- ==========================================
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- ==========================================
-- TRACKS POLICIES
-- ==========================================
CREATE POLICY "Tracks are viewable by everyone"
ON tracks FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upload tracks"
ON tracks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracks"
ON tracks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracks"
ON tracks FOR DELETE
USING (auth.uid() = user_id);

-- ==========================================
-- COMMENTS POLICIES
-- ==========================================
CREATE POLICY "Comments are viewable by everyone"
ON comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can post comments"
ON comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON comments FOR DELETE
USING (auth.uid() = user_id);

-- ==========================================
-- PLAY EVENTS POLICIES
-- ==========================================
CREATE POLICY "Anyone can insert play events"
ON play_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Play events are viewable by everyone"
ON play_events FOR SELECT USING (true);

-- ==========================================
-- FOLLOWS POLICIES
-- ==========================================
CREATE POLICY "Follows are viewable by everyone"
ON follows FOR SELECT USING (true);

CREATE POLICY "Users can follow others"
ON follows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others"
ON follows FOR DELETE
USING (auth.uid() = follower_id);
```

> ℹ️ If you get "policy already exists" errors, that is fine — it means the policy was already created.

---

### 5. Auto-Create Profile on Sign-Up (Database Trigger)

Without this trigger, new users can log in but their profile row in the `profiles` table is never created, so the Profile tab shows "Not signed in" even though they are logged in.

Go to **SQL Editor** → **New Query**, paste the following, and click **Run**:

```sql
-- Function: create a profile row whenever a new user signs up
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

-- Trigger: run the function every time a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

**To verify:** Sign up a new user, then go to **Table Editor** → `profiles`. You should see a new row appear within seconds.

---

### 6. Quick Verification Checklist

After completing all steps above, run through this check:

- [ ] **Supabase Site URL** is set to your Vercel URL (not localhost)
- [ ] **Redirect URL** `https://your-app.vercel.app/auth/callback` is added
- [ ] **Google OAuth** Callback URL is registered in Google Cloud Console
- [ ] **SMTP** is configured and test email arrives within 1 minute
- [ ] **Storage** bucket `tracks` exists and is **Public**
- [ ] **Storage RLS policies** are applied (4 policies on `storage.objects`)
- [ ] **Database RLS policies** are applied to all tables
- [ ] **Auto-profile trigger** `on_auth_user_created` exists (check **Database** → **Triggers**)
- [ ] **Environment variable** `EXPO_PUBLIC_SITE_URL` is set in Vercel to your deployment URL
