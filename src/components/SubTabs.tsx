// Tabs across the top of a screen (Songs, Learn, Jam, Tools, Settings): one row of big, equal buttons that
// split a long screen into a few short pages. The choice is remembered per screen.
import { usePersist } from './Controls'

export interface SubTab<T extends string> { id: T; label: string; badge?: string | number | null }

export function SubTabs<T extends string>({ tabs, value, onChange, label, className = '' }: {
  tabs: SubTab<T>[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div className={`subtabs ${className}`} role="tablist" aria-label={label} style={{ ['--n' as string]: tabs.length }}>
      {tabs.map(t => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => {
          onChange(t.id)
          document.getElementById('main')?.scrollTo({ top: 0 })
        }}>
          {t.label}{t.badge !== undefined && t.badge !== null && t.badge !== '' ? <i className="subtab-badge">{t.badge}</i> : null}
        </button>
      ))}
    </div>
  )
}

/** The remembered sub-tab of a screen (falls back to the first one if a saved choice no longer exists). */
export function useSubTab<T extends string>(key: string, ids: readonly T[], initial?: T): [T, (v: T) => void] {
  const [v, set] = usePersist<T>(`sub:${key}`, initial ?? ids[0])
  return [ids.includes(v) ? v : (initial ?? ids[0]), set]
}
