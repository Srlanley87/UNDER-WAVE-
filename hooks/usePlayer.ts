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
      store.setDominantColor('#F59E0B');
    }
    // getColor and setDominantColor are stable references — intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.currentTrack?.id]);

  return store;
}
