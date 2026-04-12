'use client';

import { useState } from 'react';
import { Platform, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/ui/Logo';

const GOLD = '#F59E0B';
const GOLD_DARK = '#D97706';

function WebAuthModal() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  const { setSession } = useAuthStore();

  if (!visible) return null;

  async function handleAuth() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (tab === 'signin') {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          if (err.message.toLowerCase().includes('email not confirmed')) {
            // Email confirmation is required but user never confirmed –
            // attempt an OTP-based auto-confirm so they can sign in immediately.
            setError(
              'Your email is not confirmed. Please check your inbox, or ask the admin to disable email confirmation in Supabase.'
            );
          } else if (err.message.toLowerCase().includes('invalid login credentials')) {
            setError('Incorrect email or password. Please try again.');
          } else {
            setError(err.message);
          }
          return;
        }
        setSession(data.session);
        setVisible(false);
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (err) { setError(err.message); return; }

        // When email confirmation is DISABLED in Supabase (recommended), data.session
        // is set immediately. When it is enabled, data.session is null.
        if (data.user && !data.session) {
          // Email confirmation is still enabled – guide the user.
          setInfo(
            'Account created! A confirmation email has been sent. Please check your inbox and confirm your email, then sign in here.'
          );
          setTab('signin');
          return;
        }

        if (data.user && data.session) {
          const resolvedUsername =
            username.trim() || data.user.email?.split('@')[0] || 'user';
          await supabase.from('profiles').upsert(
            { id: data.user.id, username: resolvedUsername, has_uploaded: false },
            { onConflict: 'id' }
          );
          setSession(data.session);
          setVisible(false);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleOAuth() {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const siteUrl = (process.env.EXPO_PUBLIC_SITE_URL || origin).replace(/\/$/, '');
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${siteUrl}/auth/callback` },
      });
    } catch (err) {
      console.error('Google OAuth error:', err);
      setError('Failed to start Google sign-in. Please try again.');
    }
  }

  const { AnimatePresence, motion } = require('framer-motion');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16,
          }}
        >
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{
              backgroundColor: '#0A0A0A',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 24, padding: 32,
              width: '100%', maxWidth: 420,
              boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
            }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Logo + Brand */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <Logo size={64} />
              </div>
              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>
                UNDERWAVE
              </div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '4px 0 0' }}>
                Underground music, premium feel.
              </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', backgroundColor: '#111111', borderRadius: 12, padding: 4, marginBottom: 24 }}>
              {(['signin', 'signup'] as const).map((t) => (
                <button key={t} onClick={() => { setTab(t); setError(null); setInfo(null); }}
                  style={{
                    flex: 1, padding: '9px 0', border: 'none', borderRadius: 8,
                    cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'all 0.18s',
                    backgroundColor: tab === t ? GOLD : 'transparent',
                    color: tab === t ? '#000000' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {t === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {info && (
              <p style={{ color: GOLD, fontSize: 13, margin: '0 0 16px', padding: '10px 14px',
                backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10 }}>
                {info}
              </p>
            )}
            {error && (
              <p style={{ color: '#F87171', fontSize: 13, margin: '0 0 16px', padding: '10px 14px',
                backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10 }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tab === 'signup' && (
                <input type="text" placeholder="Username" value={username}
                  onChange={(e) => setUsername(e.target.value)} style={webInputStyle} />
              )}
              <input type="email" placeholder="Email address" value={email}
                onChange={(e) => setEmail(e.target.value)} style={webInputStyle} />
              <input type="password" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)} style={webInputStyle}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()} />

              <motion.button whileTap={{ scale: 0.97 }} onClick={handleAuth} disabled={loading}
                style={{
                  background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`,
                  border: 'none', borderRadius: 12, padding: '14px 0',
                  color: '#000000', fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.75 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading ? 'Loading…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
              </motion.button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
                <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>or</span>
                <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              </div>

              <motion.button whileTap={{ scale: 0.97 }} onClick={handleGoogleOAuth}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 12, padding: '12px 0', color: '#ffffff',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const webInputStyle: React.CSSProperties = {
  backgroundColor: '#111111',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, padding: '13px 16px',
  color: '#ffffff', fontSize: 15, outline: 'none', width: '100%',
};

function NativeAuthModal() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const { setSession } = useAuthStore();

  async function handleAuth() {
    setError(null); setInfo(null); setLoading(true);
    try {
      if (tab === 'signin') {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          if (err.message.toLowerCase().includes('email not confirmed')) {
            setError('Email not confirmed. Check your inbox or ask admin to disable email confirmation.');
          } else if (err.message.toLowerCase().includes('invalid login credentials')) {
            setError('Incorrect email or password.');
          } else { setError(err.message); }
          return;
        }
        setSession(data.session);
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email, password, options: { data: { username } },
        });
        if (err) { setError(err.message); return; }
        if (data.user && !data.session) {
          setInfo('Check your email to confirm your account, then sign in.');
          setTab('signin'); return;
        }
        if (data.user && data.session) {
          const resolvedUsername =
            username.trim() || data.user.email?.split('@')[0] || 'user';
          await supabase.from('profiles').upsert(
            { id: data.user.id, username: resolvedUsername, has_uploaded: false },
            { onConflict: 'id' }
          );
          setSession(data.session);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(false); }
  }

  return (
    <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
      alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 } as any}>
      <View style={{ backgroundColor: '#0A0A0A', borderRadius: 24, padding: 28,
        width: '100%', maxWidth: 380, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>

        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Logo size={56} />
          <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '800', marginTop: 10, letterSpacing: -0.5 }}>
            UNDERWAVE
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 2 }}>
            Underground music, premium feel.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', backgroundColor: '#111111', borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {(['signin', 'signup'] as const).map((t) => (
            <TouchableOpacity key={t} onPress={() => { setTab(t); setError(null); setInfo(null); }}
              style={{ flex: 1, padding: 10, borderRadius: 8,
                backgroundColor: tab === t ? GOLD : 'transparent', alignItems: 'center' }}>
              <Text style={{ color: tab === t ? '#000000' : 'rgba(255,255,255,0.45)', fontWeight: '600', fontSize: 14 }}>
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {info && <Text style={{ color: GOLD, fontSize: 13, marginBottom: 12,
          backgroundColor: 'rgba(245,158,11,0.1)', padding: 10, borderRadius: 8 }}>{info}</Text>}
        {error && <Text style={{ color: '#F87171', fontSize: 13, marginBottom: 12,
          backgroundColor: 'rgba(248,113,113,0.1)', padding: 10, borderRadius: 8 }}>{error}</Text>}

        {tab === 'signup' && (
          <TextInput placeholder="Username" placeholderTextColor="rgba(255,255,255,0.3)"
            value={username} onChangeText={setUsername} style={nativeInputStyle} />
        )}
        <TextInput placeholder="Email address" placeholderTextColor="rgba(255,255,255,0.3)"
          value={email} onChangeText={setEmail} keyboardType="email-address"
          autoCapitalize="none" style={nativeInputStyle} />
        <TextInput placeholder="Password" placeholderTextColor="rgba(255,255,255,0.3)"
          value={password} onChangeText={setPassword} secureTextEntry
          style={{ ...nativeInputStyle, marginBottom: 16 }} />

        <TouchableOpacity onPress={handleAuth} disabled={loading}
          style={{ borderRadius: 12, overflow: 'hidden', opacity: loading ? 0.75 : 1 }}>
          <View style={{ padding: 14, alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 8, backgroundColor: GOLD }}>
            {loading && <ActivityIndicator size="small" color="#000000" />}
            <Text style={{ color: '#000000', fontWeight: '700', fontSize: 15 }}>
              {tab === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const nativeInputStyle = {
  backgroundColor: '#111111', borderRadius: 12, padding: 14,
  color: '#ffffff', marginBottom: 12, borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.1)',
} as const;

export default function AuthModal() {
  if (Platform.OS === 'web') return <WebAuthModal />;
  return <NativeAuthModal />;
}
