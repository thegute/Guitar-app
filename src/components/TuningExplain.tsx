// "What this tuning changes", in plain words, for the tuning you've picked (Tuner, CAGED explorer). Nothing for standard.
import { useMemo } from 'react'
import { tuningInfo } from '../theory/tuningInfo'

export function TuningExplain({ midis, open = false }: { midis: number[]; open?: boolean }) {
  const info = useMemo(() => tuningInfo(midis), [midis])
  if (!info) return null
  return (
    <details className="tuning-explain small" open={open} data-testid="tuning-explain">
      <summary><b>What this tuning changes:</b> {info.summary}</summary>
      <ul>{info.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
    </details>
  )
}
