// Simple line icons drawn for this app.
const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const IconTuner = () => (
  <svg viewBox="0 0 24 24" {...s}><path d="M4 16a8 8 0 0 1 16 0" /><path d="M12 16l4-6" /><circle cx="12" cy="16" r="1.2" fill="currentColor" /></svg>
)
export const IconMetronome = () => (
  <svg viewBox="0 0 24 24" {...s}><path d="M9 3h6l4 18H5L9 3z" /><path d="M12 16l5-8" /><path d="M7.5 15h9" /></svg>
)
export const IconChord = () => (
  <svg viewBox="0 0 24 24" {...s}><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M5 8h14M5 13h14M10 3v18M14 3v18" /><circle cx="10" cy="10.5" r="1.4" fill="currentColor" /><circle cx="14" cy="15.5" r="1.4" fill="currentColor" /></svg>
)
export const IconScale = () => (
  <svg viewBox="0 0 24 24" {...s}><path d="M3 7h18M3 12h18M3 17h18" /><circle cx="7" cy="17" r="1.6" fill="currentColor" /><circle cx="11" cy="12" r="1.6" fill="currentColor" /><circle cx="15" cy="7" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></svg>
)
export const IconProgression = () => (
  <svg viewBox="0 0 24 24" {...s}><rect x="3" y="6" width="5" height="12" rx="1" /><rect x="10" y="6" width="5" height="12" rx="1" /><path d="M17.5 8.5l3 3.5-3 3.5" /></svg>
)
export const IconPlay = () => (<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 5l12 7-12 7z" /></svg>)
export const IconStop = () => (<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>)
export const IconLock = ({ locked }: { locked: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...s}><rect x="5" y="11" width="14" height="9" rx="1.5" />{locked ? <path d="M8 11V8a4 4 0 0 1 8 0v3" /> : <path d="M8 11V8a4 4 0 0 1 7.5-2" />}</svg>
)
export const IconDice = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...s}><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1.3" fill="currentColor" /><circle cx="15" cy="15" r="1.3" fill="currentColor" /><circle cx="15" cy="9" r="1.3" fill="currentColor" /><circle cx="9" cy="15" r="1.3" fill="currentColor" /></svg>
)
