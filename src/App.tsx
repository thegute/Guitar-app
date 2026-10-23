import { useEffect, useState, type JSX } from 'react'
import { JamScreen } from './screens/JamScreen'
import { PlayScreen } from './screens/PlayScreen'
import { ToolsScreen } from './screens/ToolsScreen'
import { LearnScreen } from './learn/LearnScreen'
import { CelebrationLayer } from './learn/Celebration'
import { IconLearn, IconProgression, IconTab, IconTools } from './components/Icons'
import { usePersist } from './components/Controls'
import { useInstrument } from './instrument'
import { isToolPage, onGo, type Tab, type ToolPage } from './nav'
import { dailyGoalMin, todayLog, useProgress } from './learn/progress'
import { ACTION_LABEL, onPedal, type PedalAction } from './controls/pedals'
import { ShareInbox } from './components/ShareInbox'

const TABS: { id: Tab; label: string; icon: () => JSX.Element }[] = [
  { id: 'play', label: 'Play', icon: IconTab },
  { id: 'learn', label: 'Learn', icon: IconLearn },
  { id: 'progressions', label: 'Jam', icon: IconProgression },
  { id: 'tools', label: 'Tools', icon: IconTools },
]

export default function App() {
  const [saved, setTab] = usePersist<string>('tab2', 'play')
  const [toolPage, setToolPage] = usePersist<ToolPage>('toolPage', isToolPage(saved) ? saved : 'tuner')
  // older versions had Tuner, Tempo, Chords and Scales as their own tabs
  const tab: Tab = isToolPage(saved) ? 'tools' : (['play', 'learn', 'progressions', 'tools'].includes(saved) ? saved as Tab : 'play')
  const [scaleJump, setScaleJump] = useState<{ root: string; scale: string } | null>(null)
  const inst = useInstrument()
  useProgress()
  useEffect(() => onGo(t => {
    if (isToolPage(t)) { setToolPage(t); setTab('tools') } else setTab(t)
    document.getElementById('main')?.scrollTo({ top: 0 })
  }), [setTab, setToolPage])
  // a short note on screen whenever a pedal does something, so you know it worked
  const [pedal, setPedal] = useState<{ a: PedalAction; k: number } | null>(null)
  useEffect(() => onPedal(a => setPedal(p => ({ a, k: (p?.k ?? 0) + 1 }))), [])
  useEffect(() => { if (!pedal) return; const t = setTimeout(() => setPedal(null), 1100); return () => clearTimeout(t) }, [pedal])
  const d = todayLog()
  const goalDone = d.guitar + d.study >= dailyGoalMin() * 60

  return (
    <div className="app">
      <main className={`main${tab === 'play' ? ' main-play' : ''}`} id="main">
        {tab === 'play' && <PlayScreen key={inst.id} />}
        {tab === 'learn' && <LearnScreen key={inst.id} />}
        {tab === 'tools' && <ToolsScreen page={toolPage} onPage={setToolPage} scaleJump={scaleJump} />}
        {tab === 'progressions' && (
          <JamScreen onOpenScale={(root, scale) => { setScaleJump({ root, scale }); setToolPage('scales'); setTab('tools') }} />
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
      {pedal && <div key={pedal.k} className="pedal-toast" role="status">🦶 {ACTION_LABEL[pedal.a].replace(/ \(.*\)$/, '')}</div>}
      <ShareInbox />
      <CelebrationLayer />
    </div>
  )
}
