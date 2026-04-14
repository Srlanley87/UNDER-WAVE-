import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/database.types';

/** Clears all persisted auth state — used when a stale/invalid session is detected. */
function clearPersistedAuth() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage');
    }
  } catch { /* ignore storage errors */ }
}

function isUnrecoverableRefreshFailure(error: { message?: string } | null | undefined): boolean {
  const msg = error?.message?.toLowerCase() ?? '';
  if (!msg) return false;
  return (
    msg.includes('invalid refresh token') ||
    msg.includes('refresh token not found') ||
    msg.includes('refresh token has expired') ||
    msg.includes('refresh token revoked')
  );
}

export function useAuth() {
  const { setSession, setProfile, setIsAuthLoading, signOut } = useAuthStore();
  // Prevent duplicate profile fetches (getSession + INITIAL_SESSION both fire on load)
  const fetchingForRef = useRef<string | null>(null);

  useEffect(() => {
    let initialLoadDone = false;

    // Get initial session — resolve loading state once done.
    // Guard: if INITIAL_SESSION already handled this (fired before getSession()
    // resolved), skip the full flow to avoid prematurely calling
    // setIsAuthLoading(false) while fetchProfile is still in progress.
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        console.error('[AUTH] getSession error:', sessionError);
      }

      if (initialLoadDone) {
        // INITIAL_SESSION event already processed and started fetchProfile.
        // Just sync the session value in case it differs, then return — the
        // INITIAL_SESSION handler will call setIsAuthLoading(false) when done.
        setSession(session);
        return;
      }
      initialLoadDone = true;

      let resolvedSession = session;

      // If we have a stored user but no active session, try one explicit refresh
      // before signing the user out.
      if (!resolvedSession) {
        const storedUser = useAuthStore.getState().user;
        if (storedUser) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshData.session) {
            resolvedSession = refreshData.session;
            console.log('[AUTH] Session restored via refreshSession');
          } else if (isUnrecoverableRefreshFailure(refreshError)) {
            console.warn('[AUTH] Refresh token invalid/expired — signing out');
            clearPersistedAuth();
            signOut();
          } else if (isUnrecoverableRefreshFailure(sessionError)) {
            // getSession() can also report unrecoverable refresh-token failures.
            // Handle it explicitly (separate from refreshSession error) for clarity.
            console.warn('[AUTH] getSession reported invalid/expired refresh token — signing out');
            clearPersistedAuth();
            signOut();
          } else if (refreshError) {
            console.warn('[AUTH] Transient refresh failure — keeping current auth state:', refreshError.message);
          }
        }
      }

      setSession(resolvedSession);
      if (resolvedSession?.user) {
        await fetchProfile(resolvedSession.user);
      } else if (isUnrecoverableRefreshFailure(sessionError)) {
        clearPersistedAuth();
        signOut();
      }
      setIsAuthLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // INITIAL_SESSION fires when the persisted session is restored from storage.
      // If getSession() hasn't resolved yet we handle everything here; otherwise
      // getSession() already took care of it and we skip to avoid duplicates.
      if (event === 'INITIAL_SESSION') {
        if (!initialLoadDone) {
          // getSession() hasn't resolved yet — handle here and let getSession() no-op
          initialLoadDone = true;
          setSession(session);
          if (session?.user) {
            await fetchProfile(session.user);
          }
          setIsAuthLoading(false);
        }
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('[AUTH] Token refreshed successfully');
      }

      if (event === 'SIGNED_OUT') {
        // Ensure persisted state is also cleared on sign-out
        clearPersistedAuth();
        fetchingForRef.current = null;
        signOut();
        setIsAuthLoading(false);
        return;
      }

      // Ignore null-session events for non-SIGNED_OUT transitions
      // (INITIAL_SESSION is handled above). This avoids force-signing-out users
      // during transient network hiccups where auth events can briefly emit null.
      if (!session) {
        console.warn(`[AUTH] Ignoring transient ${event} event with null session`);
        setIsAuthLoading(false);
        return;
      }

      setSession(session);
      await fetchProfile(session.user);
      setIsAuthLoading(false);
    });

    // Fallback: if auth bootstrap hangs, unblock UI but do not force sign-out.
    // 12s allows slower cold-start/session hydration paths on web deploys.
    const loadingTimeout = setTimeout(() => {
      if (!initialLoadDone) {
        console.warn('[AUTH] Session load timed out — keeping persisted auth state');
        initialLoadDone = true;
        // Only resolve loading if bootstrap has not already completed.
        // This avoids late timeout callbacks touching settled auth state.
        setIsAuthLoading(false);
      }
    }, 12000);

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  // The effect only runs once on mount.  Zustand setter functions (setSession,
  // setProfile, setIsAuthLoading, signOut) are stable references that never
  // change, so omitting them from deps is safe and intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfile(user: User) {
    // Deduplicate: skip if we're already fetching for this user
    if (fetchingForRef.current === user.id) return;
    fetchingForRef.current = user.id;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(buildSyntheticProfile(user));
        return;
      }

      if (data) {
        setProfile(data);
        return;
      }

      const usernameSource =
        user.user_metadata?.username ??
        user.user_metadata?.preferred_username ??
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split('@')[0] ??
        'user';

      const cleaned = String(usernameSource)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

      const fallbackUsername = `${cleaned || 'user'}_${user.id.replace(/-/g, '').slice(0, 12)}`.slice(
        0,
        30
      );

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert(
          {
            id: user.id,
            username: fallbackUsername,
            has_uploaded: false,
          }
        )
        .select('*')
        .single();

      if (createError) {
        if (createError.code === '23505') {
          // Row exists (race with trigger) — re-fetch it
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          setProfile(existingProfile ?? buildSyntheticProfile(user));
          return;
        }
        console.error('Error creating profile:', createError);
        // Fall back to a synthetic profile so the UI never gets stuck
        setProfile(buildSyntheticProfile(user));
        return;
      }

      setProfile(createdProfile);
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(buildSyntheticProfile(user));
    } finally {
      fetchingForRef.current = null;
    }
  }
}

/** Creates a minimal in-memory profile from auth user data.
 *  Used as a last resort when DB is unreachable or misconfigured,
 *  so the UI never shows an infinite loading spinner.
 */
function buildSyntheticProfile(user: User): Profile {
  const raw =
    user.user_metadata?.username ??
    user.user_metadata?.preferred_username ??
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
    'user';

  const username = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'user';

  return {
    id: user.id,
    username,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    bio: null,
    has_uploaded: false,
    created_at: new Date().toISOString(),
  };
}
