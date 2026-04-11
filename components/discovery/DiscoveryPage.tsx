import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Platform, FlatList, useWindowDimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Track } from '@/lib/database.types';
import TrackCard from '@/components/discovery/TrackCard';
import SearchBar from '@/components/discovery/SearchBar';

const GENRES = ['All', 'Hip-Hop', 'Electronic', 'Lo-Fi', 'Indie', 'R&B', 'Afrobeats'];

function WebDiscoveryPage() {
  const { motion } = require('framer-motion');
  const [activeGenre, setActiveGenre] = useState('All');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { width } = useWindowDimensions();
  const columns = width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  const fetchTracks = useCallback(async (genre: string, query: string) => {
    setLoading(true);
    try {
      let q = supabase.from('tracks').select('*').order('created_at', { ascending: false });

      if (genre !== 'All') {
        q = q.eq('genre', genre);
      }

      if (query.trim()) {
        q = q.or(`title.ilike.%${query}%,artist.ilike.%${query}%`);
      }

      const { data, error } = await q.limit(40);
      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }
      setTracks(data ?? []);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchTracks(activeGenre, searchQuery), 300);
    return () => clearTimeout(timer);
  }, [activeGenre, searchQuery, fetchTracks]);

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#000000',
        minHeight: '100vh',
        paddingBottom: 96,
      }}
    >
      {/* Header */}
      <div style={{ padding: '24px 24px 0' }}>
        <h1
          style={{
            color: '#ffffff',
            fontSize: 28,
            fontWeight: 800,
            margin: '0 0 16px',
          }}
        >
          Discover
        </h1>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Genre tabs */}
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          padding: '16px 24px',
          gap: 8,
          scrollbarWidth: 'none',
          position: 'relative',
        }}
      >
        {GENRES.map((genre) => (
          <motion.button
            key={genre}
            onClick={() => setActiveGenre(genre)}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '8px 18px',
              borderRadius: 100,
              border:
                activeGenre === genre
                  ? '1px solid #A855F7'
                  : '1px solid rgba(255,255,255,0.12)',
              backgroundColor:
                activeGenre === genre ? 'rgba(168,85,247,0.15)' : 'transparent',
              color: activeGenre === genre ? '#A855F7' : 'rgba(255,255,255,0.6)',
              fontWeight: activeGenre === genre ? 700 : 500,
              fontSize: 14,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.2s',
              position: 'relative',
            }}
          >
            {activeGenre === genre && (
              <motion.div
                layoutId="genre-underline"
                style={{
                  position: 'absolute',
                  bottom: -2,
                  left: '20%',
                  right: '20%',
                  height: 2,
                  backgroundColor: '#A855F7',
                  borderRadius: 1,
                }}
              />
            )}
            {genre}
          </motion.button>
        ))}
      </div>

      {/* Track grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 16,
          padding: '0 24px',
        }}
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: '#0A0A0A',
                  borderRadius: 16,
                  aspectRatio: '1',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))
          : tracks.map((track) => <TrackCard key={track.id} track={track} />)}
      </div>

      {!loading && tracks.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎵</div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>
            No tracks found. Be the first to upload!
          </p>
        </div>
      )}
    </div>
  );
}

function NativeDiscoveryPage() {
  const [activeGenre, setActiveGenre] = useState('All');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { width } = useWindowDimensions();
  const numColumns = width >= 768 ? 3 : 2;

  const fetchTracks = useCallback(async (genre: string, query: string) => {
    setLoading(true);
    try {
      let q = supabase.from('tracks').select('*').order('created_at', { ascending: false });
      if (genre !== 'All') q = q.eq('genre', genre);
      if (query.trim()) q = q.or(`title.ilike.%${query}%,artist.ilike.%${query}%`);

      const { data, error } = await q.limit(40);
      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }
      setTracks(data ?? []);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchTracks(activeGenre, searchQuery), 300);
    return () => clearTimeout(timer);
  }, [activeGenre, searchQuery, fetchTracks]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '800', marginBottom: 12 }}>
          Discover
        </Text>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </View>

      {/* Genre scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
      >
        {GENRES.map((genre) => (
          <View
            key={genre}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 100,
              borderWidth: 1,
              borderColor: activeGenre === genre ? '#A855F7' : 'rgba(255,255,255,0.12)',
              backgroundColor:
                activeGenre === genre ? 'rgba(168,85,247,0.15)' : 'transparent',
              marginRight: 4,
            }}
          >
            <Text
              onPress={() => setActiveGenre(genre)}
              style={{
                color: activeGenre === genre ? '#A855F7' : 'rgba(255,255,255,0.6)',
                fontWeight: activeGenre === genre ? '700' : '500',
                fontSize: 13,
              }}
            >
              {genre}
            </Text>
          </View>
        ))}
      </ScrollView>

      <FlatList
        data={tracks}
        numColumns={numColumns}
        key={numColumns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ flex: 1 / numColumns, padding: 6 }}>
            <TrackCard track={item} />
          </View>
        )}
        contentContainerStyle={{ padding: 10, paddingBottom: 120 }}
        ListEmptyComponent={
          loading ? null : (
            <View style={{ padding: 48, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
                No tracks found.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

export default function DiscoveryPage() {
  if (Platform.OS === 'web') {
    return <WebDiscoveryPage />;
  }
  return <NativeDiscoveryPage />;
}
