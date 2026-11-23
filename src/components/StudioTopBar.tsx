// Slim top studio strip sitting beside RigPill (clear of the Top-Left ☰ menu button):
// - Live Context pill (active key & BPM; 1 tap jumps to Riff Scanner, Shorts, Jam, Fills, Licks in this key, or Looper)
// - Unified Floating Window launcher (Float ▾): + Open New Card (supports multiple copies!), ⊞ Arrange, Minimize All,
//   and 1-tap Workspace Presets (Jam Rig, Mode Study, Book Practice, Dual Fretboard, + Save Current Layout!)
// - Clean Stage focus toggle (1 tap hides/restores all floating cards while playing)
import { useEffect, useRef, useState } from 'react'
import { Ico } from './Icon'
import {
  BUILTIN_PRESETS, CARDS, addCardInstance, applyPreset, arrangeFloatCards, deletePreset, minimizeAllCards,
  savePreset, savedPresets, setCleanStage, setFloatResting, useCleanStage, useFloatCtx, useFloatScreen, useShownInstances,
  type CardId,
} from '../float/bus'
import { learnGo, openJam, openLicksInKey, openScanner } from '../nav'
import { isAndroidApp, overlayStatus, toggleSystemOverlay } from '../overlay/bridge'

function readSaved(key: string, fallback: string): string {
  try {
    const raw = localStorage.getItem(key)
    return raw ? String(JSON.parse(raw)) : fallback
  } catch { return fallback }
}

export function StudioTopBar() {
  const screen = useFloatScreen()
  const instances = useShownInstances(screen)
  const ctx = useFloatCtx()
  const clean = useCleanStage()
  const [menu, setMenu] = useState<null | 'context' | 'float'>(null)
  const [presetName, setPresetName] = useState('')
  const [savingPreset, setSavingPreset] = useState(false)
  const [ovRunning, setOvRunning] = useState(false)
  const [ovMsg, setOvMsg] = useState('')
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (menu === 'float' && isAndroidApp()) {
      void overlayStatus().then(s => setOvRunning(s.running))
    }
  }, [menu])

  useEffect(() => {
    if (!menu) { setSavingPreset(false); return }
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

  const openNew = (kind: CardId) => {
    if (kind === 'neck') try { localStorage.setItem('kg:floatNeck5Layer', '1') } catch { /* private */ }
    setCleanStage(false)
    setFloatResting(screen, false)
    if (kind === 'hand' && (screen === 'play' || screen === 'scan')) {
      const hasHand = instances.some(x => x.kind === 'hand')
      if (!hasHand) addCardInstance(screen, 'hand')
      setMenu(null)
      return
    }
    addCardInstance(screen, kind)
    setMenu(null)
  }

  const options = CARDS
  const activeCount = instances.filter(x => !(x.kind === 'hand' && (screen === 'play' || screen === 'scan'))).length
  const userPresets = savedPresets()

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

      {/* Multi-Card Floating Window Launcher + Arrange + Workspace Presets */}
      <span className="fc-menu-wrap">
        <button
          className={`btn sm ghost studio-pill${menu === 'float' || activeCount > 0 || ovRunning ? ' on' : ''}`}
          onClick={() => setMenu(m => (m === 'float' ? null : 'float'))}
          aria-expanded={menu === 'float'}
          title="Open multiple floating cards, arrange layout, or float over Songsterr / other apps"
          data-testid="studio-float-btn"
        >
          <Ico n="layers" /> Float{activeCount > 0 ? ` (${activeCount})` : ''} ▾
        </button>
        {menu === 'float' && (
          <div className="fc-menu-pop fc-menu-scroll" style={{ minWidth: 265 }} role="menu" data-testid="studio-float-menu">
            <button
              className={`fc-menu-item${ovRunning ? ' on' : ''}`}
              role="menuitem"
              data-testid="studio-system-overlay"
              onClick={async () => {
                if (!isAndroidApp()) {
                  window.open('/?overlay=1', '_blank')
                  setMenu(null)
                  return
                }
                const r = await toggleSystemOverlay()
                setOvRunning(r.running)
                setOvMsg(r.message ?? '')
                if (r.ok && r.running) setMenu(null)
              }}
            >
              <Ico n="expand" />
              <span style={{ flex: 1 }}>
                {ovRunning ? '● Stop Bubble over apps' : 'Float over Songsterr / apps'}
              </span>
            </button>
            {ovMsg && <div className="small muted" style={{ padding: '2px 8px', fontSize: 11 }}>{ovMsg}</div>}
            <div className="fc-menu-sep" />
            {activeCount > 0 && (
              <>
                <div className="row" style={{ gap: 4, padding: '2px 4px' }}>
                  <button className="btn sm" style={{ flex: 1 }} onClick={() => { arrangeFloatCards(); setMenu(null) }} data-testid="studio-arrange">⊞ Arrange</button>
                  <button className="btn sm ghost" style={{ flex: 1 }} onClick={() => { minimizeAllCards(true); setMenu(null) }} data-testid="studio-min-all">Bubbles</button>
                  <button className="btn sm ghost" onClick={() => setSavingPreset(s => !s)} title="Save current cards as a preset">★ Save</button>
                </div>
                {savingPreset && (
                  <form className="row" style={{ gap: 4, padding: '4px' }} onSubmit={e => { e.preventDefault(); if (presetName.trim()) { savePreset(presetName.trim(), screen); setPresetName(''); setSavingPreset(false) } }}>
                    <input className="input" style={{ minHeight: 28, fontSize: 12 }} placeholder="Preset name…" value={presetName} onChange={e => setPresetName(e.target.value)} autoFocus />
                    <button className="btn sm primary" type="submit">Save</button>
                  </form>
                )}
                <div className="fc-menu-sep" />
              </>
            )}

            <span className="small muted" style={{ padding: '2px 8px', fontSize: 11 }}>Workspace Presets</span>
            {[...userPresets, ...BUILTIN_PRESETS].map(p => (
              <div key={p.id} className="row" style={{ gap: 2, flexWrap: 'nowrap', alignItems: 'center' }}>
                <button className="fc-menu-item" style={{ flex: 1 }} role="menuitem" onClick={() => { applyPreset(screen, p); setMenu(null) }} data-testid={`preset-${p.id}`}>
                  <Ico n="sparkles" /> {p.name}
                </button>
                {!p.builtin && <button className="btn sm ghost" onClick={() => deletePreset(p.id)} aria-label={`Delete ${p.name}`}>✕</button>}
              </div>
            ))}

            <div className="fc-menu-sep" />
            <span className="small muted" style={{ padding: '2px 8px', fontSize: 11 }}>+ Open in new floating card</span>
            {options.map(c => {
              const count = instances.filter(x => x.kind === c.id).length
              return (
                <button key={c.id} className={`fc-menu-item${count > 0 ? ' on' : ''}`} role="menuitem" onClick={() => openNew(c.id)} data-testid={`studio-add-${c.id}`}>
                  <span style={{ width: 14, display: 'inline-block' }}>+</span>
                  <Ico n={c.icon} />
                  <span style={{ flex: 1 }}>{c.title}</span>
                  {count > 0 && <span className="small muted">({count})</span>}
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
