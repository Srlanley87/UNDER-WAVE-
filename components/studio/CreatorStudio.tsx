import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform, View, Text, ScrollView } from 'react-native';
import { supabase, getAccessTokenNoLock } from '@/lib/supabase';
import { withTimeout } from '@/lib/timeout';
import { useAuthStore } from '@/store/authStore';
import type { Track } from '@/lib/database.types';
import ReplayHeatmap from '@/components/studio/ReplayHeatmap';
import AnimatedButton from '@/components/ui/AnimatedButton';
import GlassCard from '@/components/ui/GlassCard';
import { Ionicons } from '@expo/vector-icons';

const GENRES = ['Hip-Hop', 'Electronic', 'Lo-Fi', 'Indie', 'R&B', 'Afrobeats'];
const TRACKS_BUCKET = 'tracks';
// Cover art lives in a dedicated "covers" bucket.  Set EXPO_PUBLIC_SUPABASE_COVER_BUCKET
// to override (e.g. if you renamed the bucket), otherwise the default is "covers".
const COVER_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_COVER_BUCKET || 'covers';
const AUTH_SESSION_TIMEOUT_MS = 15000;
const STORAGE_UPLOAD_TIMEOUT_MS = 300000; // 5 minutes
const DB_TIMEOUT_MS = 45000;
const SESSION_ERROR_NO_ACTIVE = 'no active session';
const SESSION_ERROR_SIGN_IN = 'sign in';

/**
 * Upload a file to Supabase Storage via XMLHttpRequest so we get real
 * byte-level progress events.  Falls back to the supabase-js client when
 * XHR isn't available (e.g. non-web environments, missing env vars).
 */
async function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  accessToken: string,
  onProgress: (pct: number) => void
): Promise<void> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  console.log(`[UPLOAD] File selected: ${file.name} (${file.size} bytes, type: ${file.type || 'unknown'})`);

  if (!supabaseUrl || typeof XMLHttpRequest === 'undefined') {
    console.log('[UPLOAD] Using supabase-js fallback (XHR unavailable or no URL)');
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('Supabase credentials not configured. Set EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.');
    }
    // Fallback: supabase-js client (no progress events)
    const { error } = await withTimeout(
      supabase.storage.from(bucket).upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      }),
      STORAGE_UPLOAD_TIMEOUT_MS,
      'Upload timed out while sending file to storage. Check your network and Supabase project status.'
    );
    if (error) throw error;
    return;
  }

  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error(
      'Supabase credentials not configured. Add EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env.local file and restart the dev server.'
    );
  }

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;
  console.log(`[UPLOAD] Starting upload to: ${uploadUrl}`);

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // Supabase Storage REST endpoint for object upload
    xhr.open('POST', uploadUrl);
    // Supabase's API gateway (Kong) requires the apikey header on every request,
    // even when using a Bearer JWT.  Without it the gateway returns 403 and the
    // upload stalls at 0 % / 5 %.
    xhr.setRequestHeader('apikey', anonKey);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    // Supabase Storage REST API accepts a raw binary body; the Content-Type header
    // must be the file's MIME type (not multipart/form-data).
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'false');
    // Set a generous timeout so the upload doesn't hang indefinitely
    xhr.timeout = 300000; // 5 minutes

    console.log('[UPLOAD] Headers set: apikey, Authorization, Content-Type');
    console.log('[UPLOAD] Sending file...');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        const loadedMB = (e.loaded / 1024 / 1024).toFixed(1);
        const totalMB = (e.total / 1024 / 1024).toFixed(1);
        console.log(`[UPLOAD] XHR Progress: ${pct}% (${loadedMB}MB / ${totalMB}MB)`);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      console.log(`[UPLOAD] Response: HTTP ${xhr.status} ${xhr.statusText}`);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let msg = `Upload failed (HTTP ${xhr.status})`;
        console.error('[UPLOAD] Error response body:', xhr.responseText);
        try {
          const resp = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          if (resp.message || resp.error) {
            const detail = resp.message ?? resp.error ?? '';
            if (detail.toLowerCase().includes('bucket not found')) {
              msg = `Storage bucket '${bucket}' not found in Supabase. Create it in the Supabase Dashboard under Storage.`;
            } else if (detail.toLowerCase().includes('not authorized') || detail.toLowerCase().includes('policy')) {
              msg = `Upload permission denied by Supabase storage policy. Check RLS policies on the '${bucket}' bucket.`;
            } else {
              msg = detail;
            }
          } else {
            console.warn('[UPLOAD] Unexpected storage error shape:', xhr.responseText);
          }
        } catch { /* responseText is not JSON — keep generic message */ }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => {
      console.error('[UPLOAD] XHR network error — check CORS, Supabase URL, and internet connection');
      reject(new Error('Network error - check your connection and Supabase configuration.'));
    };
    xhr.onabort = () => {
      console.warn('[UPLOAD] Upload was cancelled');
      reject(new Error('Upload was cancelled.'));
    };
    xhr.ontimeout = () => {
      console.error('[UPLOAD] Upload timed out after 5 minutes');
      reject(new Error('Upload timed out. Check your connection and try with a smaller file first.'));
    };

    xhr.send(file);
  });
}

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
  // Mutex: prevent concurrent uploads that would fight over the auth lock
  const isUploadingRef = useRef(false);

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

    // Mutex guard — only one upload at a time to avoid auth lock contention
    if (isUploadingRef.current) {
      setError('Upload already in progress, please wait…');
      return;
    }
    isUploadingRef.current = true;
    setUploading(true);
    setError(null);

    try {
      // Get the access token as a plain string and release the auth lock
      // immediately.  Do NOT hold a Session object reference during the XHR
      // upload — the autoRefreshToken background job competes for the same
      // IndexedDB lock and will "steal" it, causing the upload to fail.
      let accessToken: string;
      try {
        accessToken = await getAccessTokenNoLock(AUTH_SESSION_TIMEOUT_MS);
      } catch (tokenErr: unknown) {
        const tokenMessage = tokenErr instanceof Error ? tokenErr.message.toLowerCase() : '';
        if (tokenMessage.includes(SESSION_ERROR_NO_ACTIVE) || tokenMessage.includes(SESSION_ERROR_SIGN_IN)) {
          setError('Session expired. Please sign out and sign in again.');
        } else {
          setError('Session check timed out. Close duplicate tabs and retry the upload.');
        }
        return;
      }

      const artistName = profile?.username || user.email?.split('@')[0] || 'Unknown Artist';
      const audioPath = `${user.id}/${Date.now()}_${audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      console.log(`[UPLOAD] Uploading audio track: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(2)} MB)`);
      await uploadWithProgress(
        TRACKS_BUCKET,
        audioPath,
        audioFile,
        accessToken,
        () => {} // progress events logged inside uploadWithProgress
      );

      console.log('[UPLOAD] Getting public URL...');
      const { data: audioUrl } = supabase.storage
        .from(TRACKS_BUCKET)
        .getPublicUrl(audioPath);
      console.log(`[UPLOAD] Audio URL: ${audioUrl.publicUrl}`);

      let coverUrlStr: string | null = null;

      if (coverFile) {
        const coverPath =
          COVER_BUCKET === TRACKS_BUCKET
            ? `covers/${user.id}/${Date.now()}_${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
            : `${user.id}/${Date.now()}_${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        console.log(`[UPLOAD] Uploading cover art: ${coverFile.name}`);
        await uploadWithProgress(
          COVER_BUCKET,
          coverPath,
          coverFile,
          accessToken,
          () => {}
        );

        const { data: coverUrlData } = supabase.storage
          .from(COVER_BUCKET)
          .getPublicUrl(coverPath);
        coverUrlStr = coverUrlData.publicUrl;
        console.log(`[UPLOAD] Cover URL: ${coverUrlStr}`);
      }

      // accessToken is a local string — it will be garbage-collected when this
      // function returns.  No reference is kept, so the auth lock stays free.

      console.log('[DB] Inserting track record with audio_url...');
      const trackInsertPromise = supabase.from('tracks').insert({
        user_id: user.id,
        title: title.trim(),
        artist: artistName,
        audio_url: audioUrl.publicUrl,
        cover_url: coverUrlStr,
        genre,
        play_count: 0,
        like_count: 0,
      });
      const { error: dbErr } = await withTimeout(
        trackInsertPromise,
        DB_TIMEOUT_MS,
        'Saving track metadata timed out. Your file may be uploaded, but database save did not finish.'
      );

      if (dbErr) {
        console.error('[DB] Insert error:', dbErr);
        const dbMsg = dbErr.message.toLowerCase();
        if (dbMsg.includes('policy') || dbMsg.includes('permission') || dbErr.code === '42501') {
          throw new Error('Database permission denied. Make sure the "tracks" table has an RLS INSERT policy for authenticated users.');
        }
        if (dbMsg.includes('violates foreign key') || dbErr.code === '23503') {
          throw new Error('Your profile does not exist yet. Please visit the Profile tab first, then try again.');
        }
        throw dbErr;
      }

      console.log('[DB] Track inserted successfully');

      // Mark has_uploaded on profile
      try {
        await withTimeout(
          supabase
            .from('profiles')
            .update({ has_uploaded: true })
            .eq('id', user.id),
          DB_TIMEOUT_MS,
          'Profile update timed out after upload.'
        );
      } catch (profileErr) {
        console.warn('[DB] Profile update skipped:', profileErr);
      }

      console.log('[SUCCESS] Upload complete');
      setSuccess(true);
      setTitle('');
      setAudioFile(null);
      setCoverFile(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Check your Supabase storage and database configuration.';
      console.error('[UPLOAD] Upload failed:', msg);
      setError(msg);
    } finally {
      isUploadingRef.current = false;
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
