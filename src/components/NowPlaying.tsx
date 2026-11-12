// "Now playing": the song you were last playing, at the bottom of every screen except the player itself, so one tap takes
// you back to it (like a music app). The player is opened from Songs; this is the way back from anywhere else.
import { useEffect, useState } from 'react'
import { getSong } from '../tabs/library'
import { go } from '../nav'
import { Ico } from './Icon'

/** The ✕ hides the bar until a different song is opened (it remembers which song it was hidden for). */
const HIDE_KEY = 'kg:npHidden'
function hiddenFor(): string | null { try { const v = localStorage.getItem(HIDE_KEY); return v === null ? null : (JSON.parse(v) as string) } catch { return null } }

export function NowPlaying({ instId }: { instId: string }) {
  const [title, setTitle] = useState<string | null>(null)
  const [songId, setSongId] = useState('')
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let id = ''
    try { id = JSON.parse(localStorage.getItem(`kg:playSong:${instId}`) ?? '""') as string } catch { id = '' }
    setSongId(id)
    setHidden(hiddenFor() === (id || '*'))
    if (!id) { setTitle(''); return }
    let live = true
    void getSong(id).then(d => { if (live) setTitle(d?.title ?? '') }).catch(() => { if (live) setTitle('') })
    return () => { live = false }
  }, [instId])
  // nothing played yet on this instrument: the bar still opens the song player (with the example song)
  if (title === null || hidden) return null
  const hide = () => {
    try { localStorage.setItem(HIDE_KEY, JSON.stringify(songId || '*')) } catch { /* private */ }
    setHidden(true)
  }
  return (
    <div className="now-playing">
      <button className="np-open" onClick={() => go('play')} data-testid="now-playing" aria-label={title ? `Back to ${title} in the song player` : 'Open the song player'}>
        <span className="np-icon" aria-hidden><Ico n="play" fill /></span>
        <span className="np-text"><span className="small muted">{title ? 'Now playing' : 'Song player'}</span><b>{title || 'Open the example song'}</b></span>
        <span className="np-go">Open</span>
      </button>
      <button className="np-close" onClick={hide} aria-label="Hide the Now playing bar (it comes back when you open another song)" data-testid="now-playing-close">
        <Ico n="x" />
      </button>
    </div>
  )
}
