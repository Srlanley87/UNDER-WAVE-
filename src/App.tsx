import { useEffect, useMemo, useState } from 'react'
import './index.css'
import { supabase } from './lib/supabase'

type Track = {
  id: string
  title: string
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

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function App() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)
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

  const isAuthed = useMemo(() => Boolean(sessionUserId), [sessionUserId])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSessionUserId(data.session?.user.id ?? null)
      setLoadingSession(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user.id ?? null)
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
        .select('id,title,genre,play_count,like_count,cover_url,created_at')
        .eq('user_id', sessionUserId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setTracks(data as Track[])
      }
      setLoadingTracks(false)
    }

    void loadTracks()
  }, [sessionUserId])

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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUploadMessage(null)
    setAuthMessage('Signed out.')
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

      const { error: audioError } = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(audioPath, audioFile, {
          upsert: false,
          contentType: audioFile.type || 'application/octet-stream',
        })

      if (audioError) throw new Error(`Audio upload failed: ${audioError.message}`)

      const { data: audioPublic } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(audioPath)

      let coverUrl: string | null = null

      if (coverFile) {
        const coverPath = `${sessionUserId}/${stamp}_${safeFileName(coverFile.name)}`
        const { error: coverError } = await supabase.storage
          .from(COVER_BUCKET)
          .upload(coverPath, coverFile, {
            upsert: false,
            contentType: coverFile.type || 'application/octet-stream',
          })

        if (coverError) throw new Error(`Cover upload failed: ${coverError.message}`)

        const { data: coverPublic } = supabase.storage.from(COVER_BUCKET).getPublicUrl(coverPath)
        coverUrl = coverPublic.publicUrl
      }

      const { error: insertError } = await supabase.from('tracks').insert({
        user_id: sessionUserId,
        title: title.trim(),
        artist: email.split('@')[0] || 'Unknown Artist',
        genre,
        audio_url: audioPublic.publicUrl,
        cover_url: coverUrl,
        play_count: 0,
        like_count: 0,
      })

      if (insertError) throw new Error(`Database insert failed: ${insertError.message}`)

      const { data: refreshed, error: refreshError } = await supabase
        .from('tracks')
        .select('id,title,genre,play_count,like_count,cover_url,created_at')
        .eq('user_id', sessionUserId)
        .order('created_at', { ascending: false })

      if (!refreshError && refreshed) {
        setTracks(refreshed as Track[])
      }

      setTitle('')
      setAudioFile(null)
      setCoverFile(null)
      setUploadMessage('Upload successful.')
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  if (loadingSession) {
    return <div className="loading">Loading UNDERWAVE...</div>
  }

  return (
    <main className="page">
      <div className="aurora" />
      <header className="header">
        <div>
          <h1>UNDERWAVE Web</h1>
          <p>Fresh rebuild. Web-only. Fast upload flow.</p>
        </div>
        {isAuthed && (
          <button className="ghost" onClick={handleSignOut} type="button">
            Sign out
          </button>
        )}
      </header>

      {!isAuthed ? (
        <section className="card auth">
          <h2>{authMode === 'signin' ? 'Sign in' : 'Create account'}</h2>
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
          <button onClick={handleAuth} disabled={authLoading} type="button">
            {authLoading ? 'Please wait...' : authMode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
          <button
            className="ghost"
            onClick={() => {
              setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
              setAuthMessage(null)
            }}
            type="button"
          >
            {authMode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
          {authMessage && <p className="message">{authMessage}</p>}
        </section>
      ) : (
        <section className="grid">
          <article className="card">
            <h2>Upload track</h2>
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

            <button onClick={handleUpload} disabled={uploading} type="button">
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            {uploadMessage && <p className="message">{uploadMessage}</p>}
          </article>

          <article className="card">
            <h2>Your uploads</h2>
            {loadingTracks ? (
              <p className="muted">Loading tracks...</p>
            ) : tracks.length === 0 ? (
              <p className="muted">No uploads yet.</p>
            ) : (
              <ul className="trackList">
                {tracks.map((track) => (
                  <li key={track.id}>
                    {track.cover_url ? <img src={track.cover_url} alt="cover" /> : <div className="coverFallback">♪</div>}
                    <div>
                      <strong>{track.title}</strong>
                      <p>{track.genre || 'Unknown genre'}</p>
                    </div>
                    <span>
                      {track.play_count ?? 0} plays • {track.like_count ?? 0} likes
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      )}
    </main>
  )
}

export default App
