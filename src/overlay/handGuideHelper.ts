// Pure helpers converting any chord voicing or pentatonic/scale box into a HandGroup
// for the horizontal 1-2-3-4 "Where to put your fingers" HandShape diagram.
import type { Voicing } from '../theory/chords'
import type { HandGroup, HandNote } from '../play/handShape'

/** Convert a chord Voicing (frets + fingers + barres) into a 4-fret HandGroup for HandShape. */
export function voicingToHandGroup(v: Voicing): HandGroup {
  const fretted = v.frets.filter(f => f > 0)
  const minF = fretted.length ? Math.min(...fretted) : 1
  const maxF = fretted.length ? Math.max(...fretted) : 1
  const open = maxF <= 4
  const base = open ? 1 : minF

  const notes: HandNote[] = []
  v.frets.forEach((f, s) => {
    if (f < 0) return
    if (f === 0) {
      notes.push({ string: s, fret: 0, finger: 0 })
      return
    }
    const rawFin = v.fingers?.[s]
    const finger = typeof rawFin === 'number' && rawFin >= 1 && rawFin <= 4
      ? rawFin
      : Math.max(1, Math.min(4, f - base + 1))
    notes.push({ string: s, fret: f, finger })
  })

  let barre: HandGroup['barre']
  if (v.barres && v.barres.length > 0) {
    const bf = v.barres[0]
    const onFret = notes.filter(n => n.fret === bf)
    if (onFret.length >= 2) {
      const strings = onFret.map(n => n.string).sort((a, b) => a - b)
      const finger = onFret[0].finger || 1
      barre = { finger, fret: bf, strings }
    }
  }

  return { from: 0, to: 1, base, open, notes, barre }
}

export interface ScaleBoxHand {
  label: string
  group: HandGroup
}

/**
 * Build the 5 standard 2-note-per-string pentatonic hand boxes (major or minor) up the neck,
 * each mapped to exact 1 (index) – 4 (pinky) fingers for the HandShape diagram.
 */
export function scaleBoxesToHandGroups(rootPc: number, minor: boolean, tuning: number[]): ScaleBoxHand[] {
  // Pentatonic intervals from root: minor = [0, 3, 5, 7, 10], major = [0, 2, 4, 7, 9]
  const ivs = minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9]
  const scaleSet = new Set(ivs.map(i => (rootPc + i) % 12))
  const lowPc = ((tuning[0] ?? 40) % 12 + 12) % 12

  // Find the 5 starting frets on the lowest string belonging to the scale (in 0..11)
  const starts: number[] = []
  for (let f = 0; f < 12; f++) {
    if (scaleSet.has((lowPc + f) % 12)) starts.push(f)
  }

  // Reorder so Box 1 starts on the tonic (rootPc) on the low E string
  const rootStartIdx = starts.findIndex(f => (lowPc + f) % 12 === rootPc)
  const ordered = rootStartIdx > 0
    ? [...starts.slice(rootStartIdx), ...starts.slice(0, rootStartIdx)]
    : starts

  return ordered.slice(0, 5).map((startFret, idx) => {
    const collect = (winStart: number) => {
      const open = winStart <= 0
      const base = open ? 1 : winStart
      const maxFret = open ? 3 : base + 3
      const notes: HandNote[] = []
      for (let s = 0; s < tuning.length; s++) {
        const sPc = ((tuning[s] % 12) + 12) % 12
        for (let f = open ? 0 : base; f <= maxFret; f++) {
          if (!scaleSet.has((sPc + f) % 12)) continue
          const finger = f === 0 ? 0 : Math.max(1, Math.min(4, f - base + 1))
          notes.push({ string: s, fret: f, finger })
        }
      }
      return { open, base, notes }
    }

    // Try anchoring index finger on startFret vs startFret - 1 (handles Box 2 / Box 5 where middle finger starts on low E!)
    const a = collect(startFret)
    const b = startFret > 0 ? collect(startFret - 1) : a
    const best = b.notes.length > a.notes.length ? b : a
    const posLabel = best.open ? 'Open' : `Fret ${best.base}`
    return {
      label: `Box ${idx + 1} (${posLabel})`,
      group: { from: 0, to: 1, base: best.base, open: best.open, notes: best.notes },
    }
  })
}
