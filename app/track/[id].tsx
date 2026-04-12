import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import type { Track } from '@/lib/database.types';
import { usePlayerStore } from '@/store/playerStore';
import WaveformPlayer from '@/components/waveform/WaveformPlayer';
import AnimatedButton from '@/components/ui/AnimatedButton';

export default function TrackPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const { setTrack: playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore();

  useEffect(() => {
    if (!id) return;
    fetchTrack(id);
  }, [id]);

  async function fetchTrack(trackId: string) {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', trackId)
        .single();

      if (error) {
        console.error('Error fetching track:', error);
        return;
      }
      setTrack(data);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLike() {
    if (!track) return;
    setLiked((v) => !v);
    try {
      await supabase
        .from('tracks')
        .update({ like_count: liked ? track.like_count - 1 : track.like_count + 1 })
        .eq('id', track.id);
    } catch (err) {
      console.error('Like error:', err);
    }
  }

  const isCurrentTrack = currentTrack?.id === track?.id;

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#F59E0B', fontSize: 16 }}>Loading…</Text>
      </View>
    );
  }

  if (!track) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>
          Track not found.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#000000' }}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ padding: 16, paddingTop: Platform.OS === 'ios' ? 56 : 24 }}
      >
        <Ionicons name="chevron-back" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Cover art */}
      <View style={{ paddingHorizontal: 24 }}>
        {track.cover_url ? (
          <Image
            source={{ uri: track.cover_url }}
            style={{
              width: '100%',
              aspectRatio: 1,
              borderRadius: 16,
              backgroundColor: '#0A0A0A',
            }}
          />
        ) : (
          <View
            style={{
              width: '100%',
              aspectRatio: 1,
              borderRadius: 16,
              backgroundColor: '#0A0A0A',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="musical-notes" size={80} color="#F59E0B" />
          </View>
        )}

        {/* Track info */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 20,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: '#ffffff', fontSize: 22, fontWeight: '700' }}
              numberOfLines={1}
            >
              {track.title}
            </Text>
            <Text
              style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginTop: 4 }}
            >
              {track.artist}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLike} style={{ padding: 8 }}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={28}
              color={liked ? '#F59E0B' : 'rgba(255,255,255,0.6)'}
            />
          </TouchableOpacity>
        </View>

        {/* Genre badge */}
        {track.genre && (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: 'rgba(245,158,11,0.15)',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 4,
              marginTop: 12,
              borderWidth: 1,
              borderColor: 'rgba(245,158,11,0.3)',
            }}
          >
            <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '600' }}>
              {track.genre}
            </Text>
          </View>
        )}

        {/* Stats */}
        <View
          style={{
            flexDirection: 'row',
            gap: 16,
            marginTop: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="play" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              {track.play_count.toLocaleString()}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="heart" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              {(track.like_count + (liked ? 1 : 0)).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Play button */}
        <View style={{ marginTop: 24 }}>
          <AnimatedButton
            variant="primary"
            onPress={() => {
              if (isCurrentTrack) {
                togglePlay();
              } else {
                playTrack(track);
              }
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons
                name={isCurrentTrack && isPlaying ? 'pause' : 'play'}
                size={20}
                color="#ffffff"
              />
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>
                {isCurrentTrack && isPlaying ? 'Pause' : 'Play Track'}
              </Text>
            </View>
          </AnimatedButton>
        </View>

        {/* Waveform */}
        <View style={{ marginTop: 32 }}>
          <Text
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 12,
              fontWeight: '600',
              marginBottom: 12,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Waveform & Comments
          </Text>
          <WaveformPlayer track={track} />
        </View>
      </View>
    </ScrollView>
  );
}
