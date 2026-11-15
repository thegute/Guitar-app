// The floating looper's card (loaded the first time it opens): one big button for the selected track (record / close
// the loop / overdub), the four tracks, play / stop, undo, how recording starts (count-in, when I play, free), the bar
// lights with their two-colour count-in, and the card's edge flashing on every beat.
import { useRef } from 'react'
import { Ico } from '../components/Icon'
import { openJam } from '../nav'
import { countUse } from '../usage'
import { BarLights } from './BarLights'
import { useStation, trackState } from './LooperPanel'

const BIG: Record<string, string> = { empty: 'Record', armed: 'Get ready…', rec: 'Close the loop', closing: 'Closing…', working: 'Saving…', dub: 'Stop adding', dubArmed: 'Get ready…', loop: 'Overdub' }

export default function FloatingCard({ onClose }: { onClose: () => void }) {
  const st = useStation()
  const edge = useRef<HTMLDivElement>(null)
  const sel = st.s.sel
  const state = trackState(st, sel)
  const waiting = !!st.rec?.wait
  const recording = !!st.rec && (st.rec.status === 'rec' || st.rec.status === 'closing')
  return (
    <div className="float-looper" ref={edge} data-testid="float-looper" role="dialog" aria-label="Looper">
      <div className="row fl-head">
        <b>Looper</b>
        <BarLights t={st.transport} playing={st.playing} recording={recording} edgeRef={edge} />
        <button className="btn sm ghost" aria-label="Close the looper card" onClick={onClose}>✕</button>
      </div>
      <button className={`btn fl-big s-${state}${waiting ? ' waiting' : ''}`} data-testid="fl-big" onClick={() => { countUse('looper:float-press'); void st.press(sel) }}>
        {waiting ? 'Listening… start playing' : `${BIG[state] ?? 'Record'} (track ${sel + 1})`}
      </button>
      <div className="row fl-tracks">
        {[0, 1, 2, 3].map(i => { const s = trackState(st, i); return <button key={i} className={`lb-track s-${s}${sel === i ? ' sel' : ''}`} aria-label={`Track ${i + 1}`} data-testid={`fl-track-${i}`} onClick={() => st.set({ sel: i })}>{i + 1}</button> })}
        <button className="btn sm" aria-label={st.playing ? 'Stop' : 'Play'} data-testid="fl-play" onClick={() => (st.playing ? st.stop() : st.start(0))}>{st.playing ? <Ico n="stop" fill /> : <Ico n="play" fill />}</button>
        <button className="btn sm" aria-label="Undo the last take" onClick={() => st.undo(sel)}>Undo</button>
      </div>
      {!st.rec && (
        <div className="seg fl-start small" role="group" aria-label="How recording starts">
          <button aria-pressed={st.s.start === 'play'} data-testid="fl-start-play" onClick={() => st.set({ start: 'play' })}>When I play</button>
          <button aria-pressed={st.s.start === 'count'} onClick={() => st.set({ start: 'count' })}>Count-in bar</button>
          <button aria-pressed={st.s.start === 'free'} onClick={() => st.set({ start: 'free' })}>Free</button>
        </div>
      )}
      {st.note && <p className="small fl-note" role="status" data-testid="fl-note">{st.note}</p>}
      <p className="small muted fl-help">{st.s.start === 'play' ? 'It starts by itself on your first note, keeping the note\'s attack; the loop length snaps to whole bars at your tempo.' : st.s.start === 'count' ? 'One bar of lights first (gold is beat 1); the loop snaps to the beat.' : 'Your first loop sets the tempo; it snaps to whole bars.'}</p>
      <button className="btn sm ghost" onClick={() => { onClose(); openJam('loop') }}>The full looper (4 tracks, parts, mix)</button>
    </div>
  )
}
