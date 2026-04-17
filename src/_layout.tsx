import { type ReactNode, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CirclePlus,
  Ellipsis,
  Heart,
  House,
  Library,
  MessageCircle,
  Pause,
  Play,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  UserRound,
  Repeat,
  X,
  UserPlus,
} from 'lucide-react'

export type AppTab = 'home' | 'search' | 'library' | 'upload' | 'profile'

type CurrentTrack = {
  id: string
  title: string
  artist: string
  coverUrl: string | null
  userId?: string
}

type PlaylistItem = {
  id: string
  name: string
}

type PlayerComment = {
  id: string
  author: string
  body: string
}

type AppLayoutProps = {
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
  currentTrack: CurrentTrack | null
  isPlaying: boolean
  isLiked: boolean
  isShuffle: boolean
  isRepeat: boolean
  progress: number
  onSeek: (value: number) => void
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  onToggleLike: () => void
  onToggleShuffle: () => void
  onToggleRepeat: () => void
  comments: PlayerComment[]
  commentDraft: string
  onCommentDraftChange: (value: string) => void
  onSubmitComment: () => void
  submittingComment: boolean
  playlists: PlaylistItem[]
  onAddCurrentTrackToPlaylist: (playlistId: string) => void
  onViewArtistProfile: (artistId?: string) => void
  onShareTrack: () => void
  children: ReactNode
}

const navItems: Array<{ id: AppTab; label: string; icon: typeof House }> = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'upload', label: 'Upload', icon: CirclePlus },
  { id: 'profile', label: 'Profile', icon: UserRound },
]
const RADIO_WAVE_BAR_INDICES = Array.from({ length: 20 }, (_, i) => i)

function WaveLogo() {
  return (
    <div className="waveLogo" aria-label="UNDERWAVE logo" role="img">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="31" className="waveLogoCircle" />
        <path d="M14 25c7-8 13-8 20 0s13 8 20 0" className="waveLine" />
        <path d="M14 32c7-8 13-8 20 0s13 8 20 0" className="waveLine" />
        <path d="M14 39c7-8 13-8 20 0s13 8 20 0" className="waveLine" />
      </svg>
    </div>
  )
}

function PremiumButton({
  onClick,
  children,
  className,
  type = 'button',
  disabled,
}: {
  onClick?: () => void
  children: ReactNode
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      onClick={onClick}
      className={className}
      type={type}
      disabled={disabled}
    >
      {children}
    </motion.button>
  )
}

export function AppLayout({
  activeTab,
  onTabChange,
  currentTrack,
  isPlaying,
  isLiked,
  isShuffle,
  isRepeat,
  progress,
  onSeek,
  onTogglePlay,
  onPrev,
  onNext,
  onToggleLike,
  onToggleShuffle,
  onToggleRepeat,
  comments,
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  submittingComment,
  playlists,
  onAddCurrentTrackToPlaylist,
  onViewArtistProfile,
  onShareTrack,
  children,
}: AppLayoutProps) {
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const clampedProgress = Math.max(0, Math.min(100, progress))
  const progressRadius = 20
  const progressCircumference = 2 * Math.PI * progressRadius
  const progressDashOffset = progressCircumference - (clampedProgress / 100) * progressCircumference

  return (
    <main className="appShell">
      <div className="ashBackdrop" />
      <div className="contentWrap">
        <header className="topHeader glassPanel">
          <div className="brandGroup">
            <WaveLogo />
            <div>
              <h1>UNDERWAVE</h1>
              <p>Hyper-premium web audio</p>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.section
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="viewSection"
          >
            {children}
          </motion.section>
        </AnimatePresence>
      </div>

      {currentTrack && (
        <motion.div
          className="miniPlayer"
          initial={{ y: 18, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          style={{
            position: 'fixed',
            bottom: '76px',
            left: '50%',
            width: 'calc(100% - 24px)',
            maxWidth: '500px',
            borderRadius: '30px',
            background: 'rgba(30, 30, 35, 0.95)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            padding: '6px 16px 6px 6px',
            gap: '12px',
            zIndex: 9998,
          }}
        >
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{
              position: 'relative',
              width: '44px',
              height: '44px',
              minWidth: '44px',
              border: 'none',
              background: 'transparent',
              padding: 0,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <svg
              width="44"
              height="44"
              viewBox="0 0 44 44"
              aria-hidden="true"
              style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
            >
              <circle
                cx="22"
                cy="22"
                r={progressRadius}
                stroke="#FFB800"
                strokeWidth="3"
                fill="transparent"
                strokeDasharray={progressCircumference}
                strokeDashoffset={progressDashOffset}
                strokeLinecap="round"
              />
            </svg>
            <span
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#FFF',
                display: 'grid',
                placeItems: 'center',
                position: 'absolute',
                inset: '50% auto auto 50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {isPlaying ? (
                <Pause size={20} strokeWidth={2.5} color="#000" fill="#000" />
              ) : (
                <Play size={20} strokeWidth={2.5} color="#000" fill="#000" />
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFullPlayerOpen(true)}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              background: 'transparent',
              padding: 0,
              margin: 0,
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong
                style={{
                  display: 'block',
                  color: '#FFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentTrack.title}
              </strong>
              <small style={{ display: 'block' }}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onViewArtistProfile(currentTrack.userId)
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    margin: 0,
                    color: '#A0A0A0',
                    fontSize: '12px',
                    width: '100%',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    cursor: 'pointer',
                  }}
                >
                  {currentTrack.artist}
                </button>
              </small>
            </div>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PremiumButton
              className="iconButton"
              onClick={() => onViewArtistProfile(currentTrack.userId)}
            >
              <UserPlus strokeWidth={1.5} size={20} color="#FFF" />
            </PremiumButton>
            <PremiumButton className={`iconButton ${isLiked ? 'active' : ''}`} onClick={onToggleLike}>
              <Heart strokeWidth={1.5} size={20} color="#FFF" fill={isLiked ? '#FFF' : 'none'} />
            </PremiumButton>
          </div>
        </motion.div>
      )}

      <nav className="bottomNav glassPanel" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.id === activeTab
          return (
            <PremiumButton key={item.id} className={`navItem ${active ? 'active' : ''}`} onClick={() => onTabChange(item.id)}>
              <Icon strokeWidth={2.5} size={21} />
              <span>{item.label}</span>
            </PremiumButton>
          )
        })}
      </nav>

      <AnimatePresence>
        {fullPlayerOpen && currentTrack && (
          <motion.div className="playerOverlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="fullPlayer glassPanel" transition={{ type: 'spring', stiffness: 210, damping: 25 }}>
              <div className="fullPlayerTopBar">
                <PremiumButton className="iconButton" onClick={() => setFullPlayerOpen(false)}>
                  <X size={18} strokeWidth={2.5} />
                </PremiumButton>
                <div>
                  <small>Now Playing</small>
                </div>
                <PremiumButton className="iconButton" onClick={() => setSheetOpen(true)}>
                  <Ellipsis size={18} strokeWidth={2.5} />
                </PremiumButton>
              </div>

              <div className={`heroCoverWrap ${isPlaying ? 'playingGlow' : ''}`}>
                {currentTrack.coverUrl ? (
                  <motion.img
                    src={currentTrack.coverUrl}
                    alt={`${currentTrack.title} artwork`}
                    className="heroCover"
                    animate={isPlaying ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                    transition={{ duration: 4, repeat: isPlaying ? Infinity : 0, ease: 'easeInOut' }}
                  />
                ) : (
                  <div className="heroCover coverFallback">♪</div>
                )}
                <div className={`radioWaveOverlay ${isPlaying ? 'active' : ''}`} aria-hidden="true">
                  {RADIO_WAVE_BAR_INDICES.map((index) => (
                    <span key={index} style={{ animationDelay: `${(index % 5) * 0.12}s` }} />
                  ))}
                </div>
                <div className="heroGlass" />
              </div>

              <div className="playerMeta">
                <h2>{currentTrack.title}</h2>
                <p>
                  <button type="button" className="artistInlineButton" onClick={() => onViewArtistProfile(currentTrack.userId)}>
                    {currentTrack.artist}
                  </button>
                </p>
              </div>

              <div className="progressWrap">
                <input
                  className="premiumRange"
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(event) => onSeek(Number(event.target.value))}
                  aria-label="Track progress"
                />
              </div>

              <div className="controlDeck">
                <PremiumButton className={`iconButton bigIcon ${isShuffle ? 'active' : ''}`} onClick={onToggleShuffle}>
                  <Shuffle size={20} strokeWidth={2.5} />
                </PremiumButton>
                <PremiumButton className="iconButton bigIcon" onClick={onPrev}>
                  <SkipBack size={22} strokeWidth={2.5} />
                </PremiumButton>
                <motion.button
                  className="heroPlayButton"
                  whileTap={{ scale: 0.92 }}
                  onClick={onTogglePlay}
                  type="button"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={28} strokeWidth={2.8} /> : <Play size={28} strokeWidth={2.8} />}
                </motion.button>
                <PremiumButton className="iconButton bigIcon" onClick={onNext}>
                  <SkipForward size={22} strokeWidth={2.5} />
                </PremiumButton>
                <PremiumButton className={`iconButton bigIcon ${isRepeat ? 'active' : ''}`} onClick={onToggleRepeat}>
                  <Repeat size={20} strokeWidth={2.5} />
                </PremiumButton>
              </div>

              <div className="playerControls">
                <PremiumButton className={`iconButton ${isLiked ? 'active' : ''}`} onClick={onToggleLike}>
                  <Heart strokeWidth={2.5} size={20} fill={isLiked ? 'currentColor' : 'none'} />
                </PremiumButton>
                <PremiumButton className="iconButton" onClick={() => setCommentsOpen((value) => !value)}>
                  <MessageCircle strokeWidth={2.5} size={20} />
                </PremiumButton>
              </div>

              <AnimatePresence>
                {commentsOpen && (
                  <motion.section
                    className="commentsOverlay glassPanel"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                  >
                    <header>
                      <strong>Comments</strong>
                    </header>
                    <div className="commentsList">
                      {comments.length === 0 ? (
                        <p className="muted">No comments yet.</p>
                      ) : (
                        comments.map((comment) => (
                          <article key={comment.id}>
                            <strong>{comment.author}</strong>
                            <p>{comment.body}</p>
                          </article>
                        ))
                      )}
                    </div>
                    <div className="commentComposer">
                      <input
                        value={commentDraft}
                        onChange={(event) => onCommentDraftChange(event.target.value)}
                        placeholder="Drop a comment"
                      />
                      <PremiumButton className="primaryButton" onClick={onSubmitComment} disabled={submittingComment}>
                        {submittingComment ? 'Posting...' : 'Post'}
                      </PremiumButton>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </motion.div>

            <AnimatePresence>
              {sheetOpen && (
                <>
                  <motion.button
                    className="sheetBackdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSheetOpen(false)}
                    aria-label="Close menu"
                  />
                  <motion.section className="bottomSheet glassPanel" initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}>
                    <PremiumButton className="sheetButton" onClick={() => onViewArtistProfile(currentTrack.userId)}>
                      View Artist Profile
                    </PremiumButton>
                    <PremiumButton className="sheetButton" onClick={onShareTrack}>
                      Repost / Share
                    </PremiumButton>
                    <div className="sheetPlaylistGroup">
                      <strong>Add to Playlist</strong>
                      {playlists.length === 0 ? (
                        <p className="muted">No playlists yet.</p>
                      ) : (
                        playlists.map((playlist) => (
                          <PremiumButton
                            key={playlist.id}
                            className="sheetButton"
                            onClick={() => {
                              onAddCurrentTrackToPlaylist(playlist.id)
                              setSheetOpen(false)
                            }}
                          >
                            {playlist.name}
                          </PremiumButton>
                        ))
                      )}
                    </div>
                  </motion.section>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

export { PremiumButton }
