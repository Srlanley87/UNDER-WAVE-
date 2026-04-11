import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform, View, Text } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Track, Comment } from '@/lib/database.types';
import { usePlayerStore } from '@/store/playerStore';

interface WaveformPlayerProps {
  track: Track;
}

function seededRandom(seed: number) {
  let x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function generateWaveform(trackId: string, bars = 80): number[] {
  const seed = trackId
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Array.from({ length: bars }, (_, i) => {
    const r = seededRandom(seed + i);
    // Weighted: make it look music-like
    return 0.1 + r * 0.9;
  });
}

function WebWaveformPlayer({ track }: WaveformPlayerProps) {
  const { motion, AnimatePresence } = require('framer-motion');
  const { dominantColor, isPlaying, currentTrack } = usePlayerStore();
  const [playhead, setPlayhead] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const user = useAuthStore((s) => s.user);
  const bars = generateWaveform(track.id);
  const BARS = bars.length;
  const isActive = currentTrack?.id === track.id;

  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('track_id', track.id)
        .order('timestamp_seconds', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }
      setComments(data ?? []);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }, [track.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function postComment(barIndex: number) {
    if (!user || !commentInput.trim()) return;

    const timestamp_seconds = Math.round((barIndex / BARS) * 180);

    try {
      const { error } = await supabase.from('comments').insert({
        track_id: track.id,
        user_id: user.id,
        timestamp_seconds,
        body: commentInput.trim(),
      });

      if (error) {
        console.error('Error posting comment:', error);
        return;
      }

      setCommentInput('');
      setActiveBar(null);
      await fetchComments();
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }

  const color = isActive ? dominantColor : '#A855F7';

  return (
    <div style={{ position: 'relative' }}>
      {/* Waveform SVG */}
      <svg
        width="100%"
        height="80"
        viewBox={`0 0 ${BARS * 6} 80`}
        preserveAspectRatio="none"
        style={{ cursor: 'pointer', display: 'block' }}
        onClick={(e: React.MouseEvent<SVGSVGElement>) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const barIdx = Math.floor((x / rect.width) * BARS);
          const clampedBar = Math.max(0, Math.min(BARS - 1, barIdx));
          setPlayhead(clampedBar / BARS);
          setActiveBar(clampedBar);
        }}
      >
        {bars.map((h, i) => {
          const x = i * 6;
          const barH = h * 64;
          const y = (80 - barH) / 2;
          const isPlayed = i / BARS <= playhead;

          return (
            <rect
              key={i}
              x={x + 1}
              y={y}
              width={4}
              height={barH}
              rx={2}
              fill={isPlayed ? color : 'rgba(255,255,255,0.12)'}
              style={{ transition: 'fill 0.1s' }}
            />
          );
        })}

        {/* Playhead line */}
        <line
          x1={playhead * BARS * 6}
          y1={0}
          x2={playhead * BARS * 6}
          y2={80}
          stroke={color}
          strokeWidth={2}
          strokeDasharray="4 3"
        />

        {/* Comment markers */}
        {comments.map((c) => {
          const markerX = (c.timestamp_seconds / 180) * BARS * 6;
          return (
            <circle
              key={c.id}
              cx={markerX}
              cy={8}
              r={4}
              fill={color}
              opacity={0.85}
              title={c.body}
            />
          );
        })}
      </svg>

      {/* Comment input popup */}
      <AnimatePresence>
        {activeBar !== null && (
          <motion.div
            key="comment-input"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{
              position: 'absolute',
              top: 90,
              left: `${(activeBar / BARS) * 100}%`,
              transform: 'translateX(-50%)',
              backgroundColor: '#111111',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: 12,
              width: 240,
              zIndex: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: '#A855F7',
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Comment at {Math.round((activeBar / BARS) * 180)}s
            </div>
            {user ? (
              <>
                <input
                  type="text"
                  placeholder="Add a comment…"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && postComment(activeBar)}
                  autoFocus
                  style={{
                    width: '100%',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none',
                    marginBottom: 8,
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => postComment(activeBar)}
                    style={{
                      flex: 1,
                      backgroundColor: '#A855F7',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 0',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Post
                  </button>
                  <button
                    onClick={() => setActiveBar(null)}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>
                Sign in to comment.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments list */}
      {comments.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            Comments ({comments.length})
          </p>
          {comments.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 10,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: '#A855F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 12,
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                {c.user_id.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <span
                  style={{
                    color: '#A855F7',
                    fontSize: 11,
                    fontWeight: 600,
                    marginRight: 8,
                  }}
                >
                  {c.timestamp_seconds}s
                </span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                  {c.body}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NativeWaveformPlayer({ track }: WaveformPlayerProps) {
  const [playhead, setPlayhead] = useState(0);
  const bars = generateWaveform(track.id, 40);
  const { dominantColor, currentTrack } = usePlayerStore();
  const color = currentTrack?.id === track.id ? dominantColor : '#A855F7';

  return (
    <View
      style={{
        backgroundColor: '#0A0A0A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          height: 60,
          gap: 2,
        }}
      >
        {bars.map((h, i) => {
          const barH = Math.max(4, h * 56);
          const isPlayed = i / bars.length <= playhead;
          return (
            <View
              key={i}
              onTouchEnd={() => setPlayhead(i / bars.length)}
              style={{
                flex: 1,
                height: barH,
                borderRadius: 2,
                backgroundColor: isPlayed ? color : 'rgba(255,255,255,0.12)',
              }}
            />
          );
        })}
      </View>
      <Text
        style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: 11,
          marginTop: 8,
          textAlign: 'center',
        }}
      >
        Tap waveform to seek (comments available on web)
      </Text>
    </View>
  );
}

export default function WaveformPlayer({ track }: WaveformPlayerProps) {
  if (Platform.OS === 'web') {
    return <WebWaveformPlayer track={track} />;
  }
  return <NativeWaveformPlayer track={track} />;
}
