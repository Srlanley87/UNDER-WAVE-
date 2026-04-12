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

    const url = typeof window !== 'undefined' ? window.location.href : '';
    const hasCode = url.includes('code=');
    const hasError = url.includes('error=');

    if (hasError) {
      try {
        const params = new URLSearchParams(new URL(url).search);
        const desc = params.get('error_description') ?? 'Authentication failed';
        setErrorMsg(decodeURIComponent(desc));
      } catch {
        setErrorMsg('Authentication failed');
      }
      setStatus('error');
      setTimeout(() => router.replace('/discovery'), 3000);
      return;
    }

    // Safety fallback: redirect regardless
    const timeout = setTimeout(() => {
      router.replace('/discovery');
    }, 8000);

    // Subscribe first so we don't miss early auth events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION') &&
        session
      ) {
        clearTimeout(timeout);
        router.replace('/discovery');
      }
    });

    async function handleCallback() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        clearTimeout(timeout);
        router.replace('/discovery');
        return;
      }

      if (!hasCode) {
        clearTimeout(timeout);
        router.replace('/discovery');
        return;
      }

      try {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            clearTimeout(timeout);
            router.replace('/discovery');
            return;
          }
          setErrorMsg(error.message);
          setStatus('error');
          setTimeout(() => router.replace('/discovery'), 3000);
        }
      } catch {
        setErrorMsg('Unexpected error during sign-in.');
        setStatus('error');
        setTimeout(() => router.replace('/discovery'), 3000);
      }
    }

    handleCallback();

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
