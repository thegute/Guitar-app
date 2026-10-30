import { useEffect, useState, type ReactNode } from 'react'
import { KEYS } from '../theory/notes'

export function Chips<T extends string | number>({ items, value, onChange, label, wrap, keyStyle, find }: {
  items: { id: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  label: string
  wrap?: boolean
  keyStyle?: boolean
  /** a name search uses to point at these chips (data-find) */
  find?: string
}) {
  return (
    <div className={`chips${wrap ? ' wrap' : ''}`} role="group" aria-label={label} data-find={find}>
      {items.map(it => (
        <button key={String(it.id)} className={`chip${keyStyle ? ' key' : ''}`} aria-pressed={it.id === value} onClick={() => onChange(it.id)}>
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function KeyPicker({ value, onChange, label = 'Key' }: { value: string; onChange: (k: string) => void; label?: string }) {
  return <Chips label={label} items={KEYS.map(k => ({ id: k, label: k }))} value={value} onChange={onChange} keyStyle />
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

/** Remember a setting between sessions (best effort). */
export function usePersist<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem('kg:' + key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('kg:' + key, JSON.stringify(v))
    } catch {
      /* storage unavailable */
    }
  }, [key, v])
  return [v, setV]
}
