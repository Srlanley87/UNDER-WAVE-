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
