import { Platform, View } from 'react-native';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  style?: object;
}

function WebGlassCard({ children, style = {} }: GlassCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'rgba(10,10,10,0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function NativeGlassCard({ children, style = {} }: GlassCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: '#0A0A0A',
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default function GlassCard(props: GlassCardProps) {
  if (Platform.OS === 'web') {
    return <WebGlassCard {...props} />;
  }
  return <NativeGlassCard {...props} />;
}
