// The looper strip for screens that load before the looper (Play, Tools → Scales): only loaded when the looper has
// something in it, so those screens stay light when you don't use it.
import { lazy, Suspense, useEffect, useState } from 'react'

const Bar = lazy(() => import('./LooperPanel').then(m => ({ default: m.LooperBar })))

const hasLoops = () => {
  try {
    const s = JSON.parse(localStorage.getItem('kg:looper') ?? 'null') as { tracks?: { parts?: Record<string, { takes?: string[] } | undefined> }[] } | null
    return !!s?.tracks?.some(t => Object.values(t.parts ?? {}).some(p => !!p?.takes?.length))
  } catch { return false }
}

export function LooperStrip() {
  const [on, setOn] = useState(hasLoops)
  // the looper may get its first loop while this screen is open (on a foot pedal from another page): check now and then
  useEffect(() => { if (on) return; const id = setInterval(() => { if (hasLoops()) setOn(true) }, 2000); return () => clearInterval(id) }, [on])
  if (!on) return null
  return <Suspense fallback={null}><Bar /></Suspense>
}
