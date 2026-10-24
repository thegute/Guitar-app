// Calmer screens: a section that folds away to one line (its title and a short summary, e.g. "2 of 3 done"),
// and a small ⓘ that shows a section's explanation only when you want it. Nothing is removed, just tucked in.
import { useState, type ReactNode } from 'react'
import { usePersist } from './Controls'
import { IconChevron } from './Icons'

/** A small ⓘ button and the text it reveals: put the button in a header, the text below it. */
export function useHint(text: ReactNode, label = 'What is this?'): [ReactNode, ReactNode] {
  const [open, setOpen] = useState(false)
  const button = (
    <button className="hint-btn" aria-expanded={open} aria-label={label} title={label}
      onClick={e => { e.stopPropagation(); setOpen(!open) }}>i</button>
  )
  const body = open ? <p className="hint-text small">{text}</p> : null
  return [button, body]
}

export function Fold({ id, title, summary, hint, defaultOpen = false, children, className = '' }: {
  /** remembered per section */
  id: string
  title: ReactNode
  /** one short line shown on the header (progress, current choice …) */
  summary?: ReactNode
  /** the section's explanation, behind an ⓘ */
  hint?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}) {
  const [open, setOpen] = usePersist(`fold:${id}`, defaultOpen)
  const [hintBtn, hintText] = useHint(hint ?? null)
  return (
    <section className={`panel fold${open ? ' open' : ''} ${className}`} aria-label={typeof title === 'string' ? title : undefined}>
      <div className="fold-head">
        <button className="fold-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="fold-title">{title}</span>
          {summary !== undefined && <span className="fold-sum small muted">{summary}</span>}
          <IconChevron open={open} />
        </button>
        {hint ? hintBtn : null}
      </div>
      {hint ? hintText : null}
      {open && <div className="fold-body stack">{children}</div>}
    </section>
  )
}
