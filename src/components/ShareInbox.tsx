// What happened to something you shared into KGuitar from another app.
import { useEffect, useState } from 'react'
import { onShared, type ShareResult } from '../shareIn'
import { go, openInPlay } from '../nav'
import { useInstrument } from '../instrument'

export function ShareInbox() {
  const [r, setR] = useState<ShareResult | null>(null)
  const inst = useInstrument()
  useEffect(() => onShared(setR), [])
  if (!r) return null
  const close = () => setR(null)
  return (
    <div className="sheet-backdrop" onClick={close}>
      <div className="sheet confirm" role="dialog" aria-modal="true" aria-label="Shared into KGuitar" onClick={e => e.stopPropagation()}>
        {r.kind === 'songs' && (
          <>
            <h2 style={{ margin: 0 }}>{r.docs.length ? (r.docs.length === 1 ? `Added "${r.docs[0].title}"` : `Added ${r.docs.length} songs`) : "Couldn't read that"}</h2>
            {r.docs.length > 0 && <p className="small" style={{ margin: 0 }}>Saved to your {inst.label.toLowerCase()} songs{r.docs.some(d => d.source === 'chords') ? ' as a chord sheet you can strum along to' : ''}.</p>}
            {r.failed.length > 0 && <p className="small muted" style={{ margin: 0 }}>Couldn't read {r.failed.join(', ')}. KGuitar opens Guitar Pro files and text tabs or chord sheets.</p>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={close}>OK</button>
              {r.docs.length > 0 && <button className="btn primary" onClick={() => { openInPlay(r.docs[0]); close() }}>Open in Play</button>}
            </div>
          </>
        )}
        {r.kind === 'video' && (
          <>
            <h2 style={{ margin: 0 }}>{r.song ? 'Video added' : 'Open a song first'}</h2>
            <p className="small" style={{ margin: 0 }}>{r.song ? `The video is now attached to "${r.song}" in Play.` : 'Open the song in Play, then share the video again (or paste the link under the tab).'}</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={close}>OK</button>
              {r.song && <button className="btn primary" onClick={() => { go('play'); close() }}>Go to Play</button>}
            </div>
          </>
        )}
        {r.kind === 'link' && (
          <>
            <h2 style={{ margin: 0 }}>That's a link, not the tab</h2>
            <p className="small" style={{ margin: 0 }}>
              {r.site} only shares the page's address, and KGuitar can't read tabs from websites. On the page, press and hold on the tab text,
              choose <b>Select all</b> (or drag over the tab), then <b>Share → KGuitar</b>. Or tap <b>Copy</b> and use <b>Paste from clipboard</b> in Songs.
              Guitar Pro files you download can be shared to KGuitar too.
            </p>
            <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn primary" onClick={close}>Got it</button></div>
          </>
        )}
        {r.kind === 'nothing' && (
          <>
            <h2 style={{ margin: 0 }}>No tab found</h2>
            <p className="small" style={{ margin: 0 }}>KGuitar couldn't find tab lines or chords in what was shared. Share the whole tab or chord sheet text, a Guitar Pro file, or a YouTube link.</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn primary" onClick={close}>OK</button></div>
          </>
        )}
      </div>
    </div>
  )
}
