import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import './index.css'
import { AppLayout, type AppTab, PremiumButton } from './_layout'
import { Home } from './Home'
import { supabase } from './lib/supabase'

type Track = {
  id: string
  title: string
  artist: string | null
  genre: string | null
  play_count: number | null
  like_count: number | null
  cover_url: string | null
  created_at: string
}

const GENRES = ['Hip-Hop', 'Electronic', 'Lo-Fi', 'Indie', 'R&B', 'Afrobeats']
const AUDIO_BUCKET = 'audio'
const COVER_BUCKET =
  (import.meta.env as Record<string, string | undefined>).VITE_SUPABASE_COVER_BUCKET ||
  (import.meta.env as Record<string, string | undefined>).EXPO_PUBLIC_SUPABASE_COVER_BUCKET ||
  'cover'

const SAMPLE_DISCOVERY_TRACKS = [
  { id: '__sample__midnight-echo', title: 'Midnight Echo', artist: 'Nova Lane', coverUrl: null },
  { id: '__sample__golden-drift', title: 'Golden Drift', artist: 'Kairo', coverUrl: null },
  { id: '__sample__neon-tides', title: 'Neon Tides', artist: 'Ari Sol', coverUrl: null },
  { id: '__sample__afterglow-loop', title: 'Afterglow Loop', artist: 'Sora', coverUrl: null },
  { id: '__sample__slow-frequency', title: 'Slow Frequency', artist: 'Dune', coverUrl: null },
  { id: '__sample__cloud-theory', title: 'Cloud Theory', artist: 'Lumen', coverUrl: null },
]

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function App() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)
  const [sessionEmail, setSessionEmail] = useState<string>('')
  const [loadingSession, setLoadingSession] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState(GENRES[0])
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)

  const [tracks, setTracks] = useState<Track[]>([])
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set())

  const isAuthed = useMemo(() => Boolean(sessionUserId), [sessionUserId])

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
    if (!sessionUserId) {
      setTracks([])
      return
    }

    const loadTracks = async () => {
      setLoadingTracks(true)
      const { data, error } = await supabase
        .from('tracks')
        .select('id,title,artist,genre,play_count,like_count,cover_url,created_at')
        .eq('user_id', sessionUserId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setTracks(data as Track[])
      }
      setLoadingTracks(false)
    }

    void loadTracks()
  }, [sessionUserId])

  useEffect(() => {
    if (!currentTrackId && tracks.length > 0) {
      setCurrentTrackId(tracks[0].id)
    }
  }, [tracks, currentTrackId])

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

      const artistName = (sessionEmail.trim() || email.trim()).split('@')[0]?.trim() || 'Unknown Artist'

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

      const { data: refreshed, error: refreshError } = await supabase
        .from('tracks')
        .select('id,title,artist,genre,play_count,like_count,cover_url,created_at')
        .eq('user_id', sessionUserId)
        .order('created_at', { ascending: false })

      if (!refreshError && refreshed) {
        setTracks(refreshed as Track[])
      }

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

  const currentTrack = useMemo(() => {
    if (tracks.length === 0) return null
    const selected = tracks.find((track) => track.id === currentTrackId) ?? tracks[0]
    return {
      id: selected.id,
      title: selected.title,
      artist: selected.artist || 'Unknown Artist',
      coverUrl: selected.cover_url,
    }
  }, [tracks, currentTrackId])

  const discoveryTracks = useMemo(() => {
    const mapped = tracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist || 'Unknown Artist',
      coverUrl: track.cover_url,
    }))

    if (mapped.length > 0) return mapped

    return SAMPLE_DISCOVERY_TRACKS
  }, [tracks])

  const jumpBackIn = discoveryTracks.slice(0, 6)
  const moreOfWhatYouLike = discoveryTracks.slice(-6).reverse()

  const selectedTrackLiked = currentTrack ? likedTrackIds.has(currentTrack.id) : false

  const toggleLike = () => {
    if (!currentTrack) return
    setLikedTrackIds((prev) => {
      const next = new Set(prev)
      if (next.has(currentTrack.id)) {
        next.delete(currentTrack.id)
      } else {
        next.add(currentTrack.id)
      }
      return next
    })
  }

  if (loadingSession) {
    return <div className="loading">Loading UNDERWAVE...</div>
  }

  if (!isAuthed) {
    return (
      <main className="appShell authShell">
        <div className="ashBackdrop" />
        <section className="authCard glassPanel">
          <h1>UNDERWAVE</h1>
          <p>Sign in to your premium studio.</p>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
          />
          <PremiumButton onClick={handleAuth} disabled={authLoading} className="primaryButton">
            {authLoading ? 'Please wait...' : authMode === 'signin' ? 'Sign in' : 'Create account'}
          </PremiumButton>
          <PremiumButton onClick={handleGoogleAuth} disabled={authLoading} className="secondaryButton">
            Continue with Google
          </PremiumButton>
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
              setCurrentTrackId(track.id)
              setIsPlaying(true)
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
            <ul>
              <li>
                <strong>Liked Songs</strong>
                <span>{likedTrackIds.size} liked tracks</span>
              </li>
              <li>
                <strong>Playlists</strong>
                <span>Curate your premium collections</span>
              </li>
              <li>
                <strong>Uploads</strong>
                <span>{tracks.length} tracks uploaded</span>
              </li>
            </ul>
            {loadingTracks ? (
              <p className="muted">Loading tracks...</p>
            ) : tracks.length === 0 ? (
              <p className="muted">No uploads yet.</p>
            ) : (
              <ul className="trackList premiumList">
                {tracks.map((track) => (
                  <li key={track.id}>
                    {track.cover_url ? <img src={track.cover_url} alt="cover" /> : <div className="coverFallback">♪</div>}
                    <div>
                      <strong>{track.title}</strong>
                      <p>{track.artist || 'Unknown Artist'}</p>
                    </div>
                    <span>
                      {track.play_count ?? 0} plays • {track.like_count ?? 0} likes
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      case 'upload':
        return (
          <section className="glassPanel uploadView">
            <h2>Upload Track</h2>
            <input
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
          <section className="glassPanel placeholderView">
            <h2>Profile</h2>
            <p>{sessionEmail}</p>
            <PremiumButton className="secondaryButton" onClick={handleSignOut}>
              Sign out
            </PremiumButton>
          </section>
        )
      default:
        return null
    }
  }

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      currentTrack={currentTrack}
      isPlaying={isPlaying}
      isLiked={selectedTrackLiked}
      onTogglePlay={() => setIsPlaying((current) => !current)}
      onToggleLike={toggleLike}
    >
      {renderTab()}
    </AppLayout>
  )
}

export default App
