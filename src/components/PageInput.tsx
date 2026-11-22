// Editable page-number input shared across every PDF viewer (Books, Course Studio, Floating Book Ref,
// Floating Lesson Tab, and PDF page picker). Lets you freely delete all digits and type a multi-digit
// page number (e.g. clear "1" and type "33") without ever snapping back to "1" mid-edit.
import { useEffect, useRef, useState, type CSSProperties } from 'react'

export interface PageInputProps {
  value: number
  min?: number
  max: number
  onChange: (page: number) => void
  className?: string
  style?: CSSProperties
  'aria-label'?: string
  'data-testid'?: string
}

export function PageInput({
  value,
  min = 1,
  max,
  onChange,
  className = 'input tabular',
  style,
  'aria-label': ariaLabel = 'Page number',
  'data-testid': testId,
}: PageInputProps) {
  const hi = Math.max(min, max || min)
  const clamp = (n: number) => Math.max(min, Math.min(hi, Math.round(n)))

  const [draft, setDraft] = useState(() => String(value))
  const focusedRef = useRef(false)
  const lastCommittedRef = useRef(value)

  // Sync draft when page changes externally (Prev/Next buttons, TOC, bookmarks, switching books/lessons)
  useEffect(() => {
    if (!focusedRef.current || value !== lastCommittedRef.current) {
      setDraft(String(value))
      lastCommittedRef.current = value
    }
  }, [value])

  const commit = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) {
      setDraft(String(value))
      return
    }
    const next = clamp(parseInt(digits, 10))
    lastCommittedRef.current = next
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      value={draft}
      style={style}
      aria-label={ariaLabel}
      data-testid={testId}
      onFocus={e => {
        focusedRef.current = true
        const el = e.currentTarget
        el.select()
        // Android WebView sometimes resets selection on the next frame after focus
        requestAnimationFrame(() => { if (document.activeElement === el) el.select() })
      }}
      onChange={e => {
        const digits = e.target.value.replace(/\D/g, '')
        setDraft(digits)
        if (!digits) return
        const n = parseInt(digits, 10)
        if (!Number.isNaN(n) && n >= min && n <= hi) {
          lastCommittedRef.current = n
          if (n !== value) onChange(n)
        }
      }}
      onBlur={() => {
        focusedRef.current = false
        commit(draft)
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit(draft)
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setDraft(String(value))
          e.currentTarget.blur()
        }
      }}
    />
  )
}
