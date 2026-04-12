import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/database.types';

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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (initialLoadDone) {
        // INITIAL_SESSION event already processed and started fetchProfile.
        // Just sync the session value in case it differs, then return — the
        // INITIAL_SESSION handler will call setIsAuthLoading(false) when done.
        setSession(session);
        return;
      }
      initialLoadDone = true;
      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user);
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
      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        fetchingForRef.current = null;
        signOut();
      }
    });

    return () => subscription.unsubscribe();
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
