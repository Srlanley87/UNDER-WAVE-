import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const { setSession, setProfile, signOut } = useAuthStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user);
      }
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        signOut();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setProfile, signOut]);

  async function fetchProfile(user: User) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
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
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (existingProfile) {
            setProfile(existingProfile);
            return;
          }
        }
        console.error('Error creating profile:', createError);
        return;
      }

      setProfile(createdProfile);
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    }
  }
}
