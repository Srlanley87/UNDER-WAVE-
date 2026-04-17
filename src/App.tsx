import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, Play, Plus, Search, Sparkles } from 'lucide-react'
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
  bio: string | null
}

type PlaylistRow = {
  id: string
  name: string
}

type PlaylistTrackJoinRow = {
  playlist_id: string
  created_at: string
  track_id: string
  tracks: TrackRow | TrackRow[] | null
}

type PlaylistSummary = PlaylistRow & {
  tracks: TrackRow[]
  coverUrl: string | null
  collageUrls: string[]
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
type DiscoveryTrack = FeedTrack & { genre: string | null }
type LibraryView = 'overview' | 'liked' | 'create-playlist' | 'playlist-detail'
type LibraryFilter = 'playlists' | 'albums' | 'artists' | 'downloaded'
type ArtistProfileData = {
  id: string
  name: string
  avatarUrl: string | null
  headerImageUrl: string | null
  bio: string | null
}
const EMPTY_PROFILE: ProfileRow = { display_name: null, avatar_url: null, bio: null }

const GENRES = ['Hip-Hop', 'Electronic', 'Lo-Fi', 'Indie', 'R&B', 'Afrobeats']
const AUDIO_BUCKET = 'audio'
const COVER_BUCKET =
  (import.meta.env as Record<string, string | undefined>).VITE_SUPABASE_COVER_BUCKET ||
  (import.meta.env as Record<string, string | undefined>).EXPO_PUBLIC_SUPABASE_COVER_BUCKET ||
  'cover'
const AVATAR_BUCKET = 'avatars'

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function createTempId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`
}

function getUserDisplayName(displayName: string | null | undefined, email: string | null | undefined, fallback = 'Listener') {
  const trimmedDisplay = (displayName || '').trim()
  if (trimmedDisplay) return trimmedDisplay
  const emailName = (email || '').trim().split('@')[0]?.trim()
  return emailName || fallback
}

function toPlayerTrack(track: TrackRow): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist || 'Unknown Artist',
    coverUrl: track.cover_url,
    audioUrl: track.audio_url,
    genre: track.genre,
    userId: track.user_id,
  }
}

function sanitizeImageUrl(url: string | null | undefined) {
  if (!url) return null
  const value = url.trim()
  if (!value) return null
  if (value.startsWith('blob:')) return value
  if (value.startsWith('data:image/')) return value
  try {
    const parsed = new URL(value)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.toString()
  } catch {
    return null
  }
  return null
}

function toBackgroundImage(url: string) {
  return `url("${url.replace(/"/g, '%22')}")`
}

function getPlaylistCollageGridClassName(count: number) {
  return `playlistCollage playlistCollage${Math.min(Math.max(count, 1), 3)}`
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
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [allTracks, setAllTracks] = useState<TrackRow[]>([])
  const [userTracks, setUserTracks] = useState<TrackRow[]>([])
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set())
  const [recentTrackIds, setRecentTrackIds] = useState<string[]>([])
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([])

  const [profile, setProfile] = useState<ProfileRow>(EMPTY_PROFILE)
  const [displayNameDraft, setDisplayNameDraft] = useState('')
  const [bioDraft, setBioDraft] = useState('')
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileImageUploading, setProfileImageUploading] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [libraryView, setLibraryView] = useState<LibraryView>('overview')
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('playlists')
  const [playlistNameDraft, setPlaylistNameDraft] = useState('')
  const [playlistSelectionIds, setPlaylistSelectionIds] = useState<Set<string>>(new Set())
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null)
  const [artistRouteId, setArtistRouteId] = useState<string | null>(null)
  const [artistProfile, setArtistProfile] = useState<ArtistProfileData | null>(null)
  const [artistTracks, setArtistTracks] = useState<TrackRow[]>([])
  const [artistFollowerCount, setArtistFollowerCount] = useState(0)
  const [artistMonthlyListeners, setArtistMonthlyListeners] = useState(0)
  const [isFollowingArtist, setIsFollowingArtist] = useState(false)
  const [artistFollowLoading, setArtistFollowLoading] = useState(false)

  const [playerProgress, setPlayerProgress] = useState(22)
  const [comments, setComments] = useState<Array<{ id: string; author: string; body: string }>>([])
  const [commentDraft, setCommentDraft] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [dataMessage, setDataMessage] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioInputRef = useRef<HTMLInputElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const nextTrackRef = useRef<(() => void) | null>(null)
  const lastPlayEventTrackIdRef = useRef<string | null>(null)
  const profileNameSeed = useMemo(() => sessionEmail.trim() || email.trim(), [sessionEmail, email])

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

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(coverFile)
    setCoverPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [coverFile])

  useEffect(() => {
    if (!avatarPreviewUrl) return
    return () => {
      if (avatarPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl)
      }
    }
  }, [avatarPreviewUrl])

  const refreshTracks = useCallback(async (userId: string) => {
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
    }
  }, [setQueue])

  const refreshLikes = async (userId: string) => {
    const { data, error } = await supabase.from('likes').select('track_id').eq('user_id', userId)
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

    if (error) return

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

    if (error) {
      setDataMessage(error.message)
      return
    }

    const playlistRows = (data as PlaylistRow[]) || []
    if (playlistRows.length === 0) {
      setPlaylists([])
      return
    }

    const playlistIds = playlistRows.map((playlist) => playlist.id)
    const { data: playlistTracksData, error: playlistTracksError } = await supabase
      .from('playlist_tracks')
      .select('playlist_id,track_id,created_at,tracks(id,title,artist,genre,play_count,like_count,cover_url,audio_url,user_id,created_at)')
      .in('playlist_id', playlistIds)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (playlistTracksError) {
      setDataMessage(playlistTracksError.message)
      setPlaylists(
        playlistRows.map((playlist) => ({
          ...playlist,
          tracks: [],
          coverUrl: null,
          collageUrls: [],
        })),
      )
      return
    }

    const tracksByPlaylist = new Map<string, TrackRow[]>()
    const playlistTrackRows = (playlistTracksData as PlaylistTrackJoinRow[]) || []
    playlistTrackRows.forEach((row) => {
      const joinedTrack = Array.isArray(row.tracks) ? row.tracks[0] : row.tracks
      if (!joinedTrack) return
      const existing = tracksByPlaylist.get(row.playlist_id) || []
      existing.push(joinedTrack)
      tracksByPlaylist.set(row.playlist_id, existing)
    })

    setPlaylists(
      playlistRows.map((playlist) => {
        const tracks = tracksByPlaylist.get(playlist.id) || []
        const reversed = [...tracks].reverse()
        const lastAddedWithCover = reversed.find((track) => Boolean(track.cover_url))
        const collageUrls = tracks
          .slice(0, 3)
          .map((track) => sanitizeImageUrl(track.cover_url))
          .filter((url): url is string => Boolean(url))

        return {
          ...playlist,
          tracks,
          coverUrl: sanitizeImageUrl(lastAddedWithCover?.cover_url),
          collageUrls,
        }
      }),
    )
  }

  const ensureProfileRecord = useCallback(async (userId: string) => {
    const fallbackName = getUserDisplayName(null, profileNameSeed, 'Listener')
    const { error: createProfileError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        display_name: fallbackName,
      },
      { onConflict: 'id' },
    )
    if (!createProfileError) {
      setProfile({ ...EMPTY_PROFILE, display_name: fallbackName, avatar_url: null })
      setDisplayNameDraft(fallbackName)
    }
  }, [profileNameSeed])

  const refreshProfile = useCallback(async (userId: string) => {
    const [{ data: profileData, error: profileError }, followers, following] = await Promise.all([
      supabase.from('profiles').select('display_name,avatar_url').eq('id', userId).maybeSingle(),
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
    ])

    if (!profileError && profileData) {
      const row = profileData as Pick<ProfileRow, 'display_name' | 'avatar_url'>
      setProfile({ ...EMPTY_PROFILE, display_name: row.display_name || null, avatar_url: row.avatar_url || null })
      setDisplayNameDraft(row.display_name || '')
      setBioDraft('')
    } else if (!profileError && !profileData) {
      await ensureProfileRecord(userId)
    } else if (profileError) {
      setDataMessage(profileError.message)
    }

    if (followers.error || following.error) {
      setDataMessage(followers.error?.message || following.error?.message || 'Unable to load follow counts.')
    } else {
      setFollowersCount(followers.count || 0)
      setFollowingCount(following.count || 0)
    }
  }, [ensureProfileRecord])

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
  }, [sessionUserId, refreshTracks, refreshProfile])

  useEffect(() => {
    const parseArtistPath = () => {
      const match = window.location.pathname.match(/^\/artist\/([^/]+)$/)
      setArtistRouteId(match ? decodeURIComponent(match[1]) : null)
    }
    parseArtistPath()
    window.addEventListener('popstate', parseArtistPath)
    return () => window.removeEventListener('popstate', parseArtistPath)
  }, [])

  const currentTrackId = currentTrack?.id ?? null

  useEffect(() => {
    nextTrackRef.current = nextTrack
  }, [nextTrack])

  useEffect(() => {
    if (!sessionUserId || !currentTrackId) {
      setComments([])
      return
    }

    const loadComments = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('id,user_id,body')
        .eq('track_id', currentTrackId)
        .order('created_at', { ascending: false })
        .limit(50)

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
      const profileRows = (profilesData as Array<{ id: string; display_name: string | null }>) || []
      profileRows.forEach((item) => {
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
  }, [sessionUserId, currentTrackId])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const handleTimeUpdate = () => {
      if (!audio.duration || Number.isNaN(audio.duration)) {
        setPlayerProgress(0)
        return
      }
      setPlayerProgress(Math.min(100, Math.max(0, (audio.currentTime / audio.duration) * 100)))
    }

    const handleEnded = () => {
      nextTrackRef.current?.()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!currentTrack?.audioUrl) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      setPlayerProgress(0)
      return
    }

    if (audio.src !== currentTrack.audioUrl) {
      audio.src = currentTrack.audioUrl
      audio.load()
      setPlayerProgress(0)
    }
  }, [currentTrack?.id, currentTrack?.audioUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack?.audioUrl) return

    if (!isPlaying) {
      audio.pause()
      return
    }

    void audio.play().catch((error) => {
      setDataMessage(error instanceof Error ? error.message : 'Unable to start audio playback.')
    })
  }, [isPlaying, currentTrack?.id, currentTrack?.audioUrl])

  useEffect(() => {
    if (!sessionUserId || !currentTrack?.id || !isPlaying || lastPlayEventTrackIdRef.current === currentTrack.id) return

    lastPlayEventTrackIdRef.current = currentTrack.id
    void supabase
      .from('play_events')
      .insert({ user_id: sessionUserId, track_id: currentTrack.id })
      .then(({ error }) => {
        if (error) return
        void refreshRecent(sessionUserId)
      })
  }, [sessionUserId, currentTrack?.id, isPlaying])

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

      const artistName = getUserDisplayName(profile.display_name, sessionEmail.trim() || email.trim(), 'Unknown Artist')

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
      setCoverPreviewUrl(null)
      if (audioInputRef.current) {
        audioInputRef.current.value = ''
      }
      if (coverInputRef.current) {
        coverInputRef.current.value = ''
      }
      setUploadMessage('Upload successful.')
      setActiveTab('library')
      setLibraryView('overview')
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleAudioPicked = (file: File | null) => {
    setAudioFile(file)
  }

  const handleCoverPicked = (file: File | null) => {
    setCoverFile(file)
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

    if (error) {
      setDataMessage(error.message)
    } else {
      setCommentDraft('')
      const profileName = getUserDisplayName(profile.display_name ?? '', sessionEmail, 'You')
      setComments((prev) => [{ id: createTempId('temp-comment'), author: profileName, body: commentDraft.trim() }, ...prev])
    }

    setCommentSubmitting(false)
  }

  const handleSaveProfile = async () => {
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

    setProfile((prev) => ({
      ...prev,
      display_name: displayNameDraft.trim() || null,
    }))
    setProfileMessage('Profile updated.')
  }

  const handleProfileImageUpload = async (file: File | null) => {
    if (!sessionUserId || !file) return

    setProfileImageUploading(true)
    setProfileMessage(null)
    const displayNameForUpload = getUserDisplayName(displayNameDraft, profileNameSeed, 'Listener')
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
        display_name: displayNameForUpload,
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

  const handleAvatarPicked = (file: File | null) => {
    if (!file) return
    setAvatarPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    void handleProfileImageUpload(file).catch(() => {
      setProfileMessage('Unable to upload profile image.')
    })
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

  const handleSeek = (value: number) => {
    setPlayerProgress(value)
    const audio = audioRef.current
    if (!audio || !audio.duration || Number.isNaN(audio.duration)) return
    audio.currentTime = (value / 100) * audio.duration
  }

  const togglePlaylistSelection = (trackId: string) => {
    setPlaylistSelectionIds((prev) => {
      const next = new Set(prev)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }

  const openPlaylist = (playlistId: string) => {
    setActivePlaylistId(playlistId)
    setLibraryView('playlist-detail')
  }

  const handleCreatePlaylistFromSelection = async () => {
    if (!sessionUserId) return
    if (!playlistNameDraft.trim()) {
      setDataMessage('Playlist name is required.')
      return
    }
    if (playlistSelectionIds.size === 0) {
      setDataMessage('Select at least one track.')
      return
    }

    const { data: playlistData, error: playlistError } = await supabase
      .from('playlists')
      .insert({
        user_id: sessionUserId,
        name: playlistNameDraft.trim(),
      })
      .select('id')
      .single()

    if (playlistError || !playlistData) {
      setDataMessage(playlistError?.message || 'Unable to create playlist.')
      return
    }

    const inserts = Array.from(playlistSelectionIds).map((trackId) => ({
      playlist_id: (playlistData as { id: string }).id,
      track_id: trackId,
      user_id: sessionUserId,
    }))

    const { error: playlistTracksError } = await supabase.from('playlist_tracks').insert(inserts)
    if (playlistTracksError) {
      setDataMessage(playlistTracksError.message)
      return
    }

    await refreshPlaylists(sessionUserId)
    setPlaylistNameDraft('')
    setPlaylistSelectionIds(new Set())
    setLibraryView('overview')
    setDataMessage('Playlist created.')
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

    try {
      await navigator.clipboard.writeText(shareText)
      setDataMessage('Track details copied to clipboard.')
    } catch {
      setDataMessage('Unable to copy track details.')
    }
  }

  const openArtistRoute = useCallback((artistId?: string) => {
    if (!artistId) return
    const nextPath = `/artist/${encodeURIComponent(artistId)}`
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }
    setArtistRouteId(artistId)
  }, [])

  const closeArtistRoute = useCallback(() => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/')
    }
    setArtistRouteId(null)
  }, [])

  useEffect(() => {
    const loadArtistProfile = async () => {
      if (!artistRouteId) {
        setArtistProfile(null)
        setArtistTracks([])
        setArtistFollowerCount(0)
        setArtistMonthlyListeners(0)
        setIsFollowingArtist(false)
        return
      }

      const [{ data: artistProfileRow }, { data: artistTrackRows, error: artistTracksError }, followers] = await Promise.all([
        supabase.from('profiles').select('id,display_name,avatar_url').eq('id', artistRouteId).maybeSingle(),
        supabase
          .from('tracks')
          .select('id,title,artist,genre,play_count,like_count,cover_url,audio_url,user_id,created_at')
          .eq('user_id', artistRouteId)
          .order('created_at', { ascending: false }),
        supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', artistRouteId),
      ])

      if (artistTracksError) {
        setDataMessage(artistTracksError.message)
        return
      }

      const tracksByArtist = (artistTrackRows as TrackRow[]) || []
      setArtistTracks(tracksByArtist)
      const derivedName =
        (artistProfileRow as { display_name?: string | null } | null)?.display_name?.trim() ||
        tracksByArtist[0]?.artist ||
        'Unknown Artist'
      const heroImage = sanitizeImageUrl(tracksByArtist[0]?.cover_url) || sanitizeImageUrl((artistProfileRow as { avatar_url?: string | null } | null)?.avatar_url)
      setArtistProfile({
        id: artistRouteId,
        name: derivedName,
        avatarUrl: sanitizeImageUrl((artistProfileRow as { avatar_url?: string | null } | null)?.avatar_url),
        headerImageUrl: heroImage,
        bio: (artistProfileRow as { bio?: string | null } | null)?.bio || null,
      })
      setArtistFollowerCount(followers.count || 0)

      if (sessionUserId) {
        const { count } = await supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', sessionUserId)
          .eq('following_id', artistRouteId)
        setIsFollowingArtist(Boolean(count))
      }

      if (tracksByArtist.length > 0) {
        const trackIds = tracksByArtist.map((track) => track.id)
        const cutoffIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const { data: monthlyEvents } = await supabase
          .from('play_events')
          .select('user_id')
          .in('track_id', trackIds)
          .gte('created_at', cutoffIso)
          .limit(5000)
        const listeners = new Set(((monthlyEvents as Array<{ user_id: string }>) || []).map((event) => event.user_id))
        setArtistMonthlyListeners(listeners.size)
      } else {
        setArtistMonthlyListeners(0)
      }
    }

    void loadArtistProfile()
  }, [artistRouteId, sessionUserId])

  const handleToggleFollowArtist = async () => {
    if (!sessionUserId || !artistRouteId || sessionUserId === artistRouteId || artistFollowLoading) return
    setArtistFollowLoading(true)
    const query = isFollowingArtist
      ? supabase.from('follows').delete().eq('follower_id', sessionUserId).eq('following_id', artistRouteId)
      : supabase.from('follows').insert({ follower_id: sessionUserId, following_id: artistRouteId })
    const { error } = await query
    if (error) {
      setDataMessage(error.message)
      setArtistFollowLoading(false)
      return
    }
    setIsFollowingArtist((prev) => !prev)
    setArtistFollowerCount((prev) => prev + (isFollowingArtist ? -1 : 1))
    setArtistFollowLoading(false)
  }

  const discoveryTracks = useMemo<DiscoveryTrack[]>(() => {
    return allTracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist || 'Unknown Artist',
      coverUrl: track.cover_url,
      genre: track.genre,
    }))
  }, [allTracks])

  const jumpBackIn = useMemo<FeedTrack[]>(() => {
    const trackMap = new Map(discoveryTracks.map((track) => [track.id, track]))
    const recentTracks = recentTrackIds
      .map((id) => trackMap.get(id))
      .filter((item): item is DiscoveryTrack => Boolean(item))
    return recentTracks.slice(0, 8)
  }, [recentTrackIds, discoveryTracks])

  const moreOfWhatYouLike = useMemo<FeedTrack[]>(() => {
    const recentTrackIdSet = new Set(recentTrackIds)
    const seed = discoveryTracks.filter((track) => likedTrackIds.has(track.id) || recentTrackIdSet.has(track.id))

    const genreScores = new Map<string, number>()
    const artistScores = new Map<string, number>()
    seed.forEach((track) => {
      if (track.genre) genreScores.set(track.genre, (genreScores.get(track.genre) || 0) + 1)
      artistScores.set(track.artist, (artistScores.get(track.artist) || 0) + 1)
    })

    return discoveryTracks
      .filter((track) => !recentTrackIdSet.has(track.id))
      .map((track) => ({
        ...track,
        score: (track.genre ? genreScores.get(track.genre) || 0 : 0) + (artistScores.get(track.artist) || 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        coverUrl: track.coverUrl,
      }))
  }, [discoveryTracks, likedTrackIds, recentTrackIds])

  const likedSongs = useMemo(() => discoveryTracks.filter((track) => likedTrackIds.has(track.id)), [discoveryTracks, likedTrackIds])
  const likedSongQueue = useMemo(
    () => allTracks.filter((track) => likedTrackIds.has(track.id)).map(toPlayerTrack),
    [allTracks, likedTrackIds],
  )
  const safeCoverPreviewUrl = sanitizeImageUrl(coverPreviewUrl)
  const safeAvatarUrl = sanitizeImageUrl(avatarPreviewUrl || profile.avatar_url)
  const activePlaylist = useMemo(() => playlists.find((playlist) => playlist.id === activePlaylistId) || null, [playlists, activePlaylistId])

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
    if (artistRouteId && artistProfile) {
      return (
        <section className="glassPanel artistProfileView">
          <div className="artistHero">
            <div
              className="artistHeroImage"
              aria-hidden="true"
              style={
                artistProfile.headerImageUrl
                  ? { backgroundImage: toBackgroundImage(artistProfile.headerImageUrl) }
                  : undefined
              }
            />
            <div className="artistHeroShade" />
            <PremiumButton className="artistBackButton" onClick={closeArtistRoute}>
              <ArrowLeft size={18} />
            </PremiumButton>
            <div className="artistHeroMeta">
              <h2>{artistProfile.name}</h2>
              <p>{artistMonthlyListeners.toLocaleString()} Monthly Listeners</p>
              <p>{artistFollowerCount.toLocaleString()} Followers</p>
            </div>
          </div>

          {artistProfile.bio && <p className="artistBio">{artistProfile.bio}</p>}

          <div className="artistActionRow">
            <PremiumButton
              className="artistFollowButton"
              onClick={handleToggleFollowArtist}
              disabled={sessionUserId === artistRouteId || artistFollowLoading}
            >
              {sessionUserId === artistRouteId ? 'This is you' : isFollowingArtist ? 'Following' : 'Follow'}
            </PremiumButton>
          </div>

          <div className="artistTrackList">
            <h3>Popular Uploads</h3>
            {artistTracks.length === 0 ? (
              <p className="muted">No tracks uploaded yet.</p>
            ) : (
              artistTracks.map((track) => (
                <button
                  key={track.id}
                  className="artistTrackRow"
                  type="button"
                  onClick={() => {
                    const selected = queue.find((item) => item.id === track.id) || toPlayerTrack(track)
                    playTrack(selected, queue.length > 0 ? queue : artistTracks.map(toPlayerTrack))
                  }}
                >
                  {track.cover_url ? <img src={track.cover_url} alt={track.title} /> : <div className="coverFallback">♪</div>}
                  <div>
                    <strong>{track.title}</strong>
                    <span>{track.artist || artistProfile.name}</span>
                  </div>
                  <Play size={16} />
                </button>
              ))
            )}
          </div>
        </section>
      )
    }

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
            {libraryView === 'overview' && (
              <>
                <div className="modernLibraryHeader">
                  <h2>Your Library</h2>
                  <p className="muted">Curated collections with premium glass depth.</p>
                </div>
                <div className="libraryFilterPills">
                  {[
                    { id: 'playlists', label: 'Playlists' },
                    { id: 'albums', label: 'Albums' },
                    { id: 'artists', label: 'Artists' },
                    { id: 'downloaded', label: 'Downloaded' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      className={`libraryFilterPill ${libraryFilter === filter.id ? 'active' : ''}`}
                      onClick={() => setLibraryFilter(filter.id as LibraryFilter)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <button className="likedSongsHero" type="button" onClick={() => setLibraryView('liked')}>
                  <div className="likedSongsHeartWrap">
                    <Heart size={26} fill="currentColor" />
                  </div>
                  <div>
                    <strong>Liked Songs</strong>
                    <span>{likedSongs.length} saved tracks</span>
                  </div>
                  <Play size={20} />
                </button>

                <div className="librarySpotlightGrid">
                  <button className="librarySpotlightCard" type="button" onClick={() => setLibraryView('create-playlist')}>
                    <Plus size={18} />
                    <div>
                      <strong>Create Playlist</strong>
                      <span>Build from your grid in one tap.</span>
                    </div>
                  </button>
                  <div className="librarySpotlightCard">
                    <Sparkles size={18} />
                    <div>
                      <strong>Smart Mix</strong>
                      <span>Updated from likes and play history.</span>
                    </div>
                  </div>
                </div>

                <div className="libraryCollectionGrid">
                  {libraryFilter === 'playlists' &&
                    (playlists.length === 0 ? (
                      <p className="muted">No playlists yet.</p>
                    ) : (
                      playlists.map((playlist) => (
                        <button
                          key={playlist.id}
                          type="button"
                          className="libraryCollectionCard playlistCollectionCard"
                          onClick={() => openPlaylist(playlist.id)}
                          aria-label={`Open playlist ${playlist.name}`}
                        >
                          {playlist.coverUrl ? (
                            <img src={playlist.coverUrl} alt={`${playlist.name} cover`} />
                          ) : playlist.collageUrls.length > 0 ? (
                            <div className={getPlaylistCollageGridClassName(playlist.collageUrls.length)}>
                              {playlist.collageUrls.map((url, index) => (
                                <img key={`${playlist.id}-collage-${index}`} src={url} alt="" aria-hidden="true" />
                              ))}
                            </div>
                          ) : (
                            <div className="coverFallback">♫</div>
                          )}
                          <div>
                            <strong>{playlist.name}</strong>
                            <span>{playlist.tracks.length} Track{playlist.tracks.length === 1 ? '' : 's'}</span>
                          </div>
                        </button>
                      ))
                    ))}

                  {libraryFilter === 'albums' &&
                    (allTracks.length === 0 ? (
                      <p className="muted">No albums yet.</p>
                    ) : (
                      allTracks.slice(0, 8).map((track) => (
                        <article key={track.id} className="libraryCollectionCard">
                          {track.cover_url ? <img src={track.cover_url} alt={track.title} /> : <div className="coverFallback">♪</div>}
                          <div>
                            <strong>{track.title}</strong>
                            <span>{track.artist || 'Unknown Artist'}</span>
                          </div>
                        </article>
                      ))
                    ))}

                  {libraryFilter === 'artists' &&
                    (Array.from(new Set(allTracks.map((track) => track.user_id))).length === 0 ? (
                      <p className="muted">No artists yet.</p>
                    ) : (
                      Array.from(new Map(allTracks.map((track) => [track.user_id, track])).values())
                        .slice(0, 8)
                        .map((track) => (
                          <button key={track.user_id} className="libraryCollectionCard" type="button" onClick={() => openArtistRoute(track.user_id)}>
                            {track.cover_url ? <img src={track.cover_url} alt={track.artist || 'Artist'} /> : <div className="coverFallback">♪</div>}
                            <div>
                              <strong>{track.artist || 'Unknown Artist'}</strong>
                              <span>Artist</span>
                            </div>
                          </button>
                        ))
                    ))}

                  {libraryFilter === 'downloaded' &&
                    (likedSongs.length === 0 ? (
                      <p className="muted">No downloaded tracks yet.</p>
                    ) : (
                      likedSongs.slice(0, 8).map((track) => (
                        <article key={track.id} className="libraryCollectionCard">
                          {track.coverUrl ? <img src={track.coverUrl} alt={track.title} /> : <div className="coverFallback">♪</div>}
                          <div>
                            <strong>{track.title}</strong>
                            <span>Available Offline</span>
                          </div>
                        </article>
                      ))
                    ))}
                </div>
              </>
            )}

            {libraryView === 'liked' && (
              <div className="libraryPage">
                <div className="libraryPageTop">
                  <PremiumButton className="iconButton" onClick={() => setLibraryView('overview')}>
                    <ArrowLeft size={18} />
                  </PremiumButton>
                  <h3>Liked Songs</h3>
                </div>
                <div className="libraryActionsBar">
                  <PremiumButton
                    className="primaryButton"
                    onClick={() => {
                      if (likedSongQueue.length > 0) {
                        playTrack(likedSongQueue[0], likedSongQueue)
                      }
                    }}
                    disabled={likedSongQueue.length === 0}
                  >
                    Play All
                  </PremiumButton>
                  <PremiumButton className="secondaryButton" onClick={() => setLibraryView('create-playlist')}>
                    Create Playlist
                  </PremiumButton>
                </div>
                <div className="libraryTrackGrid">
                  {likedSongs.length === 0 ? (
                    <p className="muted">No liked tracks yet.</p>
                  ) : (
                    likedSongs.map((track) => (
                      <button
                        key={track.id}
                        className="libraryTrackTile"
                        type="button"
                        onClick={() => {
                          const selected = likedSongQueue.find((item) => item.id === track.id)
                          if (selected) playTrack(selected, likedSongQueue)
                        }}
                      >
                        {track.coverUrl ? <img src={track.coverUrl} alt={track.title} /> : <div className="coverFallback">♪</div>}
                        <strong>{track.title}</strong>
                        <span>{track.artist}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {libraryView === 'create-playlist' && (
              <div className="libraryPage">
                <div className="libraryPageTop">
                  <PremiumButton className="iconButton" onClick={() => setLibraryView('overview')}>
                    <ArrowLeft size={18} />
                  </PremiumButton>
                  <h3>Create Playlist</h3>
                </div>
                <input
                  className="premiumInput"
                  value={playlistNameDraft}
                  onChange={(event) => setPlaylistNameDraft(event.target.value)}
                  placeholder="Playlist name"
                />
                <div className="libraryTrackGrid selectable">
                  {allTracks.length === 0 ? (
                    <p className="muted">No tracks available yet.</p>
                  ) : (
                    allTracks.map((track) => {
                      const selected = playlistSelectionIds.has(track.id)
                      return (
                        <button
                          key={track.id}
                          className={`libraryTrackTile ${selected ? 'selected' : ''}`}
                          type="button"
                          onClick={() => togglePlaylistSelection(track.id)}
                        >
                          {track.cover_url ? <img src={track.cover_url} alt={track.title} /> : <div className="coverFallback">♪</div>}
                          <strong>{track.title}</strong>
                          <span>{track.artist || 'Unknown Artist'}</span>
                        </button>
                      )
                    })
                  )}
                </div>
                <PremiumButton className="primaryButton" onClick={handleCreatePlaylistFromSelection}>
                  Create Playlist with {playlistSelectionIds.size} Track{playlistSelectionIds.size === 1 ? '' : 's'}
                </PremiumButton>
              </div>
            )}

            {libraryView === 'playlist-detail' && (
              <div className="libraryPage">
                <div className="libraryPageTop">
                  <PremiumButton className="iconButton" onClick={() => setLibraryView('overview')}>
                    <ArrowLeft size={18} />
                  </PremiumButton>
                  <h3>{activePlaylist?.name || 'Playlist'}</h3>
                </div>
                <div className="libraryTrackGrid">
                  {!activePlaylist || activePlaylist.tracks.length === 0 ? (
                    <p className="muted">No tracks in this playlist yet.</p>
                  ) : (
                    activePlaylist.tracks.map((track) => (
                      <button
                        key={track.id}
                        className="libraryTrackTile"
                        type="button"
                        onClick={() => {
                          const playlistQueue = activePlaylist.tracks.map(toPlayerTrack)
                          const selected = playlistQueue.find((item) => item.id === track.id)
                          if (selected) playTrack(selected, playlistQueue)
                        }}
                      >
                        {track.cover_url ? <img src={track.cover_url} alt={track.title} /> : <div className="coverFallback">♪</div>}
                        <strong>{track.title}</strong>
                        <span>{track.artist || 'Unknown Artist'}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
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

            <div className="mediaPicker">
              <div>
                <strong>Audio file</strong>
                <p className="muted">{audioFile ? audioFile.name : 'Pick a track to upload.'}</p>
              </div>
              <PremiumButton className="secondaryButton" onClick={() => audioInputRef.current?.click()}>
                {audioFile ? 'Change audio' : 'Select audio'}
              </PremiumButton>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hiddenInput"
                onChange={(event) => handleAudioPicked(event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="mediaPicker">
              <div>
                <strong>Cover art</strong>
                <p className="muted">{coverFile ? coverFile.name : 'Optional, but recommended.'}</p>
              </div>
              <PremiumButton className="secondaryButton" onClick={() => coverInputRef.current?.click()}>
                {coverFile ? 'Change cover' : 'Select cover'}
              </PremiumButton>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hiddenInput"
                onChange={(event) => handleCoverPicked(event.target.files?.[0] ?? null)}
              />
            </div>

            {safeCoverPreviewUrl && (
              <div className="uploadPreview">
                <div className="uploadPreviewSurface" aria-hidden="true" style={{ backgroundImage: toBackgroundImage(safeCoverPreviewUrl) }} />
                <small>Cover preview</small>
              </div>
            )}

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
              <button className="avatarButton" type="button" onClick={() => avatarInputRef.current?.click()} aria-label="Change profile picture">
                {safeAvatarUrl ? (
                  <div className="avatarImage" aria-hidden="true" style={{ backgroundImage: toBackgroundImage(safeAvatarUrl) }} />
                ) : (
                  <div className="avatarFallback">U</div>
                )}
                <span>Edit</span>
              </button>
              <div className="profileMeta">
                <strong>{getUserDisplayName(displayNameDraft, sessionEmail, 'UNDERWAVE Listener')}</strong>
                <small>{sessionEmail}</small>
                {profile.bio && <p className="profileBio">{profile.bio}</p>}
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
              <PremiumButton className="primaryButton" onClick={handleSaveProfile}>
                Save Profile
              </PremiumButton>
              <label className="fileField">
                <span>Custom Bio</span>
                <textarea
                  className="premiumInput"
                  placeholder="Tell listeners about you."
                  rows={3}
                  value={bioDraft}
                  onChange={(event) => setBioDraft(event.target.value)}
                />
              </label>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hiddenInput"
                onChange={(event) => handleAvatarPicked(event.target.files?.[0] ?? null)}
              />
              <small>{profileImageUploading ? 'Uploading new profile image...' : 'Tap avatar to change profile picture'}</small>
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
        onTabChange={(tab) => {
          closeArtistRoute()
          setActiveTab(tab)
          if (tab === 'library') setLibraryView('overview')
          setActivePlaylistId(null)
        }}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isLiked={selectedTrackLiked}
        isShuffle={isShuffle}
        isRepeat={isRepeat}
        progress={playerProgress}
        onSeek={handleSeek}
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
        playlists={playlists.map((playlist) => ({ id: playlist.id, name: playlist.name }))}
        onAddCurrentTrackToPlaylist={handleAddToPlaylist}
        onViewArtistProfile={openArtistRoute}
        onShareTrack={handleShare}
      >
        {renderTab()}
      </AppLayout>
      {dataMessage && <p className="message">{dataMessage}</p>}
    </>
  )
}

export default App
