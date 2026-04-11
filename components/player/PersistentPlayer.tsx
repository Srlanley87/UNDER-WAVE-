import { Platform, View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '@/hooks/usePlayer';

function WebPersistentPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    repeat,
    dominantColor,
    togglePlay,
    setVolume,
    setRepeat,
    nextTrack,
    prevTrack,
  } = usePlayer();

  if (!currentTrack) return null;

  const { motion } = require('framer-motion');

  const bgColor1 = dominantColor + '66';
  const bgColor2 = dominantColor + '22';

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 72,
        zIndex: 500,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
      }}
    >
      {/* Animated gradient background */}
      <motion.div
        animate={{
          background: `linear-gradient(135deg, ${bgColor1}, ${bgColor2}, rgba(0,0,0,0.95))`,
        }}
        transition={{ duration: 4, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: -1,
        }}
      />

      {/* Cover art */}
      <div style={{ flexShrink: 0 }}>
        {currentTrack.cover_url ? (
          <img
            src={currentTrack.cover_url}
            alt={currentTrack.title}
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              backgroundColor: '#1A1A1A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#A855F7', fontSize: 20 }}>♫</span>
          </div>
        )}
      </div>

      {/* Track info */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div
          style={{
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {currentTrack.title}
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 12,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {currentTrack.artist}
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* Prev */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={prevTrack}
          style={controlButtonStyle}
        >
          ⏮
        </motion.button>

        {/* Play/Pause */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={togglePlay}
          style={{
            ...controlButtonStyle,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#A855F7',
            fontSize: 18,
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </motion.button>

        {/* Next */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={nextTrack}
          style={controlButtonStyle}
        >
          ⏭
        </motion.button>

        {/* Repeat */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() =>
            setRepeat(
              repeat === 'none' ? 'all' : repeat === 'all' ? 'one' : 'none'
            )
          }
          style={{
            ...controlButtonStyle,
            color: repeat !== 'none' ? '#A855F7' : 'rgba(255,255,255,0.5)',
          }}
        >
          {repeat === 'one' ? '🔂' : '🔁'}
        </motion.button>
      </div>

      {/* Volume */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
          minWidth: 120,
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          style={{ width: 80, cursor: 'pointer' }}
        />
      </div>
    </motion.div>
  );
}

const controlButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'rgba(255,255,255,0.8)',
  fontSize: 16,
  width: 32,
  height: 32,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

function NativePersistentPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    repeat,
    togglePlay,
    setVolume,
    setRepeat,
    nextTrack,
    prevTrack,
  } = usePlayer();

  if (!currentTrack) return null;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 72,
        backgroundColor: '#0A0A0A',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 12,
        zIndex: 500,
      } as any}
    >
      {currentTrack.cover_url ? (
        <Image
          source={{ uri: currentTrack.cover_url }}
          style={{ width: 44, height: 44, borderRadius: 8 }}
        />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            backgroundColor: '#1A1A1A',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="musical-note" size={20} color="#A855F7" />
        </View>
      )}

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text
          style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}
          numberOfLines={1}
        >
          {currentTrack.artist}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <TouchableOpacity onPress={prevTrack} style={{ padding: 8 }}>
          <Ionicons name="play-skip-back" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={togglePlay}
          style={{
            backgroundColor: '#A855F7',
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color="#ffffff"
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={nextTrack} style={{ padding: 8 }}>
          <Ionicons name="play-skip-forward" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PersistentPlayer() {
  if (Platform.OS === 'web') {
    return <WebPersistentPlayer />;
  }
  return <NativePersistentPlayer />;
}
