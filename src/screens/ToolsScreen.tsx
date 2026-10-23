// Tools: tuner, metronome, chord library and scales, behind one tab.
import { TunerScreen } from './TunerScreen'
import { MetronomeScreen } from './MetronomeScreen'
import { ChordsScreen } from './ChordsScreen'
import { ScalesScreen } from './ScalesScreen'
import type { ToolPage } from '../nav'

const PAGES: { id: ToolPage; label: string }[] = [
  { id: 'tuner', label: 'Tuner' },
  { id: 'metronome', label: 'Tempo' },
  { id: 'chords', label: 'Chords' },
  { id: 'scales', label: 'Scales' },
]

export function ToolsScreen({ page, onPage, scaleJump }: { page: ToolPage; onPage: (p: ToolPage) => void; scaleJump: { root: string; scale: string } | null }) {
  return (
    <div className="tools">
      <div className="tools-switch" role="tablist" aria-label="Tools">
        {PAGES.map(p => (
          <button key={p.id} role="tab" aria-selected={page === p.id} onClick={() => onPage(p.id)}>{p.label}</button>
        ))}
      </div>
      {page === 'tuner' && <TunerScreen />}
      {page === 'metronome' && <MetronomeScreen />}
      {page === 'chords' && <ChordsScreen />}
      {page === 'scales' && <ScalesScreen key={scaleJump ? scaleJump.root + scaleJump.scale : 'scales'} initial={scaleJump ?? undefined} />}
    </div>
  )
}
