// Pure timing math for the Visual Count-in & First-Beat Cue Bar (shared by Play and Looper).

export interface CueState {
  phase: 'count' | 'drop' | 'play'
  /** 1-based beat inside the current bar (1..meter) */
  beat: number
  /** 1-based bar number (1..countBars during count-in, 1..N during playback) */
  bar: number
  /** Total bars in the count-in (1 or 2), 0 during playback */
  countBars: number
  /** 0..1 fraction inside the current beat */
  beatFrac: number
  /** 0..1 sweep progress toward Beat 1 of Bar 1 during count-in */
  countFrac: number
  /** True on Beat 1 of each bar while lit */
  isBeatOne: boolean
  /** True during the first-beat drop flash on Beat 1 of Bar 1 */
  isFirstDrop: boolean
  /** True on the final 2 count-in beats of a swung/compound groove ("3 & 4 &") */
  showAnd: boolean
}

export function cueStateFromBeats(opts: {
  beatNow: number
  fromBeat: number
  meter?: number
  countInTotal: number
  swung?: boolean
}): CueState {
  const meter = Math.max(1, Math.round(opts.meter ?? 4))
  const { beatNow, fromBeat, swung } = opts

  if (beatNow < fromBeat - 1e-4) {
    const total = Math.max(meter, Math.round(opts.countInTotal || meter))
    const countBars = Math.max(1, Math.ceil(total / meter))
    const left = Math.max(0, fromBeat - beatNow)
    const gone = Math.max(0, total - left)
    const beatIdx = Math.min(total - 1, Math.floor(gone + 1e-4))
    const bar = Math.min(countBars, Math.floor(beatIdx / meter) + 1)
    const beat = (beatIdx % meter) + 1
    const beatFrac = Math.max(0, Math.min(1, gone - Math.floor(gone)))
    const countFrac = Math.max(0, Math.min(1, gone / total))
    return {
      phase: 'count',
      beat,
      bar,
      countBars,
      beatFrac,
      countFrac,
      isBeatOne: beat === 1,
      isFirstDrop: false,
      showAnd: !!swung && left <= 2.05,
    }
  }

  const into = Math.max(0, beatNow - fromBeat)
  const bar = Math.floor(into / meter) + 1
  const inBar = into % meter
  const beat = Math.min(meter, Math.floor(inBar + 1e-4) + 1)
  const beatFrac = Math.max(0, Math.min(1, inBar - Math.floor(inBar)))
  const isFirstDrop = into < 0.55
  const isBeatOne = beat === 1 && beatFrac < 0.35

  return {
    phase: isFirstDrop ? 'drop' : 'play',
    beat,
    bar,
    countBars: 0,
    beatFrac,
    countFrac: 1,
    isBeatOne,
    isFirstDrop,
    showAnd: false,
  }
}
