// The tip card by the ✨ bubble: the tip, Show me (flash the button, or go there first), Got it, No more tips here,
// and "Ask about this" (opens the helper with the tip as the question). useTip() tells the bubble when to glow.
import { useEffect, useState } from 'react'
import { useFloatScreen } from '../float/bus'
import { useInstrument } from '../instrument'
import { launch } from '../search/launch'
import { askAssistant } from '../assistant/bus'
import { countUse } from '../usage'
import { currentTip, flashFind, muteTips, onTips, tipDone, tipsMode, type Tip, type TipMode } from './tips'

const subOf = (screen: string) => {
  const key = screen === 'jam' ? 'kg:sub:jam' : `kg:sub:${screen}`
  try { return (JSON.parse(localStorage.getItem(key) ?? '""') as string) || '' } catch { return '' }
}

/** The tip for the screen you're on (re-checked when tips change, the page changes, and every 20 s). */
export function useTip(): { tip: Tip | null; mode: TipMode; screen: string } {
  const screen = useFloatScreen()
  const inst = useInstrument()
  const calc = () => currentTip({ screen, sub: subOf(screen), inst: inst.id })
  const [tip, setTip] = useState<Tip | null>(calc)
  const [mode, setMode] = useState<TipMode>(tipsMode)
  useEffect(() => {
    const f = () => { setTip(calc()); setMode(tipsMode()) }
    f()
    const off = onTips(f)
    const t = setInterval(f, 20_000)
    addEventListener('kg-subpage', f); addEventListener('storage', f)
    // a sub-page tap changes kg:sub:* without an event: check shortly after taps
    const tap = () => setTimeout(f, 300)
    document.addEventListener('click', tap, true)
    return () => { off(); clearInterval(t); removeEventListener('kg-subpage', f); removeEventListener('storage', f); document.removeEventListener('click', tap, true) }
  }, [screen, inst.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return { tip, mode, screen }
}

export function TipCard({ tip, screen, onClose, style, from }: { tip: Tip; screen: string; onClose: () => void; style?: React.CSSProperties; from: 'left' | 'right' }) {
  useEffect(() => { countUse(`tip:${tip.id}`) }, [tip.id])
  const label = tip.kind === 'advice' ? 'Guitar tip' : tip.kind === 'stuck' ? 'This spot' : 'Did you know?'
  const show = () => {
    if (tip.go) launch({ go: tip.go })
    if (tip.find) flashFind(tip.find, tip.go ? 700 : 120)
    tipDone(tip, screen)
    onClose()
  }
  return (
    <div className={`talk-card tip-card from-${from}`} style={style} role="dialog" aria-label={label} data-testid="tip-card">
      <p className="tip-kind small"><span className="tip-dot" aria-hidden /> {label}</p>
      <p className="talk-a tip-text">{tip.text}</p>
      <div className="row talk-acts">
        {(tip.find || tip.go) && <button className="btn sm primary" onClick={show} data-testid="tip-show">Show me</button>}
        <button className="btn sm" onClick={() => { tipDone(tip, screen); onClose() }} data-testid="tip-got">Got it</button>
        <button className="btn sm ghost" onClick={() => { askAssistant(tip.kind === 'advice' ? `Tell me more: ${tip.text}` : `How do I use this: ${tip.text}`, screen === 'learn' ? 'learn' : screen === 'play' ? 'play' : screen === 'jam' ? 'jam' : 'general', true); tipDone(tip, screen); onClose() }}>Ask about this</button>
      </div>
      <div className="row talk-foot">
        <button className="btn sm ghost" onClick={() => { muteTips(screen); onClose() }} data-testid="tip-mute">No more tips here</button>
        <button className="btn sm ghost" onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>
  )
}
