import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Database } from '@/lib/database.types';
import { withTimeout } from '@/lib/timeout';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

/**
 * Explicit localStorage adapter for web environments.
 * Passing `undefined` as the storage option causes Supabase to use its
 * internal fallback which can fail silently on Vercel (Expo Web), making
 * the session disappear on page refresh.  Using browser localStorage
 * directly guarantees the session persists across refreshes.
 */
const webLocalStorage = isWeb
  ? {
      getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
      setItem: (key: string, value: string) => Promise.resolve(window.localStorage.setItem(key, value)),
      removeItem: (key: string) => Promise.resolve(window.localStorage.removeItem(key)),
    }
  : undefined;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isWeb ? webLocalStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
});

/**
 * Retrieve the current session's access token as a plain string and
 * immediately release the auth lock.  Callers should use this token
 * directly in XHR / fetch requests so the lock is never held while a
 * long-running upload is in progress.  Holding a `Session` object
 * reference during an upload can cause the Supabase autoRefreshToken
 * background job to race for the same IndexedDB lock and produce the
 * error "Lock … was released because another request stole it".
 */
export async function getAccessTokenNoLock(timeoutMs = 15000): Promise<string> {
  const { data, error } = await withTimeout(
    supabase.auth.getSession(),
    timeoutMs,
    'Timed out while reading your auth session. Close duplicate app tabs and sign in again.'
  );
  if (error || !data.session?.access_token) {
    throw new Error('No active session. Please sign in again.');
  }
  // Return only the token string — do NOT keep a reference to the
  // Session object so the lock is freed as soon as this function returns.
  return data.session.access_token;
}

/**
 * Force-refresh the session and return a guaranteed-fresh access token.
 * Use this immediately before an upload so the token is never stale.
 * Calling refreshSession() obtains new tokens from Supabase and releases
 * the auth lock, so the XHR upload does not contend with autoRefreshToken.
 */
export async function getFreshAccessToken(timeoutMs = 15000): Promise<string> {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.refreshSession(),
      timeoutMs,
      'Timed out while refreshing your auth session. Close duplicate app tabs and sign in again.'
    );
    if (error || !data.session?.access_token) {
      throw new Error('Failed to refresh session: ' + (error?.message ?? 'Unknown error'));
    }
    // Return only the token string so the auth lock is freed immediately.
    return data.session.access_token;
  } catch (err) {
    console.error('[AUTH] Token refresh failed:', err);
    throw new Error('Authentication expired. Please sign in again.');
  }
}
