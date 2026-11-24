import { useEffect, useRef, useState, type JSX, type PointerEvent as RPointerEvent } from 'react'
import { Ico } from './components/Icon'
import { JamScreen } from './screens/JamScreen'
import { PlayScreen } from './screens/PlayScreen'
import { ToolsScreen } from './screens/ToolsScreen'
import { SongsScreen } from './screens/SongsScreen'
import { LearnScreen } from './learn/LearnScreen'
import { CelebrationLayer } from './learn/Celebration'
import { IconGear, IconLearn, IconMenu, IconProgression, IconSearch, IconSongs, IconTools } from './components/Icons'
import { ArtThumb } from './components/Art'
import { PsyBackdrop } from './components/PsyArt'
import { setNavHidden, useMedia, useUi } from './ui'
import { usePersist } from './components/Controls'
import { useInstrument } from './instrument'
import { countUse, watchButtons } from './usage'
import { isToolPage, learnGo, onGear, onGo, onRemount, TAB_IDS, type Tab, type ToolPage } from './nav'
import { SearchSheet } from './components/SearchSheet'
import { SessionBar } from './sessions/SessionBar'
import { AskBubble } from './assistant/AskBubble'
import { FloatingLooper } from './looper/FloatingLooper'
import { FloatLayer } from './float/FloatLayer'
import { SoundPill } from './components/SoundPill'
import { ErrorBoundary } from './components/ErrorBoundary'
import { GlobalChordPeek } from './components/ChordPeek'
import { NowPlaying } from './components/NowPlaying'
import { StrumFloatNeck, StrumMiniBar } from './components/StrumMiniBar'
import { setActiveFeatureIntro } from './components/FeatureIntro'
import { useStrumState } from './audio/strumMachine'
import { Settings } from './learn/Settings'
import { setFloatScreen } from './float/bus'
import { RigNotice, RigPill } from './components/AudioSetup'
import { StudioTopBar } from './components/StudioTopBar'
import { ChromeBar, clampChromeOpacity } from './components/ChromeBar'
import { watchDevices } from './audio/input'
import { onAsk, type AskContext } from './assistant/bus'
import { stopAllSounds } from './audio/stopAll'
import { stopSpeaking } from './assistant/speak'
import { backInside, useBack } from './back'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { dailyGoalMin, todayLog, useProgress } from './learn/progress'
import { ACTION_LABEL, onPedal, type PedalAction } from './controls/pedals'
import { ShareInbox } from './components/ShareInbox'
import { Welcome, needsWelcome, openGuide } from './components/Welcome'
import { maybeAutoSync } from './sync/cloudSync'
import { OverlayHud } from './overlay/OverlayHud'
import { consumeOverlayRoute, isOverlayMode } from './overlay/bridge'
import { openJam, openScanner } from './nav'

const TABS: { id: Tab; label: string; icon: () => JSX.Element }[] = [
  { id: 'songs', label: 'Songs', icon: IconSongs },
  { id: 'learn', label: 'Learn', icon: IconLearn },
  { id: 'progressions', label: 'Jam', icon: IconProgression },
  { id: 'tools', label: 'Tools', icon: IconTools },
]

export default function App() {
  if (isOverlayMode()) return <OverlayHud />
  return <MainApp />
}

function MainApp() {
  const [saved, setTab] = usePersist<string>('tab2', 'play')
  const [toolPage, setToolPage] = usePersist<ToolPage>('toolPage', isToolPage(saved) ? saved : 'tuner')
  // leaving a page stops what it was playing
  const firstTab = useRef(true)
  // older versions had Tuner, Tempo, Chords and Scales as their own tabs
  const tab: Tab = isToolPage(saved) ? 'tools' : ((TAB_IDS as string[]).includes(saved) ? saved as Tab : 'play')
  const [scaleJump, setScaleJump] = useState<{ root: string; scale: string } | null>(null)
  const [welcome, setWelcome] = useState(needsWelcome)
  const inst = useInstrument()
  useProgress()
  // where a link (search, Show me, Open in Play) came from, so Back can return there
  const cameFrom = useRef<Tab | null>(null)
  useEffect(() => { if (firstTab.current) { firstTab.current = false; return } stopAllSounds(); stopSpeaking() }, [tab, toolPage])
  const tabRef = useRef<Tab>(tab)
  tabRef.current = tab
  // what you use (counted on this phone only; Settings → You → What you use)
  // the pedal + wireless setup switches on by itself when the Pocket Master is plugged in
  useEffect(() => { watchDevices() }, [])
  // quiet Phone ↔ Tablet cloud sync & deep-link check from Android Floating Bubble on startup & resume
  useEffect(() => {
    const checkRoute = () => {
      void consumeOverlayRoute().then(route => {
        if (route === 'scan') openScanner({ mode: 'scan' })
        else if (route === 'vibe') openJam('beats')
        else if (route === 'jam') openJam('jam')
      })
    }
    checkRoute()
    const t = setTimeout(() => maybeAutoSync(), 2000)
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        maybeAutoSync()
        checkRoute()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  useEffect(() => { countUse(tab === 'tools' ? `tool:${toolPage}` : `screen:${tab}`) }, [tab, toolPage])
  useEffect(() => watchButtons(() => tabRef.current), [])
  useEffect(() => onGo(t => {
    const to: Tab = isToolPage(t) ? 'tools' : t
    if (to !== tabRef.current) cameFrom.current = tabRef.current
    if (isToolPage(t)) { setToolPage(t); setTab('tools') } else setTab(t)
    document.getElementById('main')?.scrollTo({ top: 0 })
  }), [setTab, setToolPage])
  // the gear: Settings (with the floating cards and the manual) over whatever screen you're on
  const [gear, setGear] = useState<{ n?: number; sec?: string } | null>(null)
  useEffect(() => onGear((_p, sec) => setGear({ n: Date.now(), sec })), [])
  useEffect(() => onGo(() => setGear(null)), [])
  useEffect(() => { if (gear) countUse('screen:settings') }, [gear])
  useEffect(() => { if (gear) { setFloatScreen('settings'); document.getElementById('main')?.scrollTo({ top: 0 }) } else setFloatScreen(tab === 'progressions' ? 'jam' : tab) }, [gear, tab])
  // search: the button in the menu, or / or Ctrl+K on a keyboard
  const [search, setSearch] = useState<false | { text?: string; context?: AskContext; ask?: boolean }>(false)
  useEffect(() => onAsk(r => setSearch({ text: r.text, context: r.context, ask: r.send })), [])
  useEffect(() => { if (search) countUse('ask:open') }, [search])
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
    if (gear) { setGear(null); return }
    if (backInside()) return
    const from = cameFrom.current
    cameFrom.current = null
    if (from && from !== tab) { setTab(from); return }
    if (tab !== 'songs') { setTab('songs'); return }
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
  const [navOpacity, setNavOpacity] = usePersist('navOpacity', 1)
  const [navOpOpen, setNavOpOpen] = useState(false)
  useEffect(() => { if (!hidden) setDrawer(false) }, [hidden])
  useBack(drawer, () => setDrawer(false))
  useEffect(() => {
    if (!drawer) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false) }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [drawer])
  // swipe the rail (or drawer) to the left, or the bottom bar down, to tuck it away
  const strumState = useStrumState()
  // Announce active top-level screen to the ✨ AI Assistant "What this does" popup
  useEffect(() => {
    if (gear) { setActiveFeatureIntro(null); return }
    if (tab === 'tools') setActiveFeatureIntro(toolPage)
    else if (tab !== 'progressions') setActiveFeatureIntro(tab)
  }, [tab, toolPage, gear])
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
        <FloatLayer />
        <StrumFloatNeck />
        <GlobalChordPeek inst={inst} />
        <RigNotice />
        {!(tab === 'play' && ui.playFocus) && !gear && (
          <ChromeBar id="app-top" label="Top bar" edge="top" pillAlign="center" minH={34} maxH={160}>
            <div className="rig-bar"><StudioTopBar /><RigPill /></div>
          </ChromeBar>
        )}
        <ErrorBoundary label={gear ? 'Settings' : tab} resetKey={`${tab}:${gear ? 'g' : ''}:${toolPage}:${inst.id}:${jump}`}>
          {gear && <Settings key={gear.n ?? 0} inst={inst} guideSec={gear.sec} onExit={() => setGear(null)} onGo={g => { setGear(null); learnGo(g) }} />}
          {!gear && <>
          {tab === 'play' && <PlayScreen key={inst.id} />}
          {tab === 'songs' && <SongsScreen key={inst.id} />}
          {tab === 'learn' && <LearnScreen key={inst.id} />}
          {tab === 'tools' && <ToolsScreen page={toolPage} onPage={setToolPage} scaleJump={scaleJump} jump={jump} />}
          {tab === 'progressions' && (
            <JamScreen key={jump} onOpenScale={(root, scale) => { setScaleJump({ root, scale }); setToolPage('scales'); setTab('tools') }} />
          )}
          </>}
        </ErrorBoundary>
        {strumState.playing ? (
          <StrumMiniBar />
        ) : (
          (gear || tab !== 'play') && <NowPlaying key={`${inst.id}:${tab}`} instId={inst.id} />
        )}
      </main>
      <nav
        className={`nav${drawer ? ' drawer' : ''}`}
        style={navOpacity < 1 ? { opacity: clampChromeOpacity(navOpacity) } : undefined}
        aria-label="Sections"
        onPointerDown={navDown}
        onPointerMove={navMove}
        onPointerUp={navUp}
        onPointerCancel={navUp}
      >
        {TABS.map(t => (
          <button key={t.id} aria-current={tab === t.id || (t.id === 'songs' && tab === 'play' && !gear) ? 'page' : undefined} onClick={() => {
            // tapping the section you're in takes you back to its start (Learn's home, the top of the page)
            if (tab === t.id) { window.dispatchEvent(new CustomEvent('kg:navTop', { detail: t.id })); document.getElementById('main')?.scrollTo({ top: 0, behavior: 'smooth' }) }
            cameFrom.current = null
            setGear(null); setTab(t.id); setDrawer(false)
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
        <button className="nav-gear" aria-current={gear ? 'page' : undefined} onClick={() => { setGear(g => (g ? null : {})); setDrawer(false) }} aria-label="Settings and the manual" title="Settings, floating cards and the manual" data-testid="nav-gear">
          <span className="nav-icon"><IconGear /></span>
          Settings
        </button>
        <div className="nav-extra">
          {(wide || drawer) && <ArtThumb className="nav-art" />}
          <button
            type="button"
            className={`nav-hide nav-op-btn${navOpOpen || navOpacity < 1 ? ' on' : ''}`}
            onClick={() => setNavOpOpen(v => !v)}
            aria-pressed={navOpOpen}
            aria-label="Menu bar opacity"
            title={`Menu opacity (${Math.round(navOpacity * 100)}%)`}
            data-testid="nav-opacity"
          >
            ◐
          </button>
          {drawer ? (
            !(tab === 'play' && ui.playFocus) && <button className="nav-hide" onClick={() => { setNavHidden(false); setDrawer(false) }} title="Keep the menu showing">Keep open</button>
          ) : (
            <button className="nav-hide" onClick={() => setNavHidden(true)} aria-label="Hide the menu" title="Hide the menu (3-line button stays in the corner)">
              <span aria-hidden>{wide ? '«' : '⌄'}</span>{wide && <span className="small">Hide</span>}
            </button>
          )}
        </div>
        {navOpOpen && (
          <div className="nav-op-pop" data-testid="nav-op-pop">
            <span className="small">◐ Menu</span>
            <input
              type="range"
              min={0.25}
              max={1}
              step={0.05}
              value={navOpacity}
              onChange={e => setNavOpacity(clampChromeOpacity(Number(e.target.value)))}
              aria-label="Menu bar opacity slider"
            />
            <span className="small tabular">{Math.round(navOpacity * 100)}%</span>
            <button type="button" className="chrome-btn" onClick={() => setNavOpOpen(false)} aria-label="Close">✕</button>
          </div>
        )}
      </nav>
      {hidden && !drawer && (
        <button className="nav-pull" onClick={() => setDrawer(true)} aria-label="Show the menu" title="Menu" data-testid="nav-pull"><IconMenu /></button>
      )}
      {drawer && <div className="nav-scrim" onClick={() => setDrawer(false)} aria-hidden />}
      <SoundPill />
      {!search && <FloatingLooper />}
      {!search && <AskBubble context={tab === 'learn' ? 'learn' : tab === 'play' ? 'play' : tab === 'progressions' ? (localStorage.getItem('kg:sub:jam') === '"beats"' ? 'beat' : 'jam') : 'general'} />}
      {search && <SearchSheet onClose={() => setSearch(false)} initial={search.text} context={search.context} autoAsk={search.ask} />}
      {exitHint > 0 && <div className="pedal-toast" role="status">Press Back again to close KGuitar</div>}
      {pedal && <div key={pedal.k} className="pedal-toast" role="status"><Ico n="foot" /> {ACTION_LABEL[pedal.a].replace(/ \(.*\)$/, '')}</div>}
      {welcome && <Welcome onDone={then => { setWelcome(false); if (then === 'guide') openGuide(); else setTab('play') }} />}
      <ShareInbox />
      <CelebrationLayer />
    </div>
  )
}
