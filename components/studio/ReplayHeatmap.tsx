import { useEffect, useState } from 'react';
import { Platform, View, Text } from 'react-native';
import { supabase } from '@/lib/supabase';

interface ReplayHeatmapProps {
  trackId: string;
}

interface SegmentCount {
  segment_index: number;
  count: number;
}

function WebReplayHeatmap({ trackId }: ReplayHeatmapProps) {
  const [segments, setSegments] = useState<SegmentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);

  const NUM_SEGMENTS = 18; // 0–180 seconds in 10s chunks

  useEffect(() => {
    fetchData();
  }, [trackId]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('play_events')
        .select('segment_index')
        .eq('track_id', trackId);

      if (error) {
        console.error('Error fetching play events:', error);
        return;
      }

      const counts: Record<number, number> = {};
      for (let i = 0; i < NUM_SEGMENTS; i++) counts[i] = 0;

      (data ?? []).forEach((row) => {
        if (row.segment_index >= 0 && row.segment_index < NUM_SEGMENTS) {
          counts[row.segment_index]++;
        }
      });

      setSegments(
        Object.entries(counts).map(([k, v]) => ({
          segment_index: Number(k),
          count: v,
        }))
      );
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }

  const maxCount = Math.max(...segments.map((s) => s.count), 1);

  function getBarColor(count: number): string {
    const t = count / maxCount;
    // Interpolate from brand purple to hot pink
    const r = Math.round(168 + (236 - 168) * t);
    const g = Math.round(85 + (72 - 85) * t);
    const b = Math.round(247 + (153 - 247) * t);
    return `rgb(${r},${g},${b})`;
  }

  if (loading) {
    return (
      <div
        style={{
          height: 120,
          backgroundColor: '#0A0A0A',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: 13,
        }}
      >
        Loading heatmap…
      </div>
    );
  }

  const { motion } = require('framer-motion');

  return (
    <div
      style={{
        backgroundColor: '#0A0A0A',
        borderRadius: 16,
        padding: 20,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Chart area */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
          height: 100,
          position: 'relative',
        }}
      >
        {segments.map((seg) => {
          const barH = Math.max(4, (seg.count / maxCount) * 100);
          const isHovered = hoveredSegment === seg.segment_index;

          return (
            <div
              key={seg.segment_index}
              style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}
              onMouseEnter={() => setHoveredSegment(seg.segment_index)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#1A1A1A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '5px 8px',
                    fontSize: 11,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    zIndex: 5,
                    marginBottom: 4,
                  }}
                >
                  {seg.segment_index * 10}–{seg.segment_index * 10 + 10}s
                  <br />
                  <strong style={{ color: getBarColor(seg.count) }}>{seg.count} replays</strong>
                </motion.div>
              )}

              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${barH}%` }}
                transition={{ duration: 0.6, delay: seg.segment_index * 0.03 }}
                style={{
                  width: '100%',
                  borderRadius: '4px 4px 0 0',
                  backgroundColor: getBarColor(seg.count),
                  cursor: 'pointer',
                  opacity: isHovered ? 1 : 0.85,
                  transition: 'opacity 0.2s',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div
        style={{
          display: 'flex',
          marginTop: 6,
          gap: 4,
        }}
      >
        {segments
          .filter((_, i) => i % 3 === 0)
          .map((seg) => (
            <div
              key={seg.segment_index}
              style={{
                flex: 3,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.3)',
                fontSize: 10,
              }}
            >
              {seg.segment_index * 10}s
            </div>
          ))}
      </div>
    </div>
  );
}

function NativeReplayHeatmap({ trackId }: ReplayHeatmapProps) {
  return (
    <View
      style={{
        backgroundColor: '#0A0A0A',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' }}>
        Replay heatmap available on web.
      </Text>
    </View>
  );
}

export default function ReplayHeatmap({ trackId }: ReplayHeatmapProps) {
  if (Platform.OS === 'web') {
    return <WebReplayHeatmap trackId={trackId} />;
  }
  return <NativeReplayHeatmap trackId={trackId} />;
}
