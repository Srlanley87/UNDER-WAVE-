import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AnimatedButton from '@/components/ui/AnimatedButton';

const GOLD = '#F59E0B';

export default function Profile() {
  const router = useRouter();
  const { user, profile, isAuthLoading, setProfile, signOut } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [trackCount, setTrackCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('tracks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => {
        setTrackCount(count ?? 0);
      });
  }, [user]);

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      signOut();
      // Explicitly clear the persisted auth state so it doesn't survive a refresh
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        router.replace('/');
      }
    } catch (err) {
      console.error('Sign out error:', err);
      // Even if signOut fails, clear local state and redirect
      signOut();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        router.replace('/');
      }
    }
  }

  function startEditing() {
    setEditUsername(profile?.username ?? '');
    setEditBio(profile?.bio ?? '');
    setSaveError(null);
    setEditing(true);
  }

  async function saveProfile() {
    if (!user) return;
    const trimmedUsername = editUsername.trim();
    if (!trimmedUsername) {
      setSaveError('Username cannot be empty.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ username: trimmedUsername, bio: editBio.trim() || null })
        .eq('id', user.id)
        .select('*')
        .single();
      if (error) throw error;
      setProfile(data);
      setEditing(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  if (isAuthLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  if (user && !profile) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          Loading profile…
        </Text>
      </View>
    );
  }

  if (!user || !profile) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Ionicons name="person-circle-outline" size={80} color={GOLD} />
        <Text
          style={{
            color: '#ffffff',
            fontSize: 20,
            fontWeight: '700',
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          Not signed in
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          Sign in to see your profile, upload tracks and follow artists.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#000000' }}
      contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
    >
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        {profile.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              borderWidth: 2,
              borderColor: GOLD,
            }}
          />
        ) : (
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: '#1A1A1A',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: GOLD,
            }}
          >
            <Ionicons name="person" size={48} color={GOLD} />
          </View>
        )}

        {editing ? (
          <View style={{ width: '100%', marginTop: 16, gap: 10 }}>
            <TextInput
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder="Username"
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={{
                backgroundColor: '#111111',
                borderRadius: 12,
                padding: 12,
                color: '#ffffff',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.15)',
                textAlign: 'center',
                fontSize: 16,
                fontWeight: '700',
              }}
            />
            <TextInput
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Add a bio…"
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: '#111111',
                borderRadius: 12,
                padding: 12,
                color: '#ffffff',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.15)',
                textAlign: 'center',
                fontSize: 14,
                minHeight: 72,
              }}
            />
            {saveError && (
              <Text style={{ color: '#F87171', fontSize: 13, textAlign: 'center' }}>
                {saveError}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={saveProfile}
                disabled={saving}
                style={{
                  flex: 1,
                  backgroundColor: GOLD,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <Text style={{ color: '#000000', fontWeight: '700', fontSize: 14 }}>
                  {saving ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditing(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#1A1A1A',
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: 14 }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text
              style={{
                color: '#ffffff',
                fontSize: 22,
                fontWeight: '700',
                marginTop: 12,
              }}
            >
              @{profile.username}
            </Text>
            {profile.bio ? (
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  textAlign: 'center',
                  marginTop: 8,
                  maxWidth: 280,
                }}
              >
                {profile.bio}
              </Text>
            ) : (
              <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 8, fontSize: 13 }}>
                No bio yet
              </Text>
            )}
            <TouchableOpacity
              onPress={startEditing}
              style={{
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#111111',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <Ionicons name="pencil-outline" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' }}>
                Edit Profile
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#0A0A0A',
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: GOLD, fontSize: 24, fontWeight: '700' }}>{trackCount}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
            Tracks
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: GOLD, fontSize: 24, fontWeight: '700' }}>0</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
            Followers
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: GOLD, fontSize: 24, fontWeight: '700' }}>0</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
            Following
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: '#0A0A0A',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <Text
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 11,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          Account Email
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{user.email}</Text>
      </View>

      <AnimatedButton variant="secondary" onPress={handleSignOut}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.8)" />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>Sign Out</Text>
        </View>
      </AnimatedButton>
    </ScrollView>
  );
}
