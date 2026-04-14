import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import './index.css'
import { AppLayout, type AppTab, PremiumButton } from './_layout'
import { Home } from './Home'
import { supabase } from './lib/supabase'
import { type PlayerTrack, usePlayerStore } from './store/playerStore'

type TrackRow = {
  id: string
  title: string
  artist: string | null
  genre: string | null
  play_count: number | null
  like_count: number | null
  cover_url: string | null
  audio_url: string | null
  user_id: string
  created_at: string
}

type ProfileRow = {
  display_name: string | null
  avatar_url: string | null
}

type PlaylistRow = {
  id: string
  name: string
}

type CommentRow = {
  id: string
  user_id: string
  body: string
}

type FeedTrack = {
  id: string
  title: string
  artist: string
  coverUrl: string | null
}

const GENRES = ['Hip-Hop', 'Electronic', 'Lo-Fi', 'Indie', 'R&B', 'Afrobeats']
const AUDIO_BUCKET = 'audio'
const COVER_BUCKET =
  (import.meta.env as Record<string, string | undefined>).VITE_SUPABASE_COVER_BUCKET ||
  (import.meta.env as Record<string, string | undefined>).EXPO_PUBLIC_SUPABASE_COVER_BUCKET ||
  'cover'
const AVATAR_BUCKET = 'avatars'

const REQUIRED_TABLE_SQL: Record<'likes' | 'follows' | 'playlists' | 'comments', string> = {
  likes: `create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, track_id)
);
alter table public.likes enable row level security;
create policy "likes_select_own" on public.likes for select using (auth.uid() = user_id);
create policy "likes_insert_own" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on public.likes for delete using (auth.uid() = user_id);`,
  follows: `create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);
alter table public.follows enable row level security;
create policy "follows_select_all" on public.follows for select using (true);
create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on public.follows for delete using (auth.uid() = follower_id);`,
  playlists: `create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.playlists enable row level security;
create policy "playlists_select_own" on public.playlists for select using (auth.uid() = user_id);
create policy "playlists_insert_own" on public.playlists for insert with check (auth.uid() = user_id);
create policy "playlists_update_own" on public.playlists for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "playlists_delete_own" on public.playlists for delete using (auth.uid() = user_id);`,
  comments: `create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
create policy "comments_select_all" on public.comments for select using (true);
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_update_own" on public.comments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = user_id);`,
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function toPlayerTrack(track: TrackRow): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist || 'Unknown Artist',
    coverUrl: track.cover_url,
    audioUrl: track.audio_url,
    genre: track.genre,
  }
}

function isMissingTableError(error: { code?: string; message?: string } | null, tableName: string) {
  if (!error) return false
  if (error.code === '42P01') return true
  return (error.message || '').toLowerCase().includes(`relation \"${tableName}\"`)
}

function getTableSqlMessage(table: keyof typeof REQUIRED_TABLE_SQL) {
  return `Missing required table \"${table}\". Run this SQL in Supabase:\n${REQUIRED_TABLE_SQL[table]}`
}

function UnderwaveLogo() {
  return (
    <div className="authLogo" aria-label="Underwave logo" role="img">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="uw-gold" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffcb42" />
            <stop offset="100%" stopColor="#ffb800" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="31" fill="#0f0f13" stroke="rgba(255,255,255,0.12)" />
        <path d="M12 23c6-8 12-8 20 0s14 8 20 0" stroke="url(#uw-gold)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M12 32c6-8 12-8 20 0s14 8 20 0" stroke="url(#uw-gold)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M12 41c6-8 12-8 20 0s14 8 20 0" stroke="url(#uw-gold)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.29h6.46a5.53 5.53 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.55-5.18 3.55-8.67Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.02c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.76-2.1-6.7-4.93H1.3v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.29A7.2 7.2 0 0 1 4.92 12c0-.8.14-1.58.38-2.29V6.62H1.3A12 12 0 0 0 0 12c0 1.94.46 3.78 1.3 5.38l4-3.09Z" />
      <path fill="#EA4335" d="M12 4.77c1.77 0 3.36.61 4.61 1.82l3.45-3.45C17.95 1.16 15.23 0 12 0A12 12 0 0 0 1.3 6.62l4 3.09C6.24 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  )
}

function App() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)
  const [sessionEmail, setSessionEmail] = useState('')
  const [loadingSession, setLoadingSession] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authLoading, setAuthLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState(GENRES[0])
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [allTracks, setAllTracks] = useState<TrackRow[]>([])
  const [userTracks, setUserTracks] = useState<TrackRow[]>([])
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set())
  const [recentTrackIds, setRecentTrackIds] = useState<string[]>([])
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([])

  const [profile, setProfile] = useState<ProfileRow>({ display_name: null, avatar_url: null })
  const [displayNameDraft, setDisplayNameDraft] = useState('')
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileImageUploading, setProfileImageUploading] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  const [playerProgress, setPlayerProgress] = useState(22)
  const [comments, setComments] = useState<Array<{ id: string; author: string; body: string }>>([])
  const [commentDraft, setCommentDraft] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [dataMessage, setDataMessage] = useState<string | null>(null)

  const {
    currentTrack,
    isPlaying,
    queue,
    isShuffle,
    isRepeat,
    setQueue,
    playTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    toggleShuffle,
    toggleRepeat,
  } = usePlayerStore()

  const isAuthed = Boolean(sessionUserId)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSessionUserId(data.session?.user.id ?? null)
      setSessionEmail(data.session?.user.email ?? '')
      setLoadingSession(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user.id ?? null)
      setSessionEmail(session?.user.email ?? '')
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const refreshTracks = async (userId: string) => {
    const { data, error } = await supabase
      .from('tracks')
      .select('id,title,artist,genre,play_count,like_count,cover_url,audio_url,user_id,created_at')
      .order('created_at', { ascending: false })
      .limit(240)

    if (error) {
      setDataMessage(error.message)
      return
    }

    const rows = (data as TrackRow[]) || []
    setAllTracks(rows)
    setUserTracks(rows.filter((track) => track.user_id === userId))

    const playerQueue = rows.map(toPlayerTrack)
    if (playerQueue.length > 0) {
      setQueue(playerQueue)
      if (!currentTrack) {
        playTrack(playerQueue[0], playerQueue)
        togglePlay()
      }
    }
  }

  const refreshLikes = async (userId: string) => {
    const { data, error } = await supabase.from('likes').select('track_id').eq('user_id', userId)
    if (isMissingTableError(error, 'likes')) {
      setDataMessage(getTableSqlMessage('likes'))
      return
    }
    if (error) {
      setDataMessage(error.message)
      return
    }
    const likedIds = new Set(((data as Array<{ track_id: string }>) || []).map((row) => row.track_id))
    setLikedTrackIds(likedIds)
  }

  const refreshRecent = async (userId: string) => {
    const { data, error } = await supabase
      .from('play_events')
      .select('track_id,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40)

    if (error) {
      return
    }

    const rows = (data as Array<{ track_id: string }>) || []
    const unique = Array.from(new Set(rows.map((row) => row.track_id)))
    setRecentTrackIds(unique)
  }

  const refreshPlaylists = async (userId: string) => {
    const { data, error } = await supabase
      .from('playlists')
      .select('id,name')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (isMissingTableError(error, 'playlists')) {
      setDataMessage(getTableSqlMessage('playlists'))
      return
    }
    if (error) {
      setDataMessage(error.message)
      return
    }

    setPlaylists((data as PlaylistRow[]) || [])
  }

  const refreshProfile = async (userId: string) => {
    const [{ data: profileData, error: profileError }, followers, following] = await Promise.all([
      supabase.from('profiles').select('display_name,avatar_url').eq('id', userId).maybeSingle(),
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
    ])

    if (!profileError && profileData) {
      setProfile(profileData as ProfileRow)
      setDisplayNameDraft((profileData as ProfileRow).display_name || '')
    }

    if (isMissingTableError(followers.error, 'follows') || isMissingTableError(following.error, 'follows')) {
      setDataMessage(getTableSqlMessage('follows'))
    } else {
      setFollowersCount(followers.count || 0)
      setFollowingCount(following.count || 0)
    }
  }

  useEffect(() => {
    if (!sessionUserId) {
      setAllTracks([])
      setUserTracks([])
      setLikedTrackIds(new Set())
      setRecentTrackIds([])
      setPlaylists([])
      setComments([])
      return
    }

    void Promise.all([
      refreshTracks(sessionUserId),
      refreshLikes(sessionUserId),
      refreshRecent(sessionUserId),
      refreshPlaylists(sessionUserId),
      refreshProfile(sessionUserId),
    ])
  }, [sessionUserId])

  useEffect(() => {
    if (!sessionUserId || !currentTrack) {
      setComments([])
      return
    }

    const loadComments = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('id,user_id,body')
        .eq('track_id', currentTrack.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (isMissingTableError(error, 'comments')) {
        setDataMessage(getTableSqlMessage('comments'))
        return
      }
      if (error) {
        setDataMessage(error.message)
        return
      }

      const baseComments = (data as CommentRow[]) || []
      const userIds = Array.from(new Set(baseComments.map((item) => item.user_id)))
      const { data: profilesData } = userIds.length
        ? await supabase.from('profiles').select('id,display_name').in('id', userIds)
        : { data: [] }

      const profileMap = new Map<string, string>()
      ;((profilesData as Array<{ id: string; display_name: string | null }>) || []).forEach((item) => {
        profileMap.set(item.id, item.display_name || 'Listener')
      })

      setComments(
        baseComments.map((item) => ({
          id: item.id,
          author: profileMap.get(item.user_id) || 'Listener',
          body: item.body,
        })),
      )
    }

    void loadComments()
  }, [sessionUserId, currentTrack?.id])

  const handleAuth = async () => {
    if (!email.trim() || !password) {
      setAuthMessage('Email and password are required.')
      return
    }

    setAuthLoading(true)
    setAuthMessage(null)

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
        setAuthMessage('Account created. Check your email if confirmation is enabled.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        if (!rememberMe) {
          setAuthMessage('Signed in for this session.')
        }
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Authentication failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setAuthLoading(true)
    setAuthMessage(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      setAuthMessage(error.message)
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUploadMessage(null)
    setAuthMessage('Signed out.')
    setActiveTab('home')
  }

  const handleUpload = async () => {
    if (!sessionUserId) {
      setUploadMessage('Sign in first.')
      return
    }
    if (!title.trim() || !audioFile) {
      setUploadMessage('Track title and audio file are required.')
      return
    }

    setUploading(true)
    setUploadMessage(null)

    try {
      const stamp = Date.now()
      const audioPath = `${sessionUserId}/${stamp}_${safeFileName(audioFile.name)}`

      const { error: audioError } = await supabase.storage.from(AUDIO_BUCKET).upload(audioPath, audioFile, {
        upsert: false,
        contentType: audioFile.type || 'application/octet-stream',
      })

      if (audioError) throw new Error(`Audio upload failed: ${audioError.message}`)

      const { data: audioPublic } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(audioPath)

      let coverUrl: string | null = null

      if (coverFile) {
        const coverPath = `${sessionUserId}/${stamp}_${safeFileName(coverFile.name)}`
        const { error: coverError } = await supabase.storage.from(COVER_BUCKET).upload(coverPath, coverFile, {
          upsert: false,
          contentType: coverFile.type || 'application/octet-stream',
        })

        if (coverError) throw new Error(`Cover upload failed: ${coverError.message}`)

        const { data: coverPublic } = supabase.storage.from(COVER_BUCKET).getPublicUrl(coverPath)
        coverUrl = coverPublic.publicUrl
      }

      const artistName = (displayNameDraft.trim() || sessionEmail.trim() || email.trim()).split('@')[0]?.trim() || 'Unknown Artist'

      const { error: insertError } = await supabase.from('tracks').insert({
        user_id: sessionUserId,
        title: title.trim(),
        artist: artistName,
        genre,
        audio_url: audioPublic.publicUrl,
        cover_url: coverUrl,
        play_count: 0,
        like_count: 0,
      })

      if (insertError) throw new Error(`Database insert failed: ${insertError.message}`)

      await refreshTracks(sessionUserId)

      setTitle('')
      setAudioFile(null)
      setCoverFile(null)
      setUploadMessage('Upload successful.')
      setActiveTab('library')
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleToggleLike = async () => {
    if (!sessionUserId || !currentTrack) return

    const alreadyLiked = likedTrackIds.has(currentTrack.id)
    setLikedTrackIds((prev) => {
      const next = new Set(prev)
      if (alreadyLiked) {
        next.delete(currentTrack.id)
      } else {
        next.add(currentTrack.id)
      }
      return next
    })

    const query = alreadyLiked
      ? supabase.from('likes').delete().eq('user_id', sessionUserId).eq('track_id', currentTrack.id)
      : supabase.from('likes').insert({ user_id: sessionUserId, track_id: currentTrack.id })

    const { error } = await query
    if (isMissingTableError(error, 'likes')) {
      setDataMessage(getTableSqlMessage('likes'))
      return
    }
    if (error) {
      setDataMessage(error.message)
    }
  }

  const handleSubmitComment = async () => {
    if (!sessionUserId || !currentTrack || !commentDraft.trim()) return
    setCommentSubmitting(true)

    const { error } = await supabase.from('comments').insert({
      user_id: sessionUserId,
      track_id: currentTrack.id,
      body: commentDraft.trim(),
    })

    if (isMissingTableError(error, 'comments')) {
      setDataMessage(getTableSqlMessage('comments'))
    } else if (error) {
      setDataMessage(error.message)
    } else {
      setCommentDraft('')
      const profileName = displayNameDraft.trim() || sessionEmail.split('@')[0] || 'You'
      setComments((prev) => [{ id: `local-${Date.now()}`, author: profileName, body: commentDraft.trim() }, ...prev])
    }

    setCommentSubmitting(false)
  }

  const handleSaveDisplayName = async () => {
    if (!sessionUserId) return

    const { error } = await supabase.from('profiles').upsert(
      {
        id: sessionUserId,
        display_name: displayNameDraft.trim() || null,
      },
      { onConflict: 'id' },
    )

    if (error) {
      setProfileMessage(error.message)
      return
    }

    setProfile((prev) => ({ ...prev, display_name: displayNameDraft.trim() || null }))
    setProfileMessage('Display name updated.')
  }

  const handleProfileImageUpload = async (file: File | null) => {
    if (!sessionUserId || !file) return

    setProfileImageUploading(true)
    const path = `${sessionUserId}/${Date.now()}_${safeFileName(file.name)}`

    const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    })

    if (uploadError) {
      setProfileMessage(uploadError.message)
      setProfileImageUploading(false)
      return
    }

    const { data: avatarPublic } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)

    const { error: updateError } = await supabase.from('profiles').upsert(
      {
        id: sessionUserId,
        avatar_url: avatarPublic.publicUrl,
        display_name: displayNameDraft.trim() || null,
      },
      { onConflict: 'id' },
    )

    if (updateError) {
      setProfileMessage(updateError.message)
    } else {
      setProfile((prev) => ({ ...prev, avatar_url: avatarPublic.publicUrl }))
      setProfileMessage('Profile image updated.')
    }

    setProfileImageUploading(false)
  }

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!sessionUserId || !currentTrack) return

    const { error } = await supabase.from('playlist_tracks').insert({
      playlist_id: playlistId,
      track_id: currentTrack.id,
      user_id: sessionUserId,
    })

    if (error) {
      setDataMessage(error.message)
    } else {
      setDataMessage('Added to playlist.')
    }
  }

  const handleShare = async () => {
    if (!currentTrack) return
    const shareText = `${currentTrack.title} — ${currentTrack.artist}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'UNDERWAVE Track',
          text: shareText,
        })
      } catch {
        // no-op
      }
      return
    }

    await navigator.clipboard.writeText(shareText)
    setDataMessage('Track details copied to clipboard.')
  }

  const discoveryTracks = useMemo(() => {
    return allTracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist || 'Unknown Artist',
      coverUrl: track.cover_url,
      genre: track.genre,
    }))
  }, [allTracks])

  const jumpBackIn = useMemo<FeedTrack[]>(() => {
    const map = new Map(discoveryTracks.map((track) => [track.id, track]))
    return recentTrackIds.map((id) => map.get(id)).filter((item): item is (typeof discoveryTracks)[number] => Boolean(item)).slice(0, 8)
  }, [recentTrackIds, discoveryTracks])

  const moreOfWhatYouLike = useMemo<FeedTrack[]>(() => {
    const seed = discoveryTracks.filter((track) => likedTrackIds.has(track.id) || recentTrackIds.includes(track.id))

    const genreScores = new Map<string, number>()
    const artistScores = new Map<string, number>()
    seed.forEach((track) => {
      if (track.genre) genreScores.set(track.genre, (genreScores.get(track.genre) || 0) + 1)
      artistScores.set(track.artist, (artistScores.get(track.artist) || 0) + 1)
    })

    return discoveryTracks
      .filter((track) => !recentTrackIds.includes(track.id))
      .map((track) => ({
        ...track,
        score: (track.genre ? genreScores.get(track.genre) || 0 : 0) + (artistScores.get(track.artist) || 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ score: _score, ...track }) => track)
  }, [discoveryTracks, likedTrackIds, recentTrackIds])

  const likedSongs = useMemo(() => discoveryTracks.filter((track) => likedTrackIds.has(track.id)), [discoveryTracks, likedTrackIds])
  const recentSongs = useMemo(() => {
    const map = new Map(discoveryTracks.map((track) => [track.id, track]))
    return recentTrackIds.map((id) => map.get(id)).filter((item): item is (typeof discoveryTracks)[number] => Boolean(item))
  }, [recentTrackIds, discoveryTracks])

  if (loadingSession) {
    return <div className="loading">Loading UNDERWAVE...</div>
  }

  if (!isAuthed) {
    return (
      <main className="appShell authShell">
        <div className="ashBackdrop" />
        <section className="authCard glassPanel">
          <UnderwaveLogo />
          <h1>UNDERWAVE</h1>
          <p>Sign in to your premium studio.</p>

          <input
            className="premiumInput"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
          <input
            className="premiumInput"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
          />

          <label className="rememberRow" htmlFor="rememberMe">
            <span className={`premiumCheckbox ${rememberMe ? 'checked' : ''}`}>
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span />
            </span>
            Remember me
          </label>

          <PremiumButton onClick={handleAuth} disabled={authLoading} className="primaryButton">
            {authLoading ? 'Please wait...' : authMode === 'signin' ? 'Sign in' : 'Create account'}
          </PremiumButton>

          <motion.button
            type="button"
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleAuth}
            disabled={authLoading}
            className="secondaryButton googleButton"
          >
            <GoogleMark />
            Continue with Google
          </motion.button>

          <PremiumButton
            className="ghostButton"
            onClick={() => {
              setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
              setAuthMessage(null)
            }}
          >
            {authMode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </PremiumButton>
          {authMessage && <p className="message">{authMessage}</p>}
        </section>
      </main>
    )
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Home
            jumpBackIn={jumpBackIn}
            moreOfWhatYouLike={moreOfWhatYouLike}
            onSelectTrack={(track) => {
              const selected = queue.find((item) => item.id === track.id)
              if (selected) {
                playTrack(selected, queue)
              }
            }}
          />
        )
      case 'search':
        return (
          <section className="glassPanel placeholderView">
            <Search strokeWidth={2.5} size={26} />
            <h2>Search</h2>
            <p>Search, trending tags, and waveform filters are ready for your next sprint.</p>
          </section>
        )
      case 'library':
        return (
          <section className="glassPanel libraryView">
            <h2>Your Library</h2>
            <div className="librarySection">
              <h3>Liked Songs</h3>
              <ul className="premiumVerticalList">
                {likedSongs.length === 0 ? (
                  <li className="muted">No liked tracks yet.</li>
                ) : (
                  likedSongs.map((track) => (
                    <li key={track.id}>
                      {track.coverUrl ? <img src={track.coverUrl} alt="cover" /> : <div className="coverFallback">♪</div>}
                      <div>
                        <strong>{track.title}</strong>
                        <span>{track.artist}</span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="librarySection">
              <h3>Recently Played</h3>
              <ul className="premiumVerticalList">
                {recentSongs.length === 0 ? (
                  <li className="muted">No recent plays yet.</li>
                ) : (
                  recentSongs.slice(0, 8).map((track) => (
                    <li key={track.id}>
                      {track.coverUrl ? <img src={track.coverUrl} alt="cover" /> : <div className="coverFallback">♪</div>}
                      <div>
                        <strong>{track.title}</strong>
                        <span>{track.artist}</span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="librarySection">
              <h3>Playlists</h3>
              <ul className="premiumVerticalList">
                {playlists.length === 0 ? (
                  <li className="muted">No playlists yet.</li>
                ) : (
                  playlists.map((playlist) => (
                    <li key={playlist.id}>
                      <div className="coverFallback">♫</div>
                      <div>
                        <strong>{playlist.name}</strong>
                        <span>Premium playlist</span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>
        )
      case 'upload':
        return (
          <section className="glassPanel uploadView">
            <h2>Upload Track</h2>
            <input
              className="premiumInput"
              type="text"
              placeholder="Track title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <select value={genre} onChange={(event) => setGenre(event.target.value)}>
              {GENRES.map((currentGenre) => (
                <option key={currentGenre} value={currentGenre}>
                  {currentGenre}
                </option>
              ))}
            </select>

            <label className="fileField">
              <span>Audio file (required)</span>
              <input
                type="file"
                accept="audio/*"
                onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
              />
              <small>{audioFile ? audioFile.name : 'Choose audio file'}</small>
            </label>

            <label className="fileField">
              <span>Cover art (optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
              />
              <small>{coverFile ? coverFile.name : 'Choose image file'}</small>
            </label>

            <PremiumButton onClick={handleUpload} disabled={uploading} className="primaryButton">
              {uploading ? 'Uploading...' : 'Upload'}
            </PremiumButton>
            {uploadMessage && <p className="message">{uploadMessage}</p>}
          </section>
        )
      case 'profile':
        return (
          <section className="glassPanel profileView">
            <h2>Profile</h2>
            <div className="profileHeader">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="profile avatar" /> : <div className="avatarFallback">U</div>}
              <div className="profileMeta">
                <strong>{displayNameDraft || 'UNDERWAVE Listener'}</strong>
                <small>{sessionEmail}</small>
                <div className="profileCounts">
                  <span>{followersCount} Followers</span>
                  <span>{followingCount} Following</span>
                </div>
              </div>
            </div>

            <div className="profileEditor">
              <input
                className="premiumInput"
                placeholder="Display Name"
                value={displayNameDraft}
                onChange={(event) => setDisplayNameDraft(event.target.value)}
              />
              <PremiumButton className="primaryButton" onClick={handleSaveDisplayName}>
                Save Name
              </PremiumButton>

              <label className="fileField">
                <span>Profile Picture</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleProfileImageUpload(event.target.files?.[0] ?? null)}
                />
                <small>{profileImageUploading ? 'Uploading...' : 'Upload to avatars bucket'}</small>
              </label>
            </div>

            <h3>Your Uploads</h3>
            <div className="profileTrackGrid">
              {userTracks.length === 0 ? (
                <p className="muted">No uploads yet.</p>
              ) : (
                userTracks.map((track) => (
                  <article key={track.id}>
                    {track.cover_url ? <img src={track.cover_url} alt={track.title} /> : <div className="coverFallback">♪</div>}
                    <strong>{track.title}</strong>
                    <small>{track.artist || 'Unknown Artist'}</small>
                  </article>
                ))
              )}
            </div>

            <PremiumButton className="secondaryButton" onClick={handleSignOut}>
              Sign out
            </PremiumButton>
            {profileMessage && <p className="message">{profileMessage}</p>}
          </section>
        )
      default:
        return null
    }
  }

  const selectedTrackLiked = currentTrack ? likedTrackIds.has(currentTrack.id) : false

  return (
    <>
      <AppLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isLiked={selectedTrackLiked}
        isShuffle={isShuffle}
        isRepeat={isRepeat}
        progress={playerProgress}
        onSeek={setPlayerProgress}
        onTogglePlay={togglePlay}
        onPrev={prevTrack}
        onNext={nextTrack}
        onToggleLike={handleToggleLike}
        onToggleShuffle={toggleShuffle}
        onToggleRepeat={toggleRepeat}
        comments={comments}
        commentDraft={commentDraft}
        onCommentDraftChange={setCommentDraft}
        onSubmitComment={handleSubmitComment}
        submittingComment={commentSubmitting}
        playlists={playlists}
        onAddCurrentTrackToPlaylist={handleAddToPlaylist}
        onViewArtistProfile={() => setActiveTab('profile')}
        onShareTrack={handleShare}
      >
        {renderTab()}
      </AppLayout>
      {dataMessage && <pre className="sqlMessage">{dataMessage}</pre>}
    </>
  )
}

export default App
