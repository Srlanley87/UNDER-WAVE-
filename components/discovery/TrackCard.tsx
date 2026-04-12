import { Platform, View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Track } from '@/lib/database.types';
import { usePlayerStore } from '@/store/playerStore';

interface TrackCardProps {
  track: Track;
}

function WebTrackCard({ track }: TrackCardProps) {
  const router = useRouter();
  const { setTrack } = usePlayerStore();
  const { motion } = require('framer-motion');

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      onClick={() => router.push(`/track/${track.id}`)}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#0A0A0A',
        border: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {/* Cover image */}
      <div style={{ position: 'relative', paddingBottom: '100%' }}>
        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt={track.title}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#111111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#F59E0B', fontSize: 40 }}>♫</span>
          </div>
        )}

        {/* Play button overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setTrack(track);
            }}
            style={{
              background: '#F59E0B',
              border: 'none',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#000',
              fontSize: 20,
              boxShadow: '0 4px 20px rgba(245,158,11,0.5)',
            }}
          >
            ▶
          </motion.button>
        </motion.div>

        {/* Bottom overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
            padding: '24px 12px 12px',
          }}
        >
          <div
            style={{
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {track.title}
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 11,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {track.artist}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ▶ {track.play_count.toLocaleString()}
        </span>
        <span
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ♥ {track.like_count.toLocaleString()}
        </span>
        {track.genre && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              color: '#F59E0B',
              backgroundColor: 'rgba(245,158,11,0.12)',
              padding: '2px 8px',
              borderRadius: 100,
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            {track.genre}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function NativeTrackCard({ track }: TrackCardProps) {
  const router = useRouter();
  const { setTrack } = usePlayerStore();

  return (
    <TouchableOpacity
      onPress={() => router.push(`/track/${track.id}`)}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#0A0A0A',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
      }}
      activeOpacity={0.8}
    >
      {/* Cover */}
      <View style={{ position: 'relative' }}>
        {track.cover_url ? (
          <Image
            source={{ uri: track.cover_url }}
            style={{ width: '100%', aspectRatio: 1 }}
          />
        ) : (
          <View
            style={{
              width: '100%',
              aspectRatio: 1,
              backgroundColor: '#111111',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="musical-notes" size={36} color="#F59E0B" />
          </View>
        )}

        {/* Overlay */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 10,
            paddingTop: 28,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
          } as any}
        >
          <Text
            style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}
            numberOfLines={1}
          >
            {track.title}
          </Text>
          <Text
            style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}
            numberOfLines={1}
          >
            {track.artist}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingVertical: 6,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name="play" size={10} color="rgba(255,255,255,0.4)" />
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
            {track.play_count.toLocaleString()}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name="heart" size={10} color="rgba(255,255,255,0.4)" />
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
            {track.like_count.toLocaleString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TrackCard({ track }: TrackCardProps) {
  if (Platform.OS === 'web') {
    return <WebTrackCard track={track} />;
  }
  return <NativeTrackCard track={track} />;
}
