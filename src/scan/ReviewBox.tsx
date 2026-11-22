// "Send for review" under a scan result: tick what went wrong, write a line if you like, then keep it for later or send
// now. And the line at the top of the Riff Scanner that sends every waiting scan at once.
import { useEffect, useState } from 'react'
import { Ico } from '../components/Icon'
import type { SongDoc } from '../tabs/library'
import { addReview, clearReviews, listReviews, onReviewsChange, PROBLEMS, sendReviews, type Problem } from './review'
import type { ScanOut } from './ScanParts'

export function useReviewCount() {
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    const load = () => { void listReviews().then(l => { if (live) setN(l.length) }) }
    load()
    const off = onReviewsChange(load)
    return () => { live = false; off() }
  }, [])
  return n
}

/** send everything waiting; after the share sheet closes, ask before clearing them from the phone */
function useSender() {
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState<string[] | null>(null)
  const send = async () => {
    try {
      const r = await sendReviews()
      if (!r.count) { setMsg('Nothing waiting to send.'); return }
      setSent(r.ids)
      setMsg(`${r.count} scan${r.count > 1 ? 's' : ''} put in one file (${r.name}). Save it to Drive or send it, then drop it into our chat.`)
    } catch (e) { setMsg(e instanceof Error && /cancel/i.test(e.message) ? 'Not sent: they are still waiting on the phone.' : 'It could not make the file. They are still waiting on the phone.') }
  }
  const clear = async () => { if (sent) await clearReviews(sent); setSent(null); setMsg('Cleared from the phone.') }
  return { msg, sent, send, clear, keep: () => { setSent(null); setMsg('Kept on the phone too.') } }
}

export function ReviewBox({ out, doc, onClose }: { out: ScanOut; doc: SongDoc; onClose: () => void }) {
  const [picked, setPicked] = useState<Problem[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const s = useSender()
  const toggle = (p: Problem) => setPicked(l => (l.includes(p) ? l.filter(x => x !== p) : [...l, p]))
  const save = async (andSend: boolean) => {
    setBusy(true)
    try {
      await addReview({
        title: doc.title, source: doc.youtube ?? out.doc.youtube ?? undefined, how: out.how, instrument: doc.inst ?? 'guitar',
        tuning: doc.song.tracks[0]?.tuning ?? [], problems: picked, note: note.trim(), first: out.doc.song, now: doc.song,
        text: out.text, heard: out.heard, sources: out.sources, strips: out.strips, barTimes: out.barTimes,
      })
      setDone(true)
      if (andSend) await s.send()
    } finally { setBusy(false) }
  }
  return (
    <div className="panel stack review-box" style={{ gap: 8 }} data-testid="scan-review-box">
      <b>What went wrong?</b>
      {!done ? (
        <>
          <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
            {PROBLEMS.map(p => (
              <button key={p} className={`btn sm${picked.includes(p) ? ' primary' : ' ghost'}`} aria-pressed={picked.includes(p)} onClick={() => toggle(p)}>{p}</button>
            ))}
          </div>
          <textarea className="input" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="A line or two, if you like: e.g. 'bar 3 should be 7-5-7 on the G string', 'it skipped the second half'"
            aria-label="What went wrong, in your words" data-testid="scan-review-note" />
          <span className="small muted">It keeps the pictures KGuitar read, the tab as it first read it and as you fixed it, and where it came from. Your fixes count as the right answers.</span>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button className="btn sm" disabled={busy} onClick={() => void save(false)} data-testid="scan-review-save"><Ico n="flag" /> Save for later</button>
            <button className="btn sm primary" disabled={busy} onClick={() => void save(true)} data-testid="scan-review-send"><Ico n="send" /> Send now</button>
            <button className="btn sm ghost" onClick={onClose}>Cancel</button>
          </div>
        </>
      ) : (
        <span className="small" data-testid="scan-review-saved">Saved on the phone. {s.msg || 'Send it whenever you have a minute: the Riff Scanner shows how many are waiting.'}</span>
      )}
      {s.sent && <SentChoice onClear={() => void s.clear()} onKeep={s.keep} />}
    </div>
  )
}

function SentChoice({ onClear, onKeep }: { onClear: () => void; onKeep: () => void }) {
  return (
    <div className="row small" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <span>Sent them? Clear them from the phone:</span>
      <button className="btn sm" onClick={onClear} data-testid="scan-review-clear">Yes, clear</button>
      <button className="btn sm ghost" onClick={onKeep}>Keep them</button>
    </div>
  )
}

/** "3 scans waiting for review · Send them" at the top of the Riff Scanner */
export function ReviewsWaiting() {
  const n = useReviewCount()
  const s = useSender()
  if (!n && !s.msg) return null
  return (
    <div className="notice small row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }} data-testid="scan-reviews-waiting">
      {n > 0 && <span style={{ flex: '1 1 200px' }}><Ico n="flag" /> {n} scan{n > 1 ? 's' : ''} waiting for review</span>}
      {n > 0 && <button className="btn sm primary" onClick={() => void s.send()} data-testid="scan-reviews-send"><Ico n="send" /> Send {n > 1 ? 'them' : 'it'}</button>}
      {s.msg && <span style={{ flex: '1 1 100%' }}>{s.msg}</span>}
      {s.sent && <SentChoice onClear={() => void s.clear()} onKeep={s.keep} />}
    </div>
  )
}
