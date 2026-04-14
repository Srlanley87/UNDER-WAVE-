import { useState, useCallback, useEffect } from 'react';
import { Platform, View, Text, ScrollView } from 'react-native';
import { supabase, getFreshAccessToken } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Track } from '@/lib/database.types';
import ReplayHeatmap from '@/components/studio/ReplayHeatmap';
import AnimatedButton from '@/components/ui/AnimatedButton';
import GlassCard from '@/components/ui/GlassCard';
import { Ionicons } from '@expo/vector-icons';

const GENRES = ['Hip-Hop', 'Electronic', 'Lo-Fi', 'Indie', 'R&B', 'Afrobeats'];
const TRACKS_BUCKET = 'audio';
// Cover art lives in a dedicated "cover" bucket. Set EXPO_PUBLIC_SUPABASE_COVER_BUCKET
// to override (e.g. if you renamed the bucket), otherwise the default is "cover".
const COVER_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_COVER_BUCKET || 'cover';

function UploadTrackCard() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
  const MAX_COVER_BYTES = 5 * 1024 * 1024;

  async function handleUpload() {
    if (!user) {
      setError('You must be signed in to upload tracks.');
      return;
    }
    if (!audioFile || !title.trim()) {
      setError('Please fill in all fields and select an audio file.');
      return;
    }
    if (audioFile.size > MAX_AUDIO_BYTES) {
      setError(`Audio file is too large (max 100 MB). Your file is ${(audioFile.size / 1024 / 1024).toFixed(1)} MB.`);
      return;
    }
    if (coverFile && coverFile.size > MAX_COVER_BYTES) {
      setError(`Cover image is too large (max 5 MB). Your file is ${(coverFile.size / 1024 / 1024).toFixed(1)} MB.`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Pre-check auth state before starting potentially long uploads.
      // If refresh fails, surface a clear error immediately.
      await getFreshAccessToken(15000);

      const artistName = profile?.username || user.email?.split('@')[0] || 'Unknown Artist';
      const audioPath = `${user.id}/${Date.now()}_${audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      console.log(`[UPLOAD] Uploading audio: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(2)} MB)`);

      // Use standard Supabase client upload - it handles auth automatically
      const { error: audioError } = await supabase.storage
        .from(TRACKS_BUCKET)
        .upload(audioPath, audioFile, { upsert: false, contentType: audioFile.type || 'application/octet-stream' });

      if (audioError) {
        console.error('[UPLOAD] Audio upload failed:', audioError);
        throw new Error(`Audio upload failed: ${audioError.message}`);
      }

      console.log('[UPLOAD] Audio uploaded successfully');

      // Get public URL for the audio file
      const { data: audioUrl } = supabase.storage
        .from(TRACKS_BUCKET)
        .getPublicUrl(audioPath);

      let coverUrlStr: string | null = null;

      // Upload cover art if provided
      if (coverFile) {
        const coverPath =
          COVER_BUCKET === TRACKS_BUCKET
            ? `covers/${user.id}/${Date.now()}_${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
            : `${user.id}/${Date.now()}_${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        console.log(`[UPLOAD] Uploading cover: ${coverFile.name}`);

        const { error: coverError } = await supabase.storage
          .from(COVER_BUCKET)
          .upload(coverPath, coverFile, { upsert: false, contentType: coverFile.type || 'application/octet-stream' });

        if (coverError) {
          console.error('[UPLOAD] Cover upload failed:', coverError);
          // Don't fail - cover is optional
        } else {
          const { data: coverUrlData } = supabase.storage
            .from(COVER_BUCKET)
            .getPublicUrl(coverPath);
          coverUrlStr = coverUrlData.publicUrl;
          console.log('[UPLOAD] Cover uploaded successfully');
        }
      }

      // Insert track record into database
      console.log('[DB] Inserting track record...');
      const { error: dbErr } = await supabase.from('tracks').insert({
        user_id: user.id,
        title: title.trim(),
        artist: artistName,
        audio_url: audioUrl.publicUrl,
        cover_url: coverUrlStr,
        genre,
        play_count: 0,
        like_count: 0,
      });

      if (dbErr) {
        console.error('[DB] Insert failed:', dbErr);
        const dbMsg = dbErr.message.toLowerCase();
        if (dbMsg.includes('policy') || dbMsg.includes('permission') || dbErr.code === '42501') {
          throw new Error('Database permission denied. Make sure the "tracks" table has RLS INSERT policy.');
        }
        if (dbMsg.includes('violates foreign key') || dbErr.code === '23503') {
          throw new Error('Your profile does not exist. Please visit the Profile tab first.');
        }
        throw dbErr;
      }

      console.log('[DB] Track inserted successfully');

      // Mark has_uploaded on profile
      await supabase
        .from('profiles')
        .update({ has_uploaded: true })
        .eq('id', user.id)
        .then(({ error: profileErr }) => {
          if (profileErr) console.warn('[DB] Profile update failed:', profileErr.message);
        });

      setSuccess(true);
      setTitle('');
      setAudioFile(null);
      setCoverFile(null);
      console.log('[SUCCESS] Track uploaded successfully');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      console.error('[ERROR]', errorMsg);
      setError(errorMsg);
    } finally {
      setUploading(false);
    }
  }

  if (Platform.OS !== 'web') {
    return (
      <View
        style={{
          backgroundColor: '#0A0A0A',
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
          Upload Track
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          Track uploads are only available on web. Visit underwave.app to upload.
        </Text>
      </View>
    );
  }

  const { motion } = require('framer-motion');

  return (
    <div
      style={{
        backgroundColor: '#0A0A0A',
        borderRadius: 20,
        padding: 24,
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <h2 style={{ color: '#ffffff', fontWeight: 700, fontSize: 18, margin: '0 0 20px' }}>
        Upload Track
      </h2>

      {success && (
        <div
          style={{
            backgroundColor: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 12,
            padding: 12,
            color: '#F59E0B',
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          ✓ Track uploaded successfully!
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 12,
            padding: 12,
            color: '#F87171',
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Title */}
        <input
          type="text"
          placeholder="Track title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />

        {/* Genre */}
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        {/* Audio file drop zone */}
        <label
          style={{
            border: `2px dashed ${audioFile ? '#F59E0B' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 14,
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            backgroundColor: audioFile ? 'rgba(245,158,11,0.05)' : 'transparent',
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) setAudioFile(file);
          }}
        >
          <input
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && setAudioFile(e.target.files[0])}
          />
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎵</div>
          <div style={{ color: audioFile ? '#F59E0B' : 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            {audioFile ? audioFile.name : 'Drop audio file here or click to browse'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>
            MP3, WAV, FLAC, AAC
          </div>
        </label>

        {/* Cover art */}
        <label
          style={{
            border: `2px dashed ${coverFile ? '#F59E0B' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 14,
            padding: '16px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            backgroundColor: coverFile ? 'rgba(245,158,11,0.05)' : 'transparent',
          }}
        >
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && setCoverFile(e.target.files[0])}
          />
          <div style={{ color: coverFile ? '#F59E0B' : 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            {coverFile ? coverFile.name : '🖼 Add cover art (optional)'}
          </div>
        </label>

        {/* Progress bar removed — upload runs in background with "Uploading…" indicator */}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleUpload}
          disabled={uploading}
          style={{
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            border: 'none',
            borderRadius: 12,
            padding: '14px 0',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.7 : 1,
          }}
        >
          {uploading ? 'Uploading…' : 'Upload Track'}
        </motion.button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  backgroundColor: '#111111',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: '12px 16px',
  color: '#ffffff',
  fontSize: 15,
  outline: 'none',
  width: '100%',
};

function AnalyticsCard({ tracks }: { tracks: Track[] }) {
  return (
    <div
      style={{
        backgroundColor: '#0A0A0A',
        borderRadius: 20,
        padding: 24,
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <h2 style={{ color: '#ffffff', fontWeight: 700, fontSize: 18, margin: '0 0 20px' }}>
        Your Tracks
      </h2>

      {tracks.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
          No tracks uploaded yet. Upload your first track!
        </p>
      ) : (
        tracks.map((t) => (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {t.cover_url ? (
              <img
                src={t.cover_url}
                alt=""
                style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  backgroundColor: '#1A1A1A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                🎵
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.title}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                {t.genre ?? 'Unknown'}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ color: '#F59E0B', fontWeight: 700, fontSize: 15 }}>
                {t.play_count.toLocaleString()}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>plays</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ color: '#F59E0B', fontWeight: 700, fontSize: 15 }}>
                {t.like_count.toLocaleString()}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>likes</div>
            </div>
          </div>
        ))
      )}

      {/* Heatmap for first track */}
      {tracks.length > 0 && (
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
            Replay Heatmap — {tracks[0].title}
          </p>
          <ReplayHeatmap trackId={tracks[0].id} />
        </div>
      )}
    </div>
  );
}

export default function CreatorStudio() {
  const user = useAuthStore((s) => s.user);
  const [tracks, setTracks] = useState<Track[]>([]);

  const fetchMyTracks = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }
      setTracks(data ?? []);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchMyTracks();
  }, [fetchMyTracks]);

  if (Platform.OS !== 'web') {
    if (!user) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#F59E0B', fontSize: 40, marginBottom: 12 }}>🎵</Text>
          <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
            Sign in to Upload
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center' }}>
            Create an account or sign in to upload your tracks.
          </Text>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', padding: 24 }}>
        <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '800', marginBottom: 16 }}>
          Upload Music
        </Text>
        <View
          style={{
            backgroundColor: '#0A0A0A',
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 22 }}>
            Track uploads are available on web. Open this app in a browser to upload your music.
          </Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000000', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
        <div style={{ fontSize: 56 }}>🎵</div>
        <h2 style={{ color: '#ffffff', fontWeight: 800, fontSize: 24, margin: 0 }}>
          Sign in to Upload Music
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 320, margin: 0 }}>
          Create a free account or sign in to start uploading your tracks to UNDERWAVE.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#000000',
        padding: '24px',
        paddingBottom: 120,
      }}
    >
      <h1
        style={{
          color: '#ffffff',
          fontWeight: 800,
          fontSize: 28,
          margin: '0 0 8px',
        }}
      >
        Upload Music
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>
        Share your music with the world and track performance.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 24,
        }}
      >
        <UploadTrackCard />
        <AnalyticsCard tracks={tracks} />
      </div>
    </div>
  );
}
