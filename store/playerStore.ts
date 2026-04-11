import { create } from 'zustand';
import type { Track } from '@/lib/database.types';

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  volume: number;
  repeat: 'none' | 'one' | 'all';
  dominantColor: string;

  setTrack: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  setRepeat: (repeat: 'none' | 'one' | 'all') => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setDominantColor: (color: string) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  volume: 0.8,
  repeat: 'none',
  dominantColor: '#A855F7',

  setTrack: (track, queue) =>
    set({
      currentTrack: track,
      queue: queue ?? get().queue,
      isPlaying: true,
    }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setVolume: (volume) => set({ volume }),

  setRepeat: (repeat) => set({ repeat }),

  setDominantColor: (color) => set({ dominantColor: color }),

  nextTrack: () => {
    const { currentTrack, queue, repeat } = get();
    if (!currentTrack || queue.length === 0) return;

    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    if (idx === -1) return;

    if (repeat === 'one') {
      set({ isPlaying: true });
      return;
    }

    const nextIdx = idx + 1;
    if (nextIdx < queue.length) {
      set({ currentTrack: queue[nextIdx], isPlaying: true });
    } else if (repeat === 'all') {
      set({ currentTrack: queue[0], isPlaying: true });
    } else {
      set({ isPlaying: false });
    }
  },

  prevTrack: () => {
    const { currentTrack, queue } = get();
    if (!currentTrack || queue.length === 0) return;

    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    if (idx === -1) return;

    const prevIdx = idx - 1;
    if (prevIdx >= 0) {
      set({ currentTrack: queue[prevIdx], isPlaying: true });
    } else {
      set({ currentTrack: queue[queue.length - 1], isPlaying: true });
    }
  },
}));
