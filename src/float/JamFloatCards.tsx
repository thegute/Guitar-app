// Lazy-loaded Floating Popup Bodies for Universal "Open in..." / "Send to..." Windows:
// - StrumFloatBody   : AI Strum Machine (47 styles, Backing Vol, Band Sliders, Intro/Verse/Chorus/Solo)
// - BeatsFloatBody   : AI Beat Maker (Jam Stage + Beat Studio, 47 styles, Backing Vol, Record Guitar/Pads)
// - LooperFloatBody  : 4-Track Guitar Looper
// - FlowFloatBody    : Harmonic Flow Coach
// - ScannerFloatBody : Riff Scanner (YouTube / audio)
// - PlayTabFloatBody : Floating Tab Preview (for the "⧉ Float" button beside "Open in Play")
import { lazy, Suspense, useEffect, useState } from 'react'
import { TabView } from '../components/TabView'
import { getFloatTabDoc, onFloatTabDoc } from './bus'
import { openInPlay } from '../nav'
import type { SongDoc } from '../tabs/library'

const LazyStrumGrid = lazy(() => import('../components/StrumGrid').then(m => ({ default: m.StrumGrid })))
const LazyStudioScreen = lazy(() => import('../studio/StudioScreen').then(m => ({ default: m.StudioScreen })))
const LazyLooperPanel = lazy(() => import('../looper/LooperPanel').then(m => ({ default: m.LooperPanel })))
const LazyFlowCoach = lazy(() => import('../components/HarmonicFlowCoach').then(m => ({ default: m.HarmonicFlowCoach })))
const LazyRiffScanner = lazy(() => import('../scan/RiffScanner').then(m => ({ default: m.RiffScanner })))

const loading = (name: string) => <p className="small muted" style={{ padding: 12 }}>Loading {name}…</p>

export function StrumFloatBody() {
  return (
    <div className="fc-page-wrap" data-testid="fc-strum">
      <Suspense fallback={loading('AI Strum Machine')}>
        <LazyStrumGrid compact />
      </Suspense>
    </div>
  )
}

export function BeatsFloatBody() {
  return (
    <div className="fc-page-wrap" data-testid="fc-beats">
      <Suspense fallback={loading('AI Beat Maker')}>
        <LazyStudioScreen active compact />
      </Suspense>
    </div>
  )
}

export function LooperFloatBody() {
  return (
    <div className="fc-page-wrap" data-testid="fc-looper">
      <Suspense fallback={loading('4-Track Looper')}>
        <LazyLooperPanel />
      </Suspense>
    </div>
  )
}

export function FlowFloatBody() {
  return (
    <div className="fc-page-wrap" data-testid="fc-flow">
      <Suspense fallback={loading('Harmonic Flow')}>
        <LazyFlowCoach />
      </Suspense>
    </div>
  )
}

export function ScannerFloatBody() {
  return (
    <div className="fc-page-wrap" data-testid="fc-scanner">
      <Suspense fallback={loading('Riff Scanner')}>
        <LazyRiffScanner listen={<p className="small muted">Tap ↗ in the corner for full audio transcription &amp; mic chord listening.</p>} />
      </Suspense>
    </div>
  )
}

const EMPTY_STATES = new Uint8Array(0)

export function PlayTabFloatBody() {
  const [doc, setDoc] = useState<SongDoc | null>(() => getFloatTabDoc<SongDoc>())
  useEffect(() => onFloatTabDoc(() => setDoc(getFloatTabDoc<SongDoc>())), [])

  if (!doc) {
    return (
      <div className="fc-empty" data-testid="fc-playtab">
        Tap <b>⧉ Float Tab</b> beside any “Open in Play” button to preview a tab right over your Jam or Scales screen.
      </div>
    )
  }

  const track = doc.song.tracks[0]
  return (
    <div className="fc-page-wrap stack" style={{ gap: 8 }} data-testid="fc-playtab">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <div>
          <strong style={{ fontSize: 13 }}>{doc.title}</strong>
          <span className="small muted" style={{ marginLeft: 6 }}>{doc.song.tempo} BPM · {track?.bars.length ?? 0} bars</span>
        </div>
        <button className="btn sm primary" onClick={() => openInPlay(doc)}>
          ↗ Open Full Play
        </button>
      </div>
      {track && (
        <div style={{ maxHeight: 340, overflow: 'auto' }}>
          <TabView
            track={track}
            mode="fret"
            flats={false}
            cursor={-1}
            playing={false}
            states={EMPTY_STATES}
            version={0}
            spans={[]}
            onTap={() => {}}
          />
        </div>
      )}
    </div>
  )
}
