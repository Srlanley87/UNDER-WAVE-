import { motion } from 'framer-motion'
import { PremiumButton } from './_layout'

type FeedTrack = {
  id: string
  title: string
  artist: string
  coverUrl: string | null
}

type HomeProps = {
  jumpBackIn: FeedTrack[]
  moreOfWhatYouLike: FeedTrack[]
  onSelectTrack: (track: FeedTrack) => void
}

function Section({
  title,
  items,
  onSelectTrack,
}: {
  title: string
  items: FeedTrack[]
  onSelectTrack: (track: FeedTrack) => void
}) {
  return (
    <section className="feedSection">
      <h2>{title}</h2>
      <div className="horizontalRail">
        {items.map((track) => (
          <motion.article key={track.id} className="feedCard" whileHover={{ y: -2 }}>
            <PremiumButton className="coverButton" onClick={() => onSelectTrack(track)}>
              {track.coverUrl ? <img src={track.coverUrl} alt={`${track.title} cover`} /> : <div className="coverFallback">♪</div>}
            </PremiumButton>
            <div className="feedMeta">
              <strong title={track.title}>{track.title}</strong>
              <span title={track.artist}>{track.artist}</span>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  )
}

export function Home({ jumpBackIn, moreOfWhatYouLike, onSelectTrack }: HomeProps) {
  return (
    <div className="homeFeed">
      <Section title="Jump back in" items={jumpBackIn} onSelectTrack={onSelectTrack} />
      <Section title="More of what you like" items={moreOfWhatYouLike} onSelectTrack={onSelectTrack} />
    </div>
  )
}
