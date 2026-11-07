// The sound-scan engine wired for a screen (Riff Scanner → Scan a video, Listen → Notes from a recording): run it,
// show its steps, then its result card with the better version / AI second opinion / model download as they come.
import { useEffect, useRef, useState } from 'react'
import { useInstrument } from '../instrument'
import { usePersist } from '../components/Controls'
import { SoundScan, type ScanState } from './soundScan'
import { ScanProgress, ScanResult, setStage, type Stage } from './ScanParts'
import { downloadModels, haveModel, releaseModels } from '../ml/models'
import { useVoiceOut, VOICE_OUT_MAX_SECS } from './VoiceOut'

export function useSoundScan(youtube?: string) {
  const inst = useInstrument()
  const scan = useRef<SoundScan | null>(null)
  const [live, setLive] = useState<ScanState | null>(null)
  const [sound, setSound] = useState<{ x: Float32Array; sr: number } | null>(null)
  const [dl, setDl] = useState<{ pct: number; error: string } | null>(null)
  const [stages, setStages] = useState<Stage[] | null>(null)
  const [msg, setMsg] = useState('')
  const [keepSinging] = usePersist('finderSinging', false)
  const [voiceOut] = useVoiceOut()
  const iso = useRef<AbortController | null>(null)
  useEffect(() => () => { scan.current?.cancel(); iso.current?.abort(); releaseModels() }, [])

  const reset = () => { scan.current?.cancel(); iso.current?.abort(); scan.current = null; setLive(null); setSound(null); setDl(null); setStages(null); setMsg('') }
  /** Scan this sound. `done` = steps that already happened (shown ticked). Resolves when the first result is up. */
  async function run(x: Float32Array, sr: number, title: string, source: string, done: Stage[] = [], yt?: string): Promise<boolean> {
    scan.current?.cancel()
    setMsg(''); setLive(null)
    // the voice out first (a file or a video's sound; never a quick mic take of your own playing)
    if (voiceOut && !source.startsWith('what you recorded') && x.length / sr <= VOICE_OUT_MAX_SECS && (await haveModel('voice').catch(() => false))) {
      const c = (iso.current = new AbortController())
      const st: Stage = { id: 'voice', label: 'Taking the singing and talking out', state: 'run' }
      setStages([...done, st])
      try {
        const { isolate } = await import('../ml/voice')
        const r = await isolate([x], sr, { signal: c.signal, onProgress: (pct, note) => setStages(s => (s ? setStage(s, 'voice', { state: 'run', pct, note }) : s)) })
        const m = new Float32Array(r.rest[0].length)
        for (let i = 0; i < m.length; i++) m[i] = (r.rest[0][i] + r.rest[1][i]) * 0.5
        x = m; sr = r.sr
        done = [...done, { ...st, state: 'done', note: `${Math.round(r.secs)} s` }]
      } catch (e) {
        if (c.signal.aborted) { setStages(null); setMsg('Cancelled.'); return false }
        done = [...done, { ...st, state: 'done', note: "couldn't: scanned as it is" }]
        void e
      }
    }
    setStages([...done, { id: 'beats', label: 'Finding the beats and tempo', state: 'run' }, { id: 'draft', label: 'Quick draft of the notes', state: 'wait' }])
    setSound({ x, sr })
    const sc = new SoundScan({ x, sr, title, inst, youtube: yt ?? youtube, source, keepSinging }, st => setLive(st), (id, p) => setStages(s => (s ? setStage(s, id, p) : s)))
    scan.current = sc
    try {
      await sc.start()
      setStages(null)
      const st = sc.state
      if (!st.draft && !st.better && st.betterPass !== 'running' && st.ai !== 'running') throw new Error("I didn't hear clear guitar notes in it. A solo guitar part works best.")
      return true
    } catch (e) {
      setLive(null)
      setStages(null)
      setMsg(e instanceof Error ? (/Cancelled/.test(e.message) ? 'Cancelled.' : e.message) : 'Something went wrong.')
      return false
    }
  }
  const getModels = async () => {
    setDl({ pct: 0, error: '' })
    try {
      await downloadModels(['notes', 'beats'], pct => setDl({ pct, error: '' }))
      setDl(null)
      void scan.current?.runBetter()
    } catch (e) { setDl({ pct: 0, error: e instanceof Error ? e.message : 'The download stopped.' }) }
  }

  /** The steps while it runs, then the result (null when nothing to show). */
  function view(o: { onUseInJam?: (chords: string[]) => void; onAgain: () => void }) {
    if (stages) return <ScanProgress stages={stages} onCancel={() => { scan.current?.cancel(); iso.current?.abort(); setStages(null); setMsg('Cancelled.') }} />
    const first = live?.draft ?? live?.better
    if (live && first) {
      const sc = scan.current
      return (
        <ScanResult key={first.id} onUseInJam={o.onUseInJam} onAgain={() => { reset(); o.onAgain() }}
          out={{ doc: first, heard: true, how: live.how, sound: sound ?? undefined, check: live.draft ? live.check.draft : live.check.better }}
          live={{
            better: live.draft ? live.better : null, betterPass: live.betterPass, betterPct: live.betterPct, betterNote: live.betterNote, betterCheck: live.check.better,
            needModels: live.needModels, askLong: live.askLong, aiNote: live.aiNote, ai: live.ai,
            onLong: go => sc?.answerLong(go), onGetModels: () => void getModels(), download: dl,
          }} />
      )
    }
    if (live && live.betterPass === 'running') {
      return <ScanProgress stages={[{ id: 'better', label: 'The guitar-note model is listening (the quick draft heard nothing clear)', state: 'run', pct: live.betterPct, note: live.betterNote }]} onCancel={() => { reset(); o.onAgain() }} />
    }
    return null
  }
  return { run, view, reset, msg, busy: !!stages }
}
