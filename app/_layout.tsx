import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import PersistentPlayer from '@/components/player/PersistentPlayer';
import AuthModal from '@/components/auth/AuthModal';
import '../global.css';

export default function RootLayout() {
  useAuth();
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#000000" />
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#000000' },
            animation: 'fade',
          }}
        />
        <PersistentPlayer />
        {!user && <AuthModal />}
      </View>
    </SafeAreaProvider>
  );
}
