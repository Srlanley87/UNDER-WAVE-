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
} from 'lucide-react'

export type AppTab = 'home' | 'search' | 'library' | 'upload' | 'profile'

type CurrentTrack = {
  id: string
  title: string
  artist: string
  coverUrl: string | null
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
  onViewArtistProfile: () => void
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
        <motion.div layoutId="player-shell" className="miniPlayer glassPanel" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <button className="miniTrack" onClick={() => setFullPlayerOpen(true)} type="button">
            {currentTrack.coverUrl ? (
              <motion.img layoutId="player-cover" src={currentTrack.coverUrl} alt={`${currentTrack.title} cover`} />
            ) : (
              <motion.div layoutId="player-cover" className="coverFallback">♪</motion.div>
            )}
            <span>
              <strong>{currentTrack.title}</strong>
              <small>{currentTrack.artist}</small>
            </span>
          </button>
          <div className="miniActions">
            <PremiumButton className="iconButton" onClick={onPrev}>
              <SkipBack strokeWidth={2.5} size={18} />
            </PremiumButton>
            <PremiumButton className="playButton" onClick={onTogglePlay}>
              {isPlaying ? <Pause strokeWidth={2.5} size={20} /> : <Play strokeWidth={2.5} size={20} />}
            </PremiumButton>
            <PremiumButton className="iconButton" onClick={onNext}>
              <SkipForward strokeWidth={2.5} size={18} />
            </PremiumButton>
            <PremiumButton className={`iconButton ${isRepeat ? 'active' : ''}`} onClick={onToggleRepeat}>
              <Repeat strokeWidth={2.5} size={18} />
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
            <motion.div layoutId="player-shell" className="fullPlayer glassPanel" transition={{ type: 'spring', stiffness: 210, damping: 25 }}>
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
                    layoutId="player-cover"
                    src={currentTrack.coverUrl}
                    alt={`${currentTrack.title} artwork`}
                    className="heroCover"
                    animate={isPlaying ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                    transition={{ duration: 4, repeat: isPlaying ? Infinity : 0, ease: 'easeInOut' }}
                  />
                ) : (
                  <motion.div layoutId="player-cover" className="heroCover coverFallback">♪</motion.div>
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
                <p>{currentTrack.artist}</p>
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
                    <PremiumButton className="sheetButton" onClick={onViewArtistProfile}>
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
