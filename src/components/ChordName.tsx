// A chord name anywhere in the app: press it and its finger diagram pops up next to your finger (components/ChordPeek,
// mounted once for the whole app in GlobalChordPeek; Play keeps its own, which also knows the tab's exact shape).
import type { ReactNode } from 'react'

export function ChordName({ name, children, className }: { name: string; children?: ReactNode; className?: string }) {
  return <span className={`chord-name${className ? ' ' + className : ''}`} data-chord={name}>{children ?? name}</span>
}
/** Several chord names in a row ("G – D – Em – C"), each one pressable. */
export function ChordList({ names, sep = ' – ' }: { names: string[]; sep?: string }) {
  return <>{names.map((n, i) => <span key={i}>{i > 0 && sep}<ChordName name={n} /></span>)}</>
}
