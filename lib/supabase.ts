import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Explicit localStorage adapter for web so sessions survive hard page refreshes.
// Leaving `storage` as undefined can cause some environments (SSR, edge runtimes)
// to fall back to in-memory storage, which loses the session on every reload.
const webStorage =
  typeof window !== 'undefined' && typeof localStorage !== 'undefined'
    ? {
        getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
        setItem: (key: string, value: string) => {
          localStorage.setItem(key, value);
          return Promise.resolve(undefined);
        },
        removeItem: (key: string) => {
          localStorage.removeItem(key);
          return Promise.resolve(undefined);
        },
      }
    : undefined; // SSR / non-browser: no persistence needed

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web' && typeof window !== 'undefined',
  },
});
