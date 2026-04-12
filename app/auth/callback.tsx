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
      setTimeout(() => router.replace('/'), 3000);
      return;
    }

    // Listen for auth state changes first (before async work)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        subscription.unsubscribe();
        router.replace('/discovery');
      }
    });

    async function handleCallback() {
      // 1. Check if Supabase already auto-exchanged the code (detectSessionInUrl: true)
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        subscription.unsubscribe();
        router.replace('/discovery');
        return;
      }

      // 2. If code is present, explicitly exchange it (handles race conditions)
      if (hasCode) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError.message);
            // Still check for a session – the exchange might have partially succeeded
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              subscription.unsubscribe();
              router.replace('/discovery');
              return;
            }
            setErrorMsg(exchangeError.message);
            setStatus('error');
            setTimeout(() => router.replace('/'), 3000);
            return;
          }
          // Success – the onAuthStateChange listener will fire and redirect
        } catch (err) {
          console.error('Unexpected callback error:', err);
          setErrorMsg('Unexpected error during sign-in.');
          setStatus('error');
          setTimeout(() => router.replace('/'), 3000);
          return;
        }
      } else {
        // No code in URL – user may have navigated here directly
        router.replace('/discovery');
        return;
      }
    }

    handleCallback();

    // Safety fallback: redirect after 10 seconds regardless
    const timeout = setTimeout(() => {
      router.replace('/discovery');
    }, 10000);

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
