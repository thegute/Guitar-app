// "Now playing": the song you were last playing, at the bottom of every screen except the player itself, so one tap takes
// you back to it (like a music app). The player is opened from Songs; this is the way back from anywhere else.
import { useEffect, useState } from 'react'
import { getSong } from '../tabs/library'
import { go } from '../nav'
import { Ico } from './Icon'

export function NowPlaying({ instId }: { instId: string }) {
  const [title, setTitle] = useState<string | null>(null)
  useEffect(() => {
    let id = ''
    try { id = JSON.parse(localStorage.getItem(`kg:playSong:${instId}`) ?? '""') as string } catch { id = '' }
    if (!id) { setTitle(''); return }
    let live = true
    void getSong(id).then(d => { if (live) setTitle(d?.title ?? '') }).catch(() => { if (live) setTitle('') })
    return () => { live = false }
  }, [instId])
  // nothing played yet on this instrument: the bar still opens the song player (with the example song)
  if (title === null) return null
  return (
    <button className="now-playing" onClick={() => go('play')} data-testid="now-playing" aria-label={title ? `Back to ${title} in the song player` : 'Open the song player'}>
      <span className="np-icon" aria-hidden><Ico n="play" fill /></span>
      <span className="np-text"><span className="small muted">{title ? 'Now playing' : 'Song player'}</span><b>{title || 'Open the example song'}</b></span>
      <span className="np-go">Open</span>
    </button>
  )
}
