import { createClient } from '@supabase/supabase-js'

type EnvMap = Record<string, string | undefined>
const env = import.meta.env as EnvMap

const supabaseUrl = env.VITE_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
