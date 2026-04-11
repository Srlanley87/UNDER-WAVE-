'use client';

import { useState } from 'react';
import { Platform, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

function WebAuthModal() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  const { setSession } = useAuthStore();

  if (!visible) return null;

  async function handleAuth() {
    setError(null);
    setLoading(true);
    try {
      if (tab === 'signin') {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        setSession(data.session);
        setVisible(false);
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
          },
        });
        if (err) throw err;

        if (data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            username,
            has_uploaded: false,
          });
        }

        setSession(data.session);
        setVisible(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleOAuth() {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
    } catch (err) {
      console.error('Google OAuth error:', err);
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
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={(e: React.MouseEvent) => {
            if (e.target === e.currentTarget) setVisible(false);
          }}
        >
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              backgroundColor: '#0A0A0A',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 24,
              padding: 32,
              width: '100%',
              maxWidth: 400,
            }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #A855F7, #EC4899)',
                  borderRadius: 12,
                  padding: '8px 16px',
                  marginBottom: 8,
                }}
              >
                <span style={{ color: '#ffffff', fontWeight: 800, fontSize: 20 }}>
                  UNDERWAVE
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>
                Underground music, premium feel.
              </p>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#111111',
                borderRadius: 12,
                padding: 4,
                marginBottom: 24,
              }}
            >
              {(['signin', 'signup'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    transition: 'all 0.2s',
                    backgroundColor: tab === t ? '#A855F7' : 'transparent',
                    color: tab === t ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {t === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tab === 'signup' && (
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    backgroundColor: '#111111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    color: '#ffffff',
                    fontSize: 15,
                    outline: 'none',
                    width: '100%',
                  }}
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  color: '#ffffff',
                  fontSize: 15,
                  outline: 'none',
                  width: '100%',
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  color: '#ffffff',
                  fontSize: 15,
                  outline: 'none',
                  width: '100%',
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              />

              {error && (
                <p
                  style={{
                    color: '#EC4899',
                    fontSize: 13,
                    margin: 0,
                    padding: '8px 12px',
                    backgroundColor: 'rgba(236,72,153,0.1)',
                    borderRadius: 8,
                  }}
                >
                  {error}
                </p>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAuth}
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px 0',
                  color: '#ffffff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#ffffff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    Loading…
                  </>
                ) : tab === 'signin' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </motion.button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  margin: '4px 0',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                />
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>or</span>
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleGoogleOAuth}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  padding: '12px 0',
                  color: '#ffffff',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                  />
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

// Native fallback
function NativeAuthModal() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setSession } = useAuthStore();

  async function handleAuth() {
    setError(null);
    setLoading(true);
    try {
      if (tab === 'signin') {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        setSession(data.session);
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (err) throw err;
        if (data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            username,
            has_uploaded: false,
          });
        }
        setSession(data.session);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 1000,
      } as any}
    >
      <View
        style={{
          backgroundColor: '#0A0A0A',
          borderRadius: 24,
          padding: 28,
          width: '100%',
          maxWidth: 380,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <Text
          style={{
            color: '#ffffff',
            fontSize: 22,
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: 4,
          }}
        >
          UNDERWAVE
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          Underground music, premium feel.
        </Text>

        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#111111',
            borderRadius: 12,
            padding: 4,
            marginBottom: 20,
          }}
        >
          {(['signin', 'signup'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                backgroundColor: tab === t ? '#A855F7' : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: tab === t ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  fontWeight: '600',
                }}
              >
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'signup' && (
          <TextInput
            placeholder="Username"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={username}
            onChangeText={setUsername}
            style={{
              backgroundColor: '#111111',
              borderRadius: 12,
              padding: 14,
              color: '#ffffff',
              marginBottom: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          />
        )}

        <TextInput
          placeholder="Email"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={{
            backgroundColor: '#111111',
            borderRadius: 12,
            padding: 14,
            color: '#ffffff',
            marginBottom: 12,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{
            backgroundColor: '#111111',
            borderRadius: 12,
            padding: 14,
            color: '#ffffff',
            marginBottom: error ? 12 : 16,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        />

        {error && (
          <Text
            style={{
              color: '#EC4899',
              fontSize: 13,
              marginBottom: 12,
              backgroundColor: 'rgba(236,72,153,0.1)',
              padding: 10,
              borderRadius: 8,
            }}
          >
            {error}
          </Text>
        )}

        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading}
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            opacity: loading ? 0.7 : 1,
          }}
        >
          <View
            style={{
              padding: 14,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
              backgroundColor: '#A855F7',
            } as any}
          >
            {loading && <ActivityIndicator size="small" color="#ffffff" />}
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>
              {tab === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AuthModal() {
  if (Platform.OS === 'web') {
    return <WebAuthModal />;
  }
  return <NativeAuthModal />;
}
