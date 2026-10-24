// The KGuitar poster (the owner's samurai-lab illustration): a small framed thumbnail that opens the full
// picture when tapped. In the full view, tap to zoom in and drag around the details; tap again to fit.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { setShowArt, useUi } from '../ui'
import { useActiveTheme } from '../theme'
import { psySrc } from './PsyArt'

export function useShowArt(): [boolean, (v: boolean) => void] {
  return [useUi().showArt, setShowArt]
}

export function ArtThumb({ className = '', label = 'Open the KGuitar poster' }: { className?: string; label?: string }) {
  const [show] = useShowArt()
  const [open, setOpen] = useState(false)
  // Psychedelic mode: her face in a round, glowing frame instead of the whole poster
  const psy = useActiveTheme() === 'psy'
  if (!show) return null
  return (
    <>
      <button className={`art-thumb ${className}${psy ? ' psy-thumb' : ''}`} onClick={() => setOpen(true)} aria-label={label} title="KGuitar poster">
        <img src={psy ? psySrc('face') : 'art.jpg'} alt="" loading="lazy" decoding="async" />
      </button>
      {open && <ArtViewer onClose={() => setOpen(false)} />}
    </>
  )
}

export function ArtViewer({ onClose }: { onClose: () => void }) {
  const [zoom, setZoom] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  // zooming in starts on her face and helmet
  useEffect(() => {
    const b = box.current
    if (!zoom || !b) return
    const img = b.querySelector('img')
    if (!img) return
    b.scrollTo({ left: img.offsetWidth * 0.48 - b.clientWidth / 2, top: img.offsetHeight * 0.22 - b.clientHeight / 2 })
  }, [zoom])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [onClose])
  return createPortal(
    <div ref={box} className={`art-viewer${zoom ? ' zoom' : ''}`} role="dialog" aria-modal="true" aria-label="KGuitar poster" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <img src="art.jpg" alt="A chocolate lab samurai in a horned helmet, drawing her katana, with a neon green Stratocaster, under a full moon over waves and a lava field"
        onClick={() => setZoom(z => !z)} />
      <button className="btn sm art-close" onClick={onClose}>Close</button>
      <span className="art-hint small">{zoom ? 'Drag to look around. Tap to fit.' : 'Tap to zoom in.'}</span>
    </div>,
    document.body,
  )
}
