import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Track } from '@/lib/database.types';
import { usePlayerStore } from '@/store/playerStore';
import { Ionicons } from '@expo/vector-icons';
import AnimatedButton from '@/components/ui/AnimatedButton';

interface FeedItem {
  track: Track;
  username: string;
  avatar_url: string | null;
}

type TrackWithProfile = Track & {
  profiles: { username: string; avatar_url: string | null } | null;
};

export default function FollowingFeed() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { setTrack } = usePlayerStore();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get followed user IDs
      const { data: follows, error: followErr } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followErr) {
        console.error('Error fetching follows:', followErr);
        return;
      }

      const followedIds = (follows ?? []).map((f) => f.following_id);

      if (followedIds.length === 0) {
        setItems([]);
        return;
      }

      const { data: tracks, error: trackErr } = await supabase
        .from('tracks')
        .select('*, profiles(username, avatar_url)')
        .in('user_id', followedIds)
        .order('created_at', { ascending: false })
        .limit(30);

      if (trackErr) {
        console.error('Error fetching feed tracks:', trackErr);
        return;
      }

      const feedItems: FeedItem[] = (tracks ?? []).map((row: TrackWithProfile) => ({
        track: {
          id: row.id,
          user_id: row.user_id,
          title: row.title,
          artist: row.artist,
          cover_url: row.cover_url,
          audio_url: row.audio_url,
          genre: row.genre,
          play_count: row.play_count,
          like_count: row.like_count,
          created_at: row.created_at,
        },
        username: row.profiles?.username ?? 'Unknown Artist',
        avatar_url: row.profiles?.avatar_url ?? null,
      }));

      setItems(feedItems);
    } catch (err) {
      console.error('Unexpected error fetching feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  function handleRefresh() {
    setRefreshing(true);
    fetchFeed();
  }

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <Ionicons name="people-outline" size={64} color="#F59E0B" />
        <Text
          style={{
            color: '#ffffff',
            fontSize: 20,
            fontWeight: '700',
            marginTop: 16,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Follow Artists
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          Sign in to follow artists and get a personalised feed of their latest tracks.
        </Text>
      </View>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        {/* Animated illustration placeholder */}
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: 'rgba(245,158,11,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            borderWidth: 2,
            borderColor: 'rgba(245,158,11,0.2)',
          }}
        >
          <Ionicons name="musical-notes-outline" size={56} color="#F59E0B" />
        </View>
        <Text
          style={{
            color: '#ffffff',
            fontSize: 20,
            fontWeight: '700',
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Your feed is empty
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
            fontSize: 14,
            lineHeight: 22,
            marginBottom: 24,
          }}
        >
          Follow some artists to see their latest drops here.
        </Text>
        <AnimatedButton variant="primary" onPress={() => router.push('/(tabs)/discovery')}>
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>Discover Artists</Text>
        </AnimatedButton>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.track.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#F59E0B"
          colors={['#F59E0B']}
        />
      }
      ListHeaderComponent={
        <Text
          style={{
            color: '#ffffff',
            fontSize: 24,
            fontWeight: '800',
            padding: 20,
            paddingBottom: 8,
          }}
        >
          Following
        </Text>
      }
      contentContainerStyle={{ paddingBottom: 120 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => router.push(`/track/${item.track.id}`)}
          activeOpacity={0.8}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.05)',
            gap: 14,
          }}
        >
          {/* Avatar */}
          {item.avatar_url ? (
            <Image
              source={{ uri: item.avatar_url }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: '#F59E0B',
              }}
            />
          ) : (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#1A1A1A',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: '#F59E0B',
              }}
            >
              <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 16 }}>
                {item.username.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Info */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 11,
                marginBottom: 2,
              }}
            >
              @{item.username}
            </Text>
            <Text
              style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}
              numberOfLines={1}
            >
              {item.track.title}
            </Text>
            {item.track.genre && (
              <Text style={{ color: '#F59E0B', fontSize: 11, marginTop: 2 }}>
                {item.track.genre}
              </Text>
            )}
          </View>

          {/* Cover thumbnail */}
          {item.track.cover_url ? (
            <Image
              source={{ uri: item.track.cover_url }}
              style={{ width: 52, height: 52, borderRadius: 10 }}
            />
          ) : (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 10,
                backgroundColor: '#0A0A0A',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="musical-notes" size={22} color="#F59E0B" />
            </View>
          )}

          {/* Play button */}
          <TouchableOpacity
            onPress={() => {
              setTrack(item.track);
            }}
            style={{
              backgroundColor: '#F59E0B',
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="play" size={16} color="#ffffff" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    />
  );
}
