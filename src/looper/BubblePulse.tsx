// Makes the floating looper button flash with the beat while the looper plays (gold on the 1).
import type { RefObject } from 'react'
import { BarLights } from './BarLights'
import { useStation } from './LooperPanel'

export default function BubblePulse({ target }: { target: RefObject<HTMLElement | null> }) {
  const st = useStation()
  const rec = !!st.rec && (st.rec.status === 'rec' || st.rec.status === 'closing')
  return <div className="bubble-pulse" aria-hidden><BarLights t={st.transport} playing={st.playing} recording={rec} edgeRef={target} /></div>
}
