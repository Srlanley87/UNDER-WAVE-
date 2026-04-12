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
    const hasError = url.includes('error=');

    if (hasError) {
      const params = new URLSearchParams(new URL(url).search);
      const desc = params.get('error_description') ?? 'Authentication failed';
      setErrorMsg(decodeURIComponent(desc));
      setStatus('error');
      setTimeout(() => router.replace('/discovery'), 3000);
      return;
    }

    // Safety fallback: redirect after 5 seconds regardless
    const timeout = setTimeout(() => {
      router.replace('/discovery');
    }, 5000);

    // Subscribe FIRST so we don't miss the SIGNED_IN event.
    // Supabase also fires INITIAL_SESSION immediately on subscribe with the
    // current session – this handles the race condition where Supabase already
    // exchanged the PKCE code (via detectSessionInUrl) before this component
    // mounted, so SIGNED_IN was never observed.
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

    // Belt-and-suspenders: check whether the session already exists right now
    // (covers the case where detectSessionInUrl finished before the subscriber
    // above was registered and INITIAL_SESSION fired without a session).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        clearTimeout(timeout);
        router.replace('/discovery');
      }
    });

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
