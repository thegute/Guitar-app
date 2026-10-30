// Tools: tuner, metronome, chord library and scales, behind one tab.
import { TunerScreen } from './TunerScreen'
import { MetronomeScreen } from './MetronomeScreen'
import { ChordsScreen } from './ChordsScreen'
import { ScalesScreen } from './ScalesScreen'
import type { ToolPage } from '../nav'
import { PsyPic } from '../components/PsyArt'

const PAGES: { id: ToolPage; label: string }[] = [
  { id: 'tuner', label: 'Tuner' },
  { id: 'metronome', label: 'Tempo' },
  { id: 'chords', label: 'Chords' },
  { id: 'scales', label: 'Scales' },
]

/** `jump` changes when search has set a tool up (a chord, a scale, a tempo, a tuning): the page opens afresh to read it. */
export function ToolsScreen({ page, onPage, scaleJump, jump = 0 }: { page: ToolPage; onPage: (p: ToolPage) => void; scaleJump: { root: string; scale: string } | null; jump?: number }) {
  return (
    <div className="tools">
      {page === 'tuner' ? <PsyPic id="dragon" at="30% 45%" className="tools-art" /> : page === 'metronome' ? <PsyPic id="vortex" at="50% 50%" className="tools-art" />
        : page === 'chords' ? <PsyPic id="shrooms" at="50% 52%" className="tools-art" /> : <PsyPic id="waves" at="40% 50%" className="tools-art" />}
      <div className="subtabs tools-switch" role="tablist" aria-label="Tools" style={{ ['--n' as string]: PAGES.length }}>
        {PAGES.map(p => (
          <button key={p.id} role="tab" aria-selected={page === p.id} onClick={() => onPage(p.id)}>{p.label}</button>
        ))}
      </div>
      {page === 'tuner' && <TunerScreen key={jump} />}
      {page === 'metronome' && <MetronomeScreen key={jump} />}
      {page === 'chords' && <ChordsScreen key={jump} />}
      {page === 'scales' && <ScalesScreen key={(scaleJump ? scaleJump.root + scaleJump.scale : 'scales') + jump} initial={scaleJump ?? undefined} />}
    </div>
  )
}
