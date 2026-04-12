import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/database.types';

// After this many ms, fall back to a synthetic profile so the UI never
// spins forever when the database is slow or misconfigured.
const PROFILE_FETCH_TIMEOUT_MS = 8000;

export function useAuth() {
  const { setSession, setProfile, setIsAuthLoading, signOut } = useAuthStore();

  useEffect(() => {
    // Listen for future auth changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED…).
    // We deliberately skip INITIAL_SESSION here because getSession() below is
    // the single authoritative first-load handler.  Handling both would race:
    // INITIAL_SESSION fires synchronously during subscription setup, before
    // getSession() resolves, which can cause setIsAuthLoading(false) to be
    // called while the profile fetch is still in flight.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return; // handled below via getSession()
      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        signOut();
      }
    });

    // Authoritative first-load: reads from localStorage (fast, no network
    // round-trip), then fetches the profile, then clears the loading state.
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user);
        }
        setIsAuthLoading(false);
      })
      .catch(() => {
        // Unexpected failure reading the local session — clear state so the
        // auth modal is shown instead of hanging on a loading spinner.
        setIsAuthLoading(false);
      });

    return () => subscription.unsubscribe();
  // Zustand setters are stable references; omitting them from deps is safe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfile(user: User): Promise<void> {
    // Safety valve: if the DB query takes longer than PROFILE_FETCH_TIMEOUT_MS
    // we set a synthetic in-memory profile so the UI never hangs indefinitely.
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      const current = useAuthStore.getState().profile;
      if (!current) {
        setProfile(buildSyntheticProfile(user));
      }
    }, PROFILE_FETCH_TIMEOUT_MS);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      clearTimeout(timeoutId);

      if (error) {
        console.error('Error fetching profile:', error);
        if (!useAuthStore.getState().profile) {
          setProfile(buildSyntheticProfile(user));
        }
        return;
      }

      if (data) {
        setProfile(data);
        return;
      }

      // No profile row yet — create one (handles users who signed up before
      // the DB trigger was in place, or when the trigger is missing).
      const fallbackUsername = buildFallbackUsername(user);

      const { data: created, error: createError } = await supabase
        .from('profiles')
        .insert({ id: user.id, username: fallbackUsername, has_uploaded: false })
        .select('*')
        .single();

      if (createError) {
        if (createError.code === '23505') {
          // Row already exists (race with DB trigger) — re-fetch it.
          const { data: existing } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          setProfile(existing ?? buildSyntheticProfile(user));
          return;
        }
        console.error('Error creating profile:', createError);
        if (!useAuthStore.getState().profile) {
          setProfile(buildSyntheticProfile(user));
        }
        return;
      }

      setProfile(created);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Unexpected error in fetchProfile:', err);
      if (!useAuthStore.getState().profile) {
        setProfile(buildSyntheticProfile(user));
      }
    }
  }
}

function buildFallbackUsername(user: User): string {
  const raw =
    user.user_metadata?.username ??
    user.user_metadata?.preferred_username ??
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
    'user';

  const cleaned = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${cleaned || 'user'}_${user.id.replace(/-/g, '').slice(0, 12)}`.slice(0, 30);
}

/** Creates a minimal in-memory profile from auth user data.
 *  Used as a last resort when the DB is unreachable or misconfigured,
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

  const username =
    String(raw)
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
