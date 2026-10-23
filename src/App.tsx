import { useEffect, useRef, useState, type JSX, type PointerEvent as RPointerEvent } from 'react'
import { JamScreen } from './screens/JamScreen'
import { PlayScreen } from './screens/PlayScreen'
import { ToolsScreen } from './screens/ToolsScreen'
import { LearnScreen } from './learn/LearnScreen'
import { CelebrationLayer } from './learn/Celebration'
import { IconLearn, IconMenu, IconProgression, IconTab, IconTools } from './components/Icons'
import { ArtThumb } from './components/Art'
import { setNavHidden, useMedia, useUi } from './ui'
import { usePersist } from './components/Controls'
import { useInstrument } from './instrument'
import { isToolPage, onGo, type Tab, type ToolPage } from './nav'
import { dailyGoalMin, todayLog, useProgress } from './learn/progress'
import { ACTION_LABEL, onPedal, type PedalAction } from './controls/pedals'
import { ShareInbox } from './components/ShareInbox'
import { Welcome, needsWelcome, openGuide } from './components/Welcome'

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
  const [welcome, setWelcome] = useState(needsWelcome)
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
  // the menu: pinned (side rail / bottom bar), or hidden with a pull tab that slides it out as a drawer
  const ui = useUi()
  const wide = useMedia('(min-width: 760px)')
  const hidden = ui.navHidden || (tab === 'play' && ui.playFocus)
  const [drawer, setDrawer] = useState(false)
  useEffect(() => { if (!hidden) setDrawer(false) }, [hidden])
  useEffect(() => {
    if (!drawer) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false) }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [drawer])
  // swipe the rail (or drawer) to the left, or the bottom bar down, to tuck it away
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null)
  const navDown = (e: RPointerEvent) => { swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId } }
  const navMove = (e: RPointerEvent) => {
    const sw = swipe.current
    if (!sw || sw.id !== e.pointerId) return
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y
    if (drawer ? dx < -50 : wide ? dx < -50 && Math.abs(dy) < 40 : dy > 40 && Math.abs(dx) < 40) {
      swipe.current = null
      if (drawer) setDrawer(false)
      else setNavHidden(true)
    }
  }
  const navUp = () => { swipe.current = null }

  return (
    <div className={`app${hidden ? ' nav-hidden' : ''}${drawer ? ' drawer-open' : ''}`}>
      <main className={`main${tab === 'play' ? ' main-play' : ''}`} id="main">
        {tab === 'play' && <PlayScreen key={inst.id} />}
        {tab === 'learn' && <LearnScreen key={inst.id} />}
        {tab === 'tools' && <ToolsScreen page={toolPage} onPage={setToolPage} scaleJump={scaleJump} />}
        {tab === 'progressions' && (
          <JamScreen onOpenScale={(root, scale) => { setScaleJump({ root, scale }); setToolPage('scales'); setTab('tools') }} />
        )}
      </main>
      <nav className={`nav${drawer ? ' drawer' : ''}`} aria-label="Sections" onPointerDown={navDown} onPointerMove={navMove} onPointerUp={navUp} onPointerCancel={navUp}>
        {TABS.map(t => (
          <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => { setTab(t.id); setDrawer(false) }}>
            <span className="nav-icon">
              <t.icon />
              {t.id === 'learn' && <i className={`nav-badge${goalDone ? ' done' : ''}`} aria-label={goalDone ? "today's goal done" : "today's goal not done yet"}>{goalDone ? '✓' : ''}</i>}
            </span>
            {t.label}
          </button>
        ))}
        <div className="nav-extra">
          {(wide || drawer) && <ArtThumb className="nav-art" />}
          {drawer ? (
            !(tab === 'play' && ui.playFocus) && <button className="nav-hide" onClick={() => { setNavHidden(false); setDrawer(false) }} title="Keep the menu showing">Keep open</button>
          ) : (
            <button className="nav-hide" onClick={() => setNavHidden(true)} aria-label="Hide the menu" title="Hide the menu (bring it back with the tab on the left edge)">
              <span aria-hidden>{wide ? '«' : '⌄'}</span>{wide && <span className="small">Hide</span>}
            </button>
          )}
        </div>
      </nav>
      {hidden && !drawer && (
        <button className="nav-pull" onClick={() => setDrawer(true)} aria-label="Show the menu" title="Menu"><IconMenu /></button>
      )}
      {drawer && <div className="nav-scrim" onClick={() => setDrawer(false)} aria-hidden />}
      {pedal && <div key={pedal.k} className="pedal-toast" role="status">🦶 {ACTION_LABEL[pedal.a].replace(/ \(.*\)$/, '')}</div>}
      {welcome && <Welcome onDone={then => { setWelcome(false); if (then === 'guide') openGuide(); else setTab('play') }} />}
      <ShareInbox />
      <CelebrationLayer />
    </div>
  )
}
