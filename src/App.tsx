import { useState, type JSX } from 'react'
import { TunerScreen } from './screens/TunerScreen'
import { MetronomeScreen } from './screens/MetronomeScreen'
import { ChordsScreen } from './screens/ChordsScreen'
import { ScalesScreen } from './screens/ScalesScreen'
import { ProgressionsScreen } from './screens/ProgressionsScreen'
import { IconChord, IconMetronome, IconProgression, IconScale, IconTuner } from './components/Icons'
import { usePersist } from './components/Controls'

type Tab = 'tuner' | 'metronome' | 'chords' | 'scales' | 'progressions'
const TABS: { id: Tab; label: string; icon: () => JSX.Element }[] = [
  { id: 'progressions', label: 'Jam', icon: IconProgression },
  { id: 'chords', label: 'Chords', icon: IconChord },
  { id: 'scales', label: 'Scales', icon: IconScale },
  { id: 'metronome', label: 'Metronome', icon: IconMetronome },
  { id: 'tuner', label: 'Tuner', icon: IconTuner },
]

export default function App() {
  const [tab, setTab] = usePersist<Tab>('tab', 'progressions')
  const [scaleJump, setScaleJump] = useState<{ root: string; scale: string } | null>(null)

  return (
    <div className="app">
      <main className="main" id="main">
        {tab === 'tuner' && <TunerScreen />}
        {tab === 'metronome' && <MetronomeScreen />}
        {tab === 'chords' && <ChordsScreen />}
        {tab === 'scales' && <ScalesScreen key={scaleJump ? scaleJump.root + scaleJump.scale : 'scales'} initial={scaleJump ?? undefined} />}
        {tab === 'progressions' && (
          <ProgressionsScreen onOpenScale={(root, scale) => { setScaleJump({ root, scale }); setTab('scales') }} />
        )}
      </main>
      <nav className="nav" aria-label="Sections">
        {TABS.map(t => (
          <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <t.icon />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
