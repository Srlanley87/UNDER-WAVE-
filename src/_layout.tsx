import { type ReactNode, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CirclePlus,
  Heart,
  House,
  Library,
  MessageCircle,
  Pause,
  Play,
  Search,
  Share2,
  UserRound,
  ListPlus,
  Repeat,
} from 'lucide-react'

export type AppTab = 'home' | 'search' | 'library' | 'upload' | 'profile'

type CurrentTrack = {
  title: string
  artist: string
  coverUrl: string | null
}

type AppLayoutProps = {
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
  currentTrack: CurrentTrack | null
  isPlaying: boolean
  isLiked: boolean
  onTogglePlay: () => void
  onToggleLike: () => void
  children: ReactNode
}

const navItems: Array<{ id: AppTab; label: string; icon: typeof House }> = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'upload', label: 'Upload', icon: CirclePlus },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

const SIMULATED_WAVEFORM_BAR_HEIGHTS = [14, 24, 18, 40, 28, 22, 46, 18, 34, 26, 42, 16, 30, 36, 21, 44]

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
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
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
  onTogglePlay,
  onToggleLike,
  children,
}: AppLayoutProps) {
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false)
  const [progress, setProgress] = useState(26)

  const waveformBars = useMemo(() => SIMULATED_WAVEFORM_BAR_HEIGHTS, [])

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="viewSection"
          >
            {children}
          </motion.section>
        </AnimatePresence>
      </div>

      {currentTrack && (
        <motion.div className="miniPlayer glassPanel" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <button className="miniTrack" onClick={() => setFullPlayerOpen(true)} type="button">
            {currentTrack.coverUrl ? (
              <img src={currentTrack.coverUrl} alt={`${currentTrack.title} cover`} />
            ) : (
              <div className="coverFallback">♪</div>
            )}
            <span>
              <strong>{currentTrack.title}</strong>
              <small>{currentTrack.artist}</small>
            </span>
          </button>
          <div className="miniActions">
            <PremiumButton className={`iconButton ${isLiked ? 'active' : ''}`} onClick={onToggleLike}>
              <Heart strokeWidth={2.5} size={19} fill={isLiked ? 'currentColor' : 'none'} />
            </PremiumButton>
            <PremiumButton className="playButton" onClick={onTogglePlay}>
              {isPlaying ? <Pause strokeWidth={2.5} size={19} /> : <Play strokeWidth={2.5} size={19} />}
            </PremiumButton>
          </div>
        </motion.div>
      )}

      <nav className="bottomNav glassPanel" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.id === activeTab
          return (
            <PremiumButton
              key={item.id}
              className={`navItem ${active ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <Icon strokeWidth={2.5} size={21} />
              <span>{item.label}</span>
            </PremiumButton>
          )
        })}
      </nav>

      <AnimatePresence>
        {fullPlayerOpen && currentTrack && (
          <motion.div
            className="playerOverlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullPlayerOpen(false)}
          >
            <motion.div
              className="fullPlayer glassPanel"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 210, damping: 26 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="heroCoverWrap">
                {currentTrack.coverUrl ? (
                  <img
                    src={currentTrack.coverUrl}
                    alt={`${currentTrack.title} artwork`}
                    className={isPlaying ? 'heroCover spinning' : 'heroCover'}
                  />
                ) : (
                  <div className="heroCover coverFallback">♪</div>
                )}
              </div>
              <h2>{currentTrack.title}</h2>
              <p>{currentTrack.artist}</p>

              <div className="waveformWrap">
                <div className="waveform" aria-hidden="true">
                  {waveformBars.map((bar, index) => (
                    <div
                      key={`waveform-bar-${index}`}
                      style={{ height: `${bar}px` }}
                      className={index < Math.round((progress / 100) * waveformBars.length) ? 'filled' : ''}
                    />
                  ))}
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(event) => setProgress(Number(event.target.value))}
                  aria-label="Track progress"
                />
              </div>

              <div className="playerControls">
                <PremiumButton className={`iconButton ${isLiked ? 'active' : ''}`} onClick={onToggleLike}>
                  <Heart strokeWidth={2.5} size={20} fill={isLiked ? 'currentColor' : 'none'} />
                </PremiumButton>
                <PremiumButton className="iconButton">
                  <MessageCircle strokeWidth={2.5} size={20} />
                </PremiumButton>
                <PremiumButton className="iconButton">
                  <Repeat strokeWidth={2.5} size={20} />
                </PremiumButton>
                <PremiumButton className="iconButton">
                  <Share2 strokeWidth={2.5} size={20} />
                </PremiumButton>
                <PremiumButton className="iconButton">
                  <ListPlus strokeWidth={2.5} size={20} />
                </PremiumButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

export { PremiumButton }
