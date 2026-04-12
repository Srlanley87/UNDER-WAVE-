import { useEffect, useState } from 'react';
import { Platform, View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      router.replace('/discovery');
      return;
    }

    // With detectSessionInUrl: true, Supabase automatically processes the code
    // from the URL. We just need to wait for the auth state to change.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        router.replace('/discovery');
      }
      if (event === 'SIGNED_OUT') {
        router.replace('/discovery');
      }
    });

    // Also attempt explicit code exchange for robustness
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const hasCode = url.includes('code=');
    const hasError = url.includes('error=');

    if (hasError) {
      const params = new URLSearchParams(new URL(url).search);
      const desc = params.get('error_description') ?? 'Authentication failed';
      setErrorMsg(decodeURIComponent(desc));
      setStatus('error');
      setTimeout(() => router.replace('/discovery'), 3000);
      subscription.unsubscribe();
      return;
    }

    if (!hasCode) {
      // No code in URL – just redirect home
      router.replace('/discovery');
      subscription.unsubscribe();
      return;
    }

    // Safety fallback: if SIGNED_IN event doesn't fire within 8 seconds, redirect anyway
    const timeout = setTimeout(() => {
      router.replace('/discovery');
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      {status === 'loading' ? (
        <>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>
            Signing you in…
          </Text>
        </>
      ) : (
        <>
          <Text style={{ color: '#F59E0B', fontSize: 18, fontWeight: '700' }}>
            Authentication Error
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 14,
              textAlign: 'center',
              maxWidth: 320,
            }}
          >
            {errorMsg}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            Redirecting…
          </Text>
        </>
      )}
    </View>
  );
}
