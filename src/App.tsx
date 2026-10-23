import { useEffect, useState, type JSX } from 'react'
import { TunerScreen } from './screens/TunerScreen'
import { MetronomeScreen } from './screens/MetronomeScreen'
import { ChordsScreen } from './screens/ChordsScreen'
import { ScalesScreen } from './screens/ScalesScreen'
import { JamScreen } from './screens/JamScreen'
import { PlayScreen } from './screens/PlayScreen'
import { LearnScreen } from './learn/LearnScreen'
import { CelebrationLayer } from './learn/Celebration'
import { IconChord, IconLearn, IconMetronome, IconProgression, IconScale, IconTab, IconTuner } from './components/Icons'
import { usePersist } from './components/Controls'
import { useInstrument } from './instrument'
import { onGo, type Tab } from './nav'
import { dailyGoalMin, todayLog, useProgress } from './learn/progress'

const TABS: { id: Tab; label: string; icon: () => JSX.Element }[] = [
  { id: 'play', label: 'Play', icon: IconTab },
  { id: 'learn', label: 'Learn', icon: IconLearn },
  { id: 'progressions', label: 'Jam', icon: IconProgression },
  { id: 'chords', label: 'Chords', icon: IconChord },
  { id: 'scales', label: 'Scales', icon: IconScale },
  { id: 'metronome', label: 'Tempo', icon: IconMetronome },
  { id: 'tuner', label: 'Tuner', icon: IconTuner },
]

export default function App() {
  const [tab, setTab] = usePersist<Tab>('tab2', 'play')
  const [scaleJump, setScaleJump] = useState<{ root: string; scale: string } | null>(null)
  const inst = useInstrument()
  useProgress()
  useEffect(() => onGo(t => { setTab(t); document.getElementById('main')?.scrollTo({ top: 0 }) }), [setTab])
  const d = todayLog()
  const goalDone = d.guitar + d.study >= dailyGoalMin() * 60

  return (
    <div className="app">
      <main className={`main${tab === 'play' ? ' main-play' : ''}`} id="main">
        {tab === 'play' && <PlayScreen key={inst.id} />}
        {tab === 'learn' && <LearnScreen key={inst.id} />}
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
            <span className="nav-icon">
              <t.icon />
              {t.id === 'learn' && <i className={`nav-badge${goalDone ? ' done' : ''}`} aria-label={goalDone ? "today's goal done" : "today's goal not done yet"}>{goalDone ? '✓' : ''}</i>}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
      <CelebrationLayer />
    </div>
  )
}
