// A song's tempo over time: one tempo, or a Guitar Pro file's tempo changes (each from a beat on). Turns beats into
// seconds and back, so the In time clock, Hear it, the video sync and the Game Mode highway all follow the changes.
// Playback speed (½, ¾, the speed trainer) scales the whole map: `scale` = song tempo ÷ playback tempo.

export interface TempoPoint { beat: number; bpm: number }

export class TempoMap {
  /** the song's main tempo (the first one) */
  readonly base: number
  private pts: { beat: number; bpm: number; sec: number }[]

  constructor(base: number, points: TempoPoint[] = []) {
    const clean = points.filter(p => p.bpm > 0 && p.beat >= 0).sort((a, b) => a.beat - b.beat)
    const first = clean.length && clean[0].beat <= 1e-6 ? clean[0].bpm : base
    this.base = first > 0 ? first : 90
    const list: { beat: number; bpm: number; sec: number }[] = [{ beat: 0, bpm: this.base, sec: 0 }]
    for (const p of clean) {
      const last = list[list.length - 1]
      if (Math.abs(p.bpm - last.bpm) < 1e-6) continue
      if (p.beat <= last.beat + 1e-6) { last.bpm = p.bpm; continue }
      list.push({ beat: p.beat, bpm: p.bpm, sec: last.sec + ((p.beat - last.beat) * 60) / last.bpm })
    }
    this.pts = list
  }

  /** does the tempo change anywhere */
  get changes() { return this.pts.length > 1 }
  /** the changes after the first tempo */
  get points(): TempoPoint[] { return this.pts.slice(1).map(p => ({ beat: p.beat, bpm: p.bpm })) }

  private segAtBeat(b: number) {
    let i = this.pts.length - 1
    while (i > 0 && this.pts[i].beat > b) i--
    return this.pts[i]
  }
  private segAtSec(s: number) {
    let i = this.pts.length - 1
    while (i > 0 && this.pts[i].sec > s) i--
    return this.pts[i]
  }
  bpmAt(beat: number) { return this.segAtBeat(beat).bpm }
  /** seconds from beat 0 to `beat`, at full speed */
  sec(beat: number) {
    const p = this.segAtBeat(beat)
    return p.sec + ((beat - p.beat) * 60) / p.bpm
  }
  /** the beat at `sec` seconds from beat 0, at full speed */
  beat(sec: number) {
    const p = this.segAtSec(sec)
    return p.beat + ((sec - p.sec) * p.bpm) / 60
  }
  /** seconds per beat at `beat`, played at `playBpm` (the song's main tempo × speed) */
  spbAt(beat: number, playBpm = this.base) { return (60 / this.bpmAt(beat)) * (this.base / playBpm) }
}

/** The map for a song (its tempo changes, if it has any). */
export function songTempo(song: { tempo?: number; tempoMap?: TempoPoint[] }, fallback = 90): TempoMap {
  return new TempoMap(song.tempo ?? fallback, song.tempoMap ?? [])
}
