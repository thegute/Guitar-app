// The teach-back box: explain it in your own words, then Check: the points you covered get a tick, the ones you
// missed are shown. Works without an AI key; with one, "Explain it to the teacher" asks follow-up questions too.
import { useState } from 'react'
import { askAssistant } from '../assistant/bus'
import { bestTeachBack, gradeTeachBack, saveTeachBack, type TeachResult } from './teachGrade'
import { countUse } from '../usage'

export function TeachBack({ id, title, points, prompt }: { id: string; title: string; points: string[]; prompt?: string }) {
  const [text, setText] = useState('')
  const [res, setRes] = useState<TeachResult | null>(null)
  const best = bestTeachBack(id)
  return (
    <div className="teach-back stack" style={{ gap: 6 }} data-testid="teach-back">
      <label className="field"><span>Explain {title} in your own words, as if teaching a friend{best ? ` (best so far: ${best}%)` : ''}</span>
        <textarea className="input" rows={4} value={text} onChange={e => { setText(e.target.value); setRes(null) }} placeholder="Type it, or use your keyboard's microphone to say it." data-testid="teach-text" />
      </label>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn sm primary" data-testid="teach-check" onClick={() => { const r = gradeTeachBack(text, points); setRes(r); if (text.trim()) { saveTeachBack(id, r.score); countUse('coach:teach-back') } }}>Check my explanation</button>
        {prompt && <button className="btn sm" onClick={() => askAssistant(prompt + (text.trim() ? `\n\nMy explanation: ${text}` : ''), 'general')}>Explain it to the teacher</button>}
      </div>
      {res && (
        <div className="teach-res" role="status">
          <p className="small" style={{ margin: 0 }} data-testid="teach-say"><b>{res.score}%.</b> {res.say}</p>
          <ul className="small teach-points">
            {res.covered.map((p, i) => <li key={'c' + i} className="ok">✓ {p}</li>)}
            {res.missed.map((p, i) => <li key={'m' + i} className="miss">○ {p}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
