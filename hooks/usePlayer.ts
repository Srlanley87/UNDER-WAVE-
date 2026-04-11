import { useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useColorThief } from '@/hooks/useColorThief';

export function usePlayer() {
  const store = usePlayerStore();
  const { getColor } = useColorThief();

  useEffect(() => {
    if (store.currentTrack?.cover_url) {
      getColor(store.currentTrack.cover_url).then((color) => {
        if (color) {
          store.setDominantColor(color);
        }
      });
    } else {
      store.setDominantColor('#A855F7');
    }
  }, [store.currentTrack?.id]);

  return store;
}
