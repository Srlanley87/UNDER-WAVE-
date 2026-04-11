import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/database.types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;

  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: Session | null) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  session: null,

  setUser: (user) => set({ user }),

  setProfile: (profile) => set({ profile }),

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  signOut: () => set({ user: null, profile: null, session: null }),
}));
