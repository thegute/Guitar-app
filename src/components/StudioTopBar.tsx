// Slim top studio strip sitting beside RigPill (clear of the Top-Left ☰ menu button):
// - Live Context pill (active key & BPM; 1 tap jumps to Riff Scanner, Shorts, Jam, Fills, Licks in this key, or Looper)
// - Unified Floating Window launcher (⊞ Float ▾) to open/add/remove any floating card including the 5-Layer Fretboard
// - Clean Stage focus toggle (1 tap hides/restores all floating cards while playing)
import { useEffect, useRef, useState } from 'react'
import { Ico } from './Icon'
import { CARDS, setCleanStage, toggleCard, useCleanStage, useFloatCtx, useFloatScreen, useShownCards, type CardId } from '../float/bus'
import { learnGo, openJam, openLicksInKey, openScanner } from '../nav'

function readSaved(key: string, fallback: string): string {
  try {
    const raw = localStorage.getItem(key)
    return raw ? String(JSON.parse(raw)) : fallback
  } catch { return fallback }
}

export function StudioTopBar() {
  const screen = useFloatScreen()
  const shown = useShownCards(screen)
  const ctx = useFloatCtx()
  const clean = useCleanStage()
  const [menu, setMenu] = useState<null | 'context' | 'float'>(null)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const close = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setMenu(null)
    }
    addEventListener('pointerdown', close)
    return () => removeEventListener('pointerdown', close)
  }, [menu])

  const savedTonic = readSaved('kg:progKey', 'G')
  const savedMode = readSaved('kg:progMode', 'major')
  const savedBpm = Number(readSaved('kg:progBpm', '90')) || 90
  const keyLabel = ctx.keyName || `${savedTonic}${savedMode === 'minor' || savedMode === 'aeolian' || savedMode === 'dorian' ? 'm' : ''}`
  const bpmLabel = ctx.bpm ? Math.round(ctx.bpm * (ctx.speed ?? 1)) : savedBpm
  const rootMatch = /^([A-G][#b]?)/.exec(keyLabel)
  const ctxRoot = rootMatch ? rootMatch[1] : savedTonic
  const ctxMinor = /m(?!aj)/i.test(keyLabel)

  const open5Layer = () => {
    try { localStorage.setItem('kg:floatNeck5Layer', '1') } catch { /* private */ }
    setCleanStage(false)
    if (!shown.includes('neck')) toggleCard(screen, 'neck')
    setMenu(null)
  }

  const options = CARDS.filter(c => c.id !== 'hand')
  const activeCount = shown.filter(id => id !== 'hand').length

  return (
    <div className="studio-top-bar row" ref={wrap} style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Live Context & Quick Jump Pill */}
      <span className="fc-menu-wrap">
        <button
          className={`btn sm ghost studio-pill${menu === 'context' ? ' on' : ''}`}
          onClick={() => setMenu(m => (m === 'context' ? null : 'context'))}
          aria-expanded={menu === 'context'}
          title="Current key & tempo — tap to jump anywhere in this key"
          data-testid="studio-context-pill"
        >
          <Ico n="music" /> <b>{keyLabel}</b> · <span className="tabular">{bpmLabel} BPM</span> ▾
        </button>
        {menu === 'context' && (
          <div className="fc-menu-pop studio-pop-left" role="menu" data-testid="studio-context-menu">
            <span className="small muted" style={{ padding: '2px 8px', fontSize: 11 }}>Quick jump ({keyLabel})</span>
            <button className="fc-menu-item" role="menuitem" onClick={() => { openScanner({ mode: 'scan' }); setMenu(null) }} data-testid="quick-scan">
              <Ico n="scan" /> Riff Scanner (Video / Pics)
            </button>
            <button className="fc-menu-item" role="menuitem" onClick={() => { openScanner({ mode: 'shorts' }); setMenu(null) }} data-testid="quick-shorts">
              <Ico n="shuffle" /> Guitar Shorts Scanner
            </button>
            <div className="fc-menu-sep" />
            <button className="fc-menu-item" role="menuitem" onClick={() => { openJam('jam'); setMenu(null) }}>
              <Ico n="guitar" /> Jam Band in {keyLabel}
            </button>
            <button className="fc-menu-item" role="menuitem" onClick={() => { openLicksInKey(ctxRoot, ctxMinor); setMenu(null) }}>
              <Ico n="zap" /> Must-Know Licks in {keyLabel}
            </button>
            <button className="fc-menu-item" role="menuitem" onClick={() => { learnGo({ tool: 'fills' }); setMenu(null) }}>
              <Ico n="sparkles" /> Fills Workshop
            </button>
            <button className="fc-menu-item" role="menuitem" onClick={() => { openJam('loop'); setMenu(null) }}>
              <Ico n="loop" /> Looper
            </button>
          </div>
        )}
      </span>

      {/* Unified Floating Window Launcher */}
      <span className="fc-menu-wrap">
        <button
          className={`btn sm ghost studio-pill${menu === 'float' || activeCount > 0 ? ' on' : ''}`}
          onClick={() => setMenu(m => (m === 'float' ? null : 'float'))}
          aria-expanded={menu === 'float'}
          title="Open, add, or remove floating windows (including the 5-Layer Fretboard)"
          data-testid="studio-float-btn"
        >
          <Ico n="layers" /> Float{activeCount > 0 ? ` (${activeCount})` : ''} ▾
        </button>
        {menu === 'float' && (
          <div className="fc-menu-pop" role="menu" data-testid="studio-float-menu">
            <button className="fc-menu-item on" role="menuitem" onClick={open5Layer} data-testid="studio-open-5layer">
              <Ico n="layers" /> Open 5-Layer Fretboard ⤢
            </button>
            <div className="fc-menu-sep" />
            <span className="small muted" style={{ padding: '2px 8px', fontSize: 11 }}>Floating cards on this screen</span>
            {options.map(c => {
              const on = shown.includes(c.id as CardId)
              return (
                <button key={c.id} className={`fc-menu-item${on ? ' on' : ''}`} role="menuitemcheckbox" aria-checked={on} onClick={() => { setCleanStage(false); toggleCard(screen, c.id as CardId) }} data-testid={`studio-toggle-${c.id}`}>
                  <span style={{ width: 14, display: 'inline-block' }}>{on ? '✓' : '+'}</span>
                  <Ico n={c.icon} /> {c.id === 'neck' ? 'Fretboard (5-Layer)' : c.title}
                </button>
              )
            })}
          </div>
        )}
      </span>

      {/* 1-tap Clean Stage Focus toggle */}
      {activeCount > 0 && (
        <button
          className={`btn sm ghost studio-pill${clean ? ' on' : ''}`}
          onClick={() => setCleanStage(!clean)}
          aria-pressed={clean}
          title={clean ? 'Show floating cards again' : 'Hide floating cards while playing (Clean Stage)'}
          data-testid="studio-clean-stage"
        >
          <Ico n="eye" /> {clean ? 'Show cards' : 'Focus'}
        </button>
      )}
    </div>
  )
}
