// "Take the voice out first": before a file, a video's sound or a recording is turned into notes, the voice model
// (HT-Demucs, the same one Get a sound uses) takes the singing and talking out, so a lesson's chatter or a song's vocal
// line doesn't turn into wrong notes. One switch shared by the Riff Scanner and Notes from a recording.
import { useEffect, useState } from 'react'
import { usePersist } from '../components/Controls'
import { downloadModels, haveModel, MODELS } from '../ml/models'

export const VOICE_OUT_KEY = 'scanVoiceOut'
/** Longest sound the voice is taken out of (longer ones scan as they are: it would take too long on a phone). */
export const VOICE_OUT_MAX_SECS = 150

export function useVoiceOut() { return usePersist(VOICE_OUT_KEY, false) }

export function VoiceOutToggle() {
  const [on, setOn] = useVoiceOut()
  const [have, setHave] = useState<boolean | null>(null)
  const [dl, setDl] = useState<number | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { void haveModel('voice').then(setHave).catch(() => setHave(false)) }, [])
  const mb = Math.round(MODELS.voice.files.reduce((t, f) => t + f.bytes, 0) / 1e6)
  const get = async () => {
    setDl(0); setErr('')
    try { await downloadModels(['voice'], setDl); setHave(true) } catch (e) { setErr(e instanceof Error ? e.message : 'The download stopped.') }
    setDl(null)
  }
  return (
    <div className="stack voice-out" style={{ gap: 4 }} data-testid="voice-out">
      <label className="row small" style={{ gap: 6, alignItems: 'center' }}>
        <input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} data-testid="voice-out-toggle" />
        <span>Take the voice out first <span className="muted">(singing or talking over the guitar: files and videos)</span></span>
      </label>
      {on && have === false && (
        <span className="row small" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="muted">Needs the voice model once ({mb} MB, kept on this device).</span>
          {dl === null ? <button className="btn sm" onClick={() => void get()} data-testid="voice-out-get">Download</button> : <b>{Math.round(dl * 100)}%</b>}
        </span>
      )}
      {err && <span className="small" role="status">{err}</span>}
    </div>
  )
}
