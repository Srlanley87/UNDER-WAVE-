import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/database.types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isAuthLoading: boolean;

  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: Session | null) => void;
  setIsAuthLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      session: null,
      isAuthLoading: true,

      setUser: (user) => set({ user }),

      setProfile: (profile) => set({ profile }),

      setSession: (session) =>
        set({ session, user: session?.user ?? null }),

      setIsAuthLoading: (loading) => set({ isAuthLoading: loading }),

      signOut: () => set({ user: null, profile: null, session: null }),
    }),
    {
      name: 'auth-storage',
      // Use the same storage strategy as the Supabase client: localStorage on
      // web, AsyncStorage on native.
      storage:
        Platform.OS === 'web'
          ? createJSONStorage(() =>
              typeof window !== 'undefined'
                ? window.localStorage
                : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
            )
          : createJSONStorage(() => AsyncStorage),
      // Only persist auth data, not loading flags or action functions.
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        session: state.session,
      }),
      // If a persisted user exists, skip the loading spinner — the UI can
      // render immediately while useAuth refreshes the token in the background.
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          state.isAuthLoading = false;
        }
      },
    }
  )
);
