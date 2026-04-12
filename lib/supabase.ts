import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const isClientSideWeb = Platform.OS === 'web' && typeof window !== 'undefined';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isClientSideWeb,
  },
});

function isAbortLikeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return err.name === 'AbortError' || msg.includes('aborted') || msg.includes('timeout');
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } catch (err) {
    if (isAbortLikeError(err)) {
      throw new Error(timeoutMessage);
    }
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

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
