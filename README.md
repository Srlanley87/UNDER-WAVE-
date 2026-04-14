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

## Vercel

`vercel.json` is configured for a Vite build output from `dist`.
