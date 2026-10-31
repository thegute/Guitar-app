// A tab shown on screen in a video (or a photo of a tab book): take a screenshot, and the AI reads it into a real tab
// you can play along with. Much more accurate than listening to the whole song through the mic.
import { useState } from 'react'
import { useInstrument } from '../instrument'
import { songFromText } from '../tabs/importer'
import type { SongDoc } from '../tabs/library'
import { AiSetup } from './AiSetup'
import { activeProvider, ask, AiError } from './providers'

const SYSTEM = `You read guitar or ukulele tablature from pictures (screenshots of video lessons, tab books, websites).
Write out exactly what the picture shows as plain ASCII tab, one system after another, nothing else:
- one line per string, highest string first, each starting with its name and | (e|, B|, G|, D|, A|, E| for standard guitar)
- frets as numbers, - for space, | for bar lines; keep the spacing so notes that line up in the picture line up here
- keep techniques the picture shows: h hammer-on, p pull-off, / and \\ slides, b bend, r release, ~ vibrato, x dead note
- if chord names are written above the tab, put them on a line above in the same columns
- if several pictures or systems follow on from each other, continue in order
Never invent notes you can't see. If a part is unreadable, leave it as dashes. If there is no tab in the picture, answer only: NO TAB`

export function TabFromPicture({ youtube, onOpen }: { youtube?: string; onOpen: (doc: SongDoc) => void }) {
  const inst = useInstrument()
  const [pics, setPics] = useState<{ name: string; mime: string; b64: string; url: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [text, setText] = useState('')
  const [setup, setSetup] = useState(false)
  const ready = !!activeProvider(undefined, true)
  const add = async (files: FileList | null) => {
    if (!files) return
    const out = [...pics]
    for (const f of [...files].slice(0, 6)) {
      const b = new Uint8Array(await f.arrayBuffer())
      let bin = ''
      for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000))
      out.push({ name: f.name, mime: f.type || 'image/png', b64: btoa(bin), url: URL.createObjectURL(f) })
    }
    setPics(out.slice(0, 6))
    setText('')
    setMsg('')
  }
  const read = async () => {
    if (!pics.length) return
    setBusy(true)
    setMsg('Reading the tab…')
    try {
      let all = ''
      for (const [i, p] of pics.entries()) {
        const t = (await ask(SYSTEM, [{ role: 'user', text: `Picture ${i + 1} of ${pics.length}. Write out the tab.`, image: { mime: p.mime, b64: p.b64 } }], { pictures: true, maxTokens: 3000 })).replace(/```[a-z]*\n?|```/g, '').trim()
        if (!/^NO TAB/i.test(t)) all += (all ? '\n\n' : '') + t
      }
      if (!all) { setMsg("I couldn't find a tab in that picture. Try a sharper screenshot with the tab filling more of the screen."); setBusy(false); return }
      setText(all)
      setMsg('Here it is. Check it against the picture, fix anything in the box, then open it.')
    } catch (e) { setMsg(e instanceof AiError ? e.message : 'Something went wrong reading the picture.') }
    setBusy(false)
  }
  const open = () => {
    const doc = songFromText(text, 'Tab from a screenshot', inst, youtube)
    if (!doc) { setMsg("That doesn't read as a tab yet: check each line starts with the string name and |."); return }
    onOpen(doc)
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <p className="small muted" style={{ margin: 0 }}>Is the tab shown on screen in the video? Pause it, take a screenshot (or a few, in order), and add them here. The AI reads them into a tab you can play along with, with the video beside it. This is far more accurate than listening.</p>
      {!ready && (
        <div className="notice small">Reading pictures needs a free Google Gemini key (takes a minute, no card). <button className="btn sm" onClick={() => setSetup(!setup)}>{setup ? 'Close' : 'Set it up'}</button></div>
      )}
      {setup && !ready && <AiSetup compact />}
      <div className="row" style={{ gap: 8 }}>
        <label className="btn">📷 Add screenshots<input type="file" accept="image/*" multiple hidden onChange={e => { void add(e.target.files); e.target.value = '' }} /></label>
        {pics.length > 0 && <button className="btn primary" disabled={busy || !ready} onClick={() => void read()}>{busy ? 'Reading…' : 'Read the tab'}</button>}
        {pics.length > 0 && <button className="btn ghost sm" onClick={() => { setPics([]); setText(''); setMsg('') }}>Clear</button>}
      </div>
      {pics.length > 0 && <div className="pic-strip">{pics.map((p, i) => <img key={i} src={p.url} alt={`Screenshot ${i + 1}`} />)}</div>}
      {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
      {text && (
        <>
          <textarea className="input tab-text" value={text} onChange={e => setText(e.target.value)} rows={Math.min(24, text.split('\n').length + 1)} spellCheck={false} aria-label="The tab it read" />
          <button className="btn primary" onClick={open}>Open in Play</button>
        </>
      )}
    </div>
  )
}
