import { useEffect, useRef, useState, type JSX, type PointerEvent as RPointerEvent } from 'react'
import { JamScreen } from './screens/JamScreen'
import { PlayScreen } from './screens/PlayScreen'
import { ToolsScreen } from './screens/ToolsScreen'
import { SongsScreen } from './screens/SongsScreen'
import { LearnScreen } from './learn/LearnScreen'
import { CelebrationLayer } from './learn/Celebration'
import { IconLearn, IconMenu, IconProgression, IconSearch, IconSongs, IconTab, IconTools } from './components/Icons'
import { ArtThumb } from './components/Art'
import { PsyBackdrop } from './components/PsyArt'
import { setNavHidden, useMedia, useUi } from './ui'
import { usePersist } from './components/Controls'
import { useInstrument } from './instrument'
import { isToolPage, onGo, onRemount, TAB_IDS, type Tab, type ToolPage } from './nav'
import { SearchSheet } from './components/SearchSheet'
import { SessionBar } from './sessions/SessionBar'
import { AskBubble } from './assistant/AskBubble'
import { onAsk, type AskContext } from './assistant/bus'
import { backInside, useBack } from './back'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { dailyGoalMin, todayLog, useProgress } from './learn/progress'
import { ACTION_LABEL, onPedal, type PedalAction } from './controls/pedals'
import { ShareInbox } from './components/ShareInbox'
import { Welcome, needsWelcome, openGuide } from './components/Welcome'

const TABS: { id: Tab; label: string; icon: () => JSX.Element }[] = [
  { id: 'play', label: 'Play', icon: IconTab },
  { id: 'songs', label: 'Songs', icon: IconSongs },
  { id: 'learn', label: 'Learn', icon: IconLearn },
  { id: 'progressions', label: 'Jam', icon: IconProgression },
  { id: 'tools', label: 'Tools', icon: IconTools },
]

export default function App() {
  const [saved, setTab] = usePersist<string>('tab2', 'play')
  const [toolPage, setToolPage] = usePersist<ToolPage>('toolPage', isToolPage(saved) ? saved : 'tuner')
  // older versions had Tuner, Tempo, Chords and Scales as their own tabs
  const tab: Tab = isToolPage(saved) ? 'tools' : ((TAB_IDS as string[]).includes(saved) ? saved as Tab : 'play')
  const [scaleJump, setScaleJump] = useState<{ root: string; scale: string } | null>(null)
  const [welcome, setWelcome] = useState(needsWelcome)
  const inst = useInstrument()
  useProgress()
  // where a link (search, Show me, Open in Play) came from, so Back can return there
  const cameFrom = useRef<Tab | null>(null)
  const tabRef = useRef<Tab>(tab)
  tabRef.current = tab
  useEffect(() => onGo(t => {
    const to: Tab = isToolPage(t) ? 'tools' : t
    if (to !== tabRef.current) cameFrom.current = tabRef.current
    if (isToolPage(t)) { setToolPage(t); setTab('tools') } else setTab(t)
    document.getElementById('main')?.scrollTo({ top: 0 })
  }), [setTab, setToolPage])
  // search: the button in the menu, or / or Ctrl+K on a keyboard
  const [search, setSearch] = useState<false | { text?: string; context?: AskContext; ask?: boolean }>(false)
  useEffect(() => onAsk(r => setSearch({ text: r.text, context: r.context, ask: r.send })), [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))
      if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); setSearch({}) }
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [])
  // tools and Jam open afresh when search has set them up
  const [jump, setJump] = useState(0)
  useEffect(() => onRemount(() => setJump(j => j + 1)), [])
  // Back: close what's on top, step back inside the screen, back to where a link came from, then to Play
  const [exitHint, setExitHint] = useState(0)
  const backRef = useRef<() => void>(() => {})
  backRef.current = () => {
    if (backInside()) return
    const from = cameFrom.current
    cameFrom.current = null
    if (from && from !== tab) { setTab(from); return }
    if (tab !== 'play') { setTab('play'); return }
    if (Date.now() - exitHint < 2000) { if (Capacitor.isNativePlatform()) void CapApp.exitApp(); return }
    setExitHint(Date.now())
  }
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const h = CapApp.addListener('backButton', () => backRef.current())
      return () => { void h.then(x => x.remove()) }
    }
    // in a browser, keep one page of history to catch the Back button
    history.pushState({ kg: 1 }, '')
    const pop = () => { backRef.current(); history.pushState({ kg: 1 }, '') }
    addEventListener('popstate', pop)
    return () => removeEventListener('popstate', pop)
  }, [])
  useEffect(() => { if (!exitHint) return; const t = setTimeout(() => setExitHint(0), 2000); return () => clearTimeout(t) }, [exitHint])
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
  useBack(drawer, () => setDrawer(false))
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
      <PsyBackdrop />
      <main className={`main${tab === 'play' ? ' main-play' : ''}`} id="main">
        <SessionBar />
        {tab === 'play' && <PlayScreen key={inst.id} />}
        {tab === 'songs' && <SongsScreen key={inst.id} />}
        {tab === 'learn' && <LearnScreen key={inst.id} />}
        {tab === 'tools' && <ToolsScreen page={toolPage} onPage={setToolPage} scaleJump={scaleJump} jump={jump} />}
        {tab === 'progressions' && (
          <JamScreen key={jump} onOpenScale={(root, scale) => { setScaleJump({ root, scale }); setToolPage('scales'); setTab('tools') }} />
        )}
      </main>
      <nav className={`nav${drawer ? ' drawer' : ''}`} aria-label="Sections" onPointerDown={navDown} onPointerMove={navMove} onPointerUp={navUp} onPointerCancel={navUp}>
        {TABS.map(t => (
          <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => {
            // tapping the section you're in takes you back to its start (Learn's home, the top of the page)
            if (tab === t.id) { window.dispatchEvent(new CustomEvent('kg:navTop', { detail: t.id })); document.getElementById('main')?.scrollTo({ top: 0, behavior: 'smooth' }) }
            cameFrom.current = null
            setTab(t.id); setDrawer(false)
          }}>
            <span className="nav-icon">
              <t.icon />
              {t.id === 'learn' && <i className={`nav-badge${goalDone ? ' done' : ''}`} aria-label={goalDone ? "today's goal done" : "today's goal not done yet"}>{goalDone ? '✓' : ''}</i>}
            </span>
            {t.label}
          </button>
        ))}
        <button className="nav-search" onClick={() => { setSearch({}); setDrawer(false) }} aria-label="Search or ask KGuitar" title="Search or ask (/)">
          <span className="nav-icon"><IconSearch /></span>
          Ask
        </button>
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
      {!search && <AskBubble context={tab === 'learn' ? 'learn' : tab === 'play' ? 'play' : tab === 'progressions' ? (localStorage.getItem('kg:sub:jam') === '"beats"' ? 'beat' : 'jam') : 'general'} />}
      {search && <SearchSheet onClose={() => setSearch(false)} initial={search.text} context={search.context} autoAsk={search.ask} />}
      {exitHint > 0 && <div className="pedal-toast" role="status">Press Back again to close KGuitar</div>}
      {pedal && <div key={pedal.k} className="pedal-toast" role="status">🦶 {ACTION_LABEL[pedal.a].replace(/ \(.*\)$/, '')}</div>}
      {welcome && <Welcome onDone={then => { setWelcome(false); if (then === 'guide') openGuide(); else setTab('play') }} />}
      <ShareInbox />
      <CelebrationLayer />
    </div>
  )
}
