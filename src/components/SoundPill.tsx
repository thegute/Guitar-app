// "Something is playing" (owner 2026-11-12: "I play a sound and lose track of where it is to turn it off"): while any
// player is making sound (the metronome, the Jam band, Hear it, a drone, the beat maker or looper), a small pill at the
// bottom says what it is, with one Stop for all of it, on every screen.
import { useEffect, useState } from 'react'
import { liveLabels, onLiveChange, stopEverything } from '../audio/stopAll'
import { Ico } from './Icon'

export function SoundPill() {
  const [names, setNames] = useState<string[]>([])
  useEffect(() => { const f = () => setNames(liveLabels()); f(); return onLiveChange(f) }, [])
  if (!names.length) return null
  return (
    <div className="sound-pill" role="status" data-testid="sound-pill">
      <span className="sp-dot" aria-hidden />
      <span className="sp-what">{names.join(' + ')} playing</span>
      <button className="btn sm sp-stop" onClick={() => stopEverything()} data-testid="sound-pill-stop"><Ico n="stop" fill /> Stop</button>
    </div>
  )
}
