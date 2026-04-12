import { Platform, TouchableOpacity, Pressable } from 'react-native';
import type { ReactNode } from 'react';

interface AnimatedButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: object;
}

function WebAnimatedButton({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  style = {},
}: AnimatedButtonProps) {
  const { motion } = require('framer-motion');

  const baseStyle: React.CSSProperties = {
    border: 'none',
    borderRadius: 12,
    padding: '12px 20px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #F59E0B, #D97706)',
      color: '#ffffff',
    },
    secondary: {
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.12)',
      color: 'rgba(255,255,255,0.8)',
    },
    ghost: {
      background: 'transparent',
      color: 'rgba(255,255,255,0.6)',
    },
  };

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={disabled ? undefined : onPress}
      style={{ ...baseStyle, ...variantStyles[variant], ...style }}
    >
      {children}
    </motion.button>
  );
}

function NativeAnimatedButton({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  style = {},
}: AnimatedButtonProps) {
  const variantStyles = {
    primary: {
      backgroundColor: '#F59E0B',
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
  };

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.8}
      disabled={disabled}
      style={[
        {
          borderRadius: 12,
          padding: 14,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          opacity: disabled ? 0.5 : 1,
          flexDirection: 'row' as const,
          ...variantStyles[variant],
        },
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function AnimatedButton(props: AnimatedButtonProps) {
  if (Platform.OS === 'web') {
    return <WebAnimatedButton {...props} />;
  }
  return <NativeAnimatedButton {...props} />;
}
