import { useState, type JSX } from 'react'
import { TunerScreen } from './screens/TunerScreen'
import { MetronomeScreen } from './screens/MetronomeScreen'
import { ChordsScreen } from './screens/ChordsScreen'
import { ScalesScreen } from './screens/ScalesScreen'
import { JamScreen } from './screens/JamScreen'
import { PlayScreen } from './screens/PlayScreen'
import { IconChord, IconMetronome, IconProgression, IconScale, IconTab, IconTuner } from './components/Icons'
import { usePersist } from './components/Controls'

type Tab = 'play' | 'tuner' | 'metronome' | 'chords' | 'scales' | 'progressions'
const TABS: { id: Tab; label: string; icon: () => JSX.Element }[] = [
  { id: 'play', label: 'Play', icon: IconTab },
  { id: 'progressions', label: 'Jam', icon: IconProgression },
  { id: 'chords', label: 'Chords', icon: IconChord },
  { id: 'scales', label: 'Scales', icon: IconScale },
  { id: 'metronome', label: 'Tempo', icon: IconMetronome },
  { id: 'tuner', label: 'Tuner', icon: IconTuner },
]

export default function App() {
  const [tab, setTab] = usePersist<Tab>('tab2', 'play')
  const [scaleJump, setScaleJump] = useState<{ root: string; scale: string } | null>(null)

  return (
    <div className="app">
      <main className={`main${tab === 'play' ? ' main-play' : ''}`} id="main">
        {tab === 'play' && <PlayScreen />}
        {tab === 'tuner' && <TunerScreen />}
        {tab === 'metronome' && <MetronomeScreen />}
        {tab === 'chords' && <ChordsScreen />}
        {tab === 'scales' && <ScalesScreen key={scaleJump ? scaleJump.root + scaleJump.scale : 'scales'} initial={scaleJump ?? undefined} />}
        {tab === 'progressions' && (
          <JamScreen onOpenScale={(root, scale) => { setScaleJump({ root, scale }); setTab('scales') }} />
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
