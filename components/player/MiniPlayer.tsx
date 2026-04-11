import { useState } from 'react';
import { Platform, View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '@/hooks/usePlayer';

function WebMiniPlayer() {
  const { currentTrack, isPlaying, togglePlay } = usePlayer();
  const [expanded, setExpanded] = useState(false);

  if (!currentTrack) return null;

  const { motion, AnimatePresence } = require('framer-motion');

  return (
    <>
      {/* Mini bar */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => setExpanded(true)}
        style={{
          backgroundColor: '#111111',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
      >
        {currentTrack.cover_url && (
          <img
            src={currentTrack.cover_url}
            alt=""
            style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {currentTrack.title}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
            {currentTrack.artist}
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            togglePlay();
          }}
          style={{
            background: '#A855F7',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </motion.button>
      </motion.div>

      {/* Expanded bottom sheet */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            onDragEnd={(_: unknown, info: { offset: { y: number } }) => {
              if (info.offset.y > 120) setExpanded(false);
            }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#0A0A0A',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              border: '1px solid rgba(255,255,255,0.08)',
              padding: 24,
              zIndex: 600,
              touchAction: 'none',
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                width: 40,
                height: 4,
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 2,
                margin: '0 auto 20px',
              }}
            />
            <div style={{ textAlign: 'center' }}>
              {currentTrack.cover_url && (
                <img
                  src={currentTrack.cover_url}
                  alt=""
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 16,
                    objectFit: 'cover',
                    margin: '0 auto 16px',
                    display: 'block',
                  }}
                />
              )}
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
                {currentTrack.title}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                {currentTrack.artist}
              </div>
            </div>
            <button
              onClick={() => setExpanded(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 20,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NativeMiniPlayer() {
  const { currentTrack, isPlaying, togglePlay } = usePlayer();

  if (!currentTrack) return null;

  return (
    <View
      style={{
        backgroundColor: '#111111',
        borderRadius: 14,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {currentTrack.cover_url && (
        <Image
          source={{ uri: currentTrack.cover_url }}
          style={{ width: 36, height: 36, borderRadius: 6 }}
        />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
          {currentTrack.artist}
        </Text>
      </View>
      <TouchableOpacity
        onPress={togglePlay}
        style={{
          backgroundColor: '#A855F7',
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function MiniPlayer() {
  if (Platform.OS === 'web') {
    return <WebMiniPlayer />;
  }
  return <NativeMiniPlayer />;
}
