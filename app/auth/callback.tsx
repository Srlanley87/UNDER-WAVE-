import { useEffect, useState } from 'react';
import { Platform, View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const REDIRECT_PATH = '/discovery';
// OAuth redirects on cold web deploys can take longer due to network/provider round-trips.
// Keep this long enough to allow code exchange/session hydration before fallback redirect.
const CALLBACK_TIMEOUT_MS = 15000;

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      router.replace(REDIRECT_PATH);
      return;
    }

    const url = typeof window !== 'undefined' ? window.location.href : '';
    const parsedUrl = new URL(url);
    const searchParams = parsedUrl.searchParams;
    const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
    const hasCode = searchParams.has('code') || hashParams.has('code');
    const hasError =
      searchParams.has('error') ||
      searchParams.has('error_description') ||
      hashParams.has('error') ||
      hashParams.has('error_description');

    if (hasError) {
      try {
        const desc =
          searchParams.get('error_description')
          ?? hashParams.get('error_description')
          ?? searchParams.get('error')
          ?? hashParams.get('error')
          ?? 'Authentication failed';
        setErrorMsg(decodeURIComponent(desc));
      } catch {
        setErrorMsg('Authentication failed');
      }
      setStatus('error');
      setTimeout(() => router.replace(REDIRECT_PATH), 3000);
      return;
    }

    // Safety fallback: redirect regardless
    const timeout = setTimeout(() => {
      router.replace(REDIRECT_PATH);
    }, CALLBACK_TIMEOUT_MS);

    // Subscribe first so we don't miss early auth events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION') &&
        session
      ) {
        clearTimeout(timeout);
        router.replace(REDIRECT_PATH);
      }
    });

    async function handleCallback() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          clearTimeout(timeout);
          router.replace(REDIRECT_PATH);
          return;
        }

        if (!hasCode) {
          clearTimeout(timeout);
          router.replace(REDIRECT_PATH);
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            clearTimeout(timeout);
            router.replace(REDIRECT_PATH);
            return;
          }
          throw error;
        }

        const { data: { session: exchangedSession } } = await supabase.auth.getSession();
        if (exchangedSession) {
          clearTimeout(timeout);
          router.replace(REDIRECT_PATH);
          return;
        }

        setErrorMsg(
          'Session could not be established after authentication. This may be caused by browser storage settings or a network interruption. Please sign in again.'
        );
        setStatus('error');
        setTimeout(() => router.replace(REDIRECT_PATH), 3000);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Unexpected error during sign-in.');
        setStatus('error');
        setTimeout(() => router.replace(REDIRECT_PATH), 3000);
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
