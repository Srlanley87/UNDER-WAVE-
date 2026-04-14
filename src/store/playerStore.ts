import { create } from 'zustand'

export type PlayerTrack = {
  id: string
  title: string
  artist: string
  coverUrl: string | null
  audioUrl?: string | null
  genre?: string | null
}

type PlayerStore = {
  currentTrack: PlayerTrack | null
  isPlaying: boolean
  queue: PlayerTrack[]
  isShuffle: boolean
  isRepeat: boolean
  setQueue: (queue: PlayerTrack[]) => void
  playTrack: (track: PlayerTrack, queue?: PlayerTrack[]) => void
  togglePlay: () => void
  nextTrack: () => void
  prevTrack: () => void
  toggleShuffle: () => void
  toggleRepeat: () => void
}

const MAX_SHUFFLE_ATTEMPTS = 12

function findCurrentIndex(queue: PlayerTrack[], trackId: string | null) {
  if (!trackId) return -1
  return queue.findIndex((track) => track.id === trackId)
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  queue: [],
  isShuffle: false,
  isRepeat: false,
  setQueue: (queue) => {
    set((state) => {
      if (!state.currentTrack) {
        return { queue, currentTrack: queue[0] ?? null }
      }
      const existing = queue.find((track) => track.id === state.currentTrack?.id)
      return { queue, currentTrack: existing ?? queue[0] ?? null }
    })
  },
  playTrack: (track, queue) => {
    set((state) => ({
      currentTrack: track,
      isPlaying: true,
      queue: queue && queue.length > 0 ? queue : state.queue,
    }))
  },
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  nextTrack: () => {
    const state = get()
    if (!state.currentTrack || state.queue.length === 0) return

    const currentIndex = findCurrentIndex(state.queue, state.currentTrack.id)
    if (currentIndex < 0) {
      set({ currentTrack: state.queue[0], isPlaying: true })
      return
    }

    if (state.isShuffle) {
      if (state.queue.length === 1) {
        set({ currentTrack: state.queue[0], isPlaying: true })
        return
      }
      let randomIndex = Math.floor(Math.random() * state.queue.length)
      let attempts = 0
      while (randomIndex === currentIndex && attempts < MAX_SHUFFLE_ATTEMPTS) {
        randomIndex = Math.floor(Math.random() * state.queue.length)
        attempts += 1
      }
      if (randomIndex === currentIndex) {
        randomIndex = (currentIndex + 1) % state.queue.length
      }
      set({ currentTrack: state.queue[randomIndex], isPlaying: true })
      return
    }

    const nextIndex = currentIndex + 1
    if (nextIndex < state.queue.length) {
      set({ currentTrack: state.queue[nextIndex], isPlaying: true })
      return
    }

    if (state.isRepeat) {
      set({ currentTrack: state.queue[0], isPlaying: true })
      return
    }

    set({ isPlaying: false })
  },
  prevTrack: () => {
    const state = get()
    if (!state.currentTrack || state.queue.length === 0) return

    const currentIndex = findCurrentIndex(state.queue, state.currentTrack.id)
    if (currentIndex <= 0) {
      if (state.isRepeat) {
        set({ currentTrack: state.queue[state.queue.length - 1], isPlaying: true })
      }
      return
    }

    set({ currentTrack: state.queue[currentIndex - 1], isPlaying: true })
  },
  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
}))
