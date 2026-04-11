import { Platform } from 'react-native';

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function useColorThief() {
  async function getColor(imageUrl: string): Promise<string | null> {
    // Web-only; SSR-safe guard
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return null;
    }

    try {
      const ColorThief = (await import('color-thief-browser')).default;
      const img = new Image();
      img.crossOrigin = 'anonymous';

      return await new Promise<string | null>((resolve) => {
        img.onload = () => {
          try {
            const colorThief = new ColorThief();
            const [r, g, b] = colorThief.getColor(img) as [number, number, number];
            resolve(rgbToHex(r, g, b));
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = imageUrl;
      });
    } catch {
      return null;
    }
  }

  return { getColor };
}
