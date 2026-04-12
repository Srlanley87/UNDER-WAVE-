import { Platform, View } from 'react-native';

interface LogoProps {
  size?: number;
}

/**
 * UNDERWAVE logo – three golden-yellow wavy lines on a black square,
 * inspired by a premium audio brand mark.
 */
export default function Logo({ size = 56 }: LogoProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="56" height="56" rx="12" fill="#0A0A0A" />
        {/* Wave 1 – top */}
        <path
          d="M8 18 Q14 13 20 18 Q26 23 32 18 Q38 13 44 18 Q47 20.5 48 18"
          stroke="#F59E0B"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {/* Wave 2 – middle */}
        <path
          d="M8 28 Q14 23 20 28 Q26 33 32 28 Q38 23 44 28 Q47 30.5 48 28"
          stroke="#F59E0B"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {/* Wave 3 – bottom */}
        <path
          d="M8 38 Q14 33 20 38 Q26 43 32 38 Q38 33 44 38 Q47 40.5 48 38"
          stroke="#F59E0B"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }

  // Native fallback – render via inline SVG-like View composition
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.214,
        backgroundColor: '#0A0A0A',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* We can't render SVG paths natively without react-native-svg,
          so fall back to a simple text mark */}
      {/* eslint-disable-next-line react-native/no-inline-styles */}
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: size * 0.6,
            height: 3,
            backgroundColor: '#F59E0B',
            borderRadius: 2,
            marginVertical: 3,
          }}
        />
      ))}
    </View>
  );
}
