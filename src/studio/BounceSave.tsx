// Bounce and save: record what the beat maker plays (after the effects) for one time round, then
//   * into one loop: everything becomes a single looper layer and what it came from is muted (so you can keep
//     stacking without running out of layers; Undo the bounce brings it all back)
//   * onto a pad: the whole loop on one of Your pads, to play from a pad or chop up
//   * save as audio: a WAV of the mix, and optionally each part on its own (stems), to share or use elsewhere
// It plays through once while it records (that's how it hears exactly what you hear).
import { useRef, useState } from 'react'
import { audio } from '../audio/engine'
import { TapRecorder, encodeWav } from '../audio/tap'
import { shareFiles } from '../audio/shareFiles'
import { Win } from '../components/Win'
import { Ico } from '../components/Icon'
import { USER_PADS } from './pads'
import { saveSample } from './padSamples'
import { beatInPart, newId, partsMade, playOrder, type Beat } from './beat'
import { instr } from './sounds'
import type { StudioTransport } from './transport'
import type { LoopLayer } from './transport'

type SetBeat = (f: Beat | ((b: Beat) => Beat), remember?: boolean) => void
interface LoopsApi { layers: (LoopLayer & { bars: number })[]; addRaw: (x: Float32Array, bars: number) => Promise<string>; setMutes: (m: Record<string, boolean>) => void; remove: (id: string) => void }

/** Record taps for `passes` times round, starting at the top of the next pass. */
async function record(t: StudioTransport, play: (c?: number) => void, nodes: AudioNode[], passes: number, onWait: (secs: number) => void, signal: { cancelled: boolean }) {
  const taps = nodes.map(() => new TapRecorder())
  await Promise.all(taps.map((tp, i) => tp.start(nodes[i])))
  try {
    if (!t.playing) play(0)
    const ctx = audio()
    const k = Math.max(0, Math.ceil((ctx.currentTime + 0.06 - t.t0) / t.loopDur))
    const start = t.t0 + k * t.loopDur
    const dur = t.loopDur * passes
    const tick = setInterval(() => onWait(Math.max(0, start + dur - audio().currentTime)), 200)
    try { return await Promise.all(taps.map(tp => tp.capture(start, dur, signal))) } finally { clearInterval(tick) }
  } finally { taps.forEach(tp => tp.stop()) }
}

export function BounceSave({ t, beat, setBeat, loops, play, stop }: { t: StudioTransport; beat: Beat; setBeat: SetBeat; loops: LoopsApi; play: (c?: number) => void; stop: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [secs, setSecs] = useState(0)
  const [msg, setMsg] = useState('')
  const [stems, setStems] = useState(false)
  const [undoB, setUndoB] = useState<null | { loop: string; beat: Beat; mutes: Record<string, boolean> }>(null)
  const sig = useRef({ cancelled: false })
  const order = playOrder(beat)
  const song = order.length > 1
  const go = async (what: 'loop' | 'pad' | 'save') => {
    if (busy) return
    sig.current = { cancelled: false }
    setBusy(what); setMsg(''); setUndoB(null)
    try {
      const sr = audio().sampleRate
      if (what === 'save') {
        const parts = stems ? [
          { name: 'drums', node: t.drumBus as AudioNode },
          ...partsMade(beat).flatMap(p => beatInPart(beat, p).tracks).filter((x, i, a) => a.findIndex(y => y.id === x.id) === i)
            .map((x, i) => ({ name: `${i + 1} ${x.inst.startsWith('pad:') ? 'pad' : instr(x.inst).label}`, node: t.bus(x.id).g as AudioNode })),
          ...(loops.layers.length ? [{ name: 'loops', node: t.loopBus as AudioNode }] : []),
        ] : []
        const got = await record(t, play, [t.fx.output, ...parts.map(p => p.node)], order.length, setSecs, sig.current)
        stop()
        const files = [{ name: `${beat.name}${song ? ' (song)' : ''} mix.wav`, blob: encodeWav([got[0].l, got[0].r], sr) },
          ...parts.map((p, i) => ({ name: `${beat.name} ${p.name}.wav`, blob: encodeWav([got[i + 1].l, got[i + 1].r], sr) }))]
        await shareFiles(files, `Save "${beat.name}"`)
        setMsg(`Saved ${files.length} file${files.length > 1 ? 's' : ''} (${(t.loopDur * order.length).toFixed(1)} s${song ? ', the whole song' : ''}).`)
      } else {
        const [g] = await record(t, play, [t.fx.output], 1, setSecs, sig.current)
        const mono = new Float32Array(g.l.length)
        for (let i = 0; i < mono.length; i++) mono[i] = (g.l[i] + g.r[i]) * 0.5
        if (what === 'loop') {
          const before = beat
          const mutes = Object.fromEntries(loops.layers.map(l => [l.id, !!l.mute]))
          const id = await loops.addRaw(mono, beat.bars)
          loops.setMutes(Object.fromEntries(loops.layers.map(l => [l.id, true])))
          setBeat(b => ({ ...b, rows: b.rows.map(r => ({ ...r, mute: true })), layers: (b.layers ?? []).map(l => ({ ...l, mute: true })), tracks: b.tracks.map(x => ({ ...x, mute: true })) }))
          setUndoB({ loop: id, beat: before, mutes })
          setMsg('Bounced: everything you heard is now one loop in the Looper, and what it came from is muted. Keep stacking, or undo the bounce.')
        } else {
          const pad = USER_PADS.find(p => !beat.pads?.[p]) ?? USER_PADS[USER_PADS.length - 1]
          const id = newId()
          await saveSample(id, mono, sr)
          setBeat(b => ({ ...b, pads: { ...b.pads, [pad]: { src: 'rec', sample: id, start: 0, end: mono.length / sr, name: 'Bounce' } } }))
          setMsg(`The whole loop is on Your pads → Pad ${pad.slice(1)} ("Bounce"). Tap it to play it, or open it in Sample mode to trim it.`)
        }
      }
    } catch { if (!sig.current.cancelled) setMsg("Couldn't record that. Try again.") }
    setBusy(null)
  }
  const undo = () => {
    if (!undoB) return
    loops.remove(undoB.loop)
    loops.setMutes(undoB.mutes)
    setBeat(undoB.beat)
    setUndoB(null)
    setMsg('Bounce undone.')
  }
  return (
    <Win id="bounce" title="Bounce and save" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
      <p className="small muted" style={{ margin: 0 }}>It plays once round while it records, so it gets exactly what you hear (effects too).</p>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn" disabled={!!busy || song} onClick={() => void go('loop')} data-testid="bounce-loop"><Ico n="loop" /> Bounce into one loop</button>
        <button className="btn" disabled={!!busy || song} onClick={() => void go('pad')} data-testid="bounce-pad">Bounce onto a pad</button>
      </div>
      {song && <p className="small muted" style={{ margin: 0 }}>Bouncing records one part: turn the song off (Controls → Song) to bounce the part you're editing.</p>}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary" disabled={!!busy} onClick={() => void go('save')} data-testid="export"><Ico n="file" /> Save as audio (WAV)</button>
        <label className="ex-check"><input type="checkbox" checked={stems} onChange={e => setStems(e.target.checked)} /> Each part on its own too (stems)</label>
      </div>
      {busy && (
        <p className="small" role="status" style={{ margin: 0 }}>
          {busy === 'save' ? 'Saving' : 'Bouncing'}: recording the next time round… {secs > 0 ? `${secs.toFixed(1)} s` : ''}
          <button className="btn sm ghost" onClick={() => { sig.current.cancelled = true; setBusy(null) }}>Cancel</button>
        </p>
      )}
      {msg && <p className="small" role="status" style={{ margin: 0 }} data-testid="bounce-msg">{msg} {undoB && <button className="btn sm" onClick={undo}>↶ Undo the bounce</button>}</p>}
    </Win>
  )
}
