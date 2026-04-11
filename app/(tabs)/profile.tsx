import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AnimatedButton from '@/components/ui/AnimatedButton';

export default function Profile() {
  const { user, profile, signOut } = useAuthStore();

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
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
        <Ionicons name="person-circle-outline" size={80} color="#A855F7" />
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
        <Text
          style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}
        >
          Sign in to see your profile, upload tracks and follow artists.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#000000' }}
      contentContainerStyle={{ padding: 24 }}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        {profile.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              borderWidth: 2,
              borderColor: '#A855F7',
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
              borderColor: '#A855F7',
            }}
          >
            <Ionicons name="person" size={48} color="#A855F7" />
          </View>
        )}
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
        {profile.bio && (
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
        )}
      </View>

      {/* Stats */}
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
          <Text style={{ color: '#A855F7', fontSize: 24, fontWeight: '700' }}>0</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
            Tracks
          </Text>
        </View>
        <View
          style={{
            width: 1,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: '#A855F7', fontSize: 24, fontWeight: '700' }}>0</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
            Followers
          </Text>
        </View>
        <View
          style={{
            width: 1,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: '#A855F7', fontSize: 24, fontWeight: '700' }}>0</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
            Following
          </Text>
        </View>
      </View>

      {/* Sign out */}
      <AnimatedButton variant="secondary" onPress={handleSignOut}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.8)" />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
            Sign Out
          </Text>
        </View>
      </AnimatedButton>
    </ScrollView>
  );
}
