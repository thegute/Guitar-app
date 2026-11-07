// One scan from sound (a file, a screen grab's inside-the-phone sound, a mic recording), in passes:
//   1 at once     the beat grid (Beat This! when it's downloaded, else the built-in detector) and a quick draft of the
//                 notes (Basic Pitch, seconds) → a tab to look at straight away
//   2 alongside   the AI listens to the same clip (Gemini): song, chords with times, key, tempo, time, strum,
//                 techniques, talking/singing → chord names on the tab, talking/singing taken out, tempo settled
//   3 background  the guitar-note model (much more accurate) works through it chunk by chunk; after the first chunk it
//                 knows how long it will take and asks when that's over 2 minutes → "Better version ready"
//   backup        no guitar model (not downloaded, or it heard almost nothing): the AI writes the notes (rough)
import type { SongDoc } from '../tabs/library'
import { newId } from '../tabs/library'
import type { Instrument } from '../instrument'
import { analyse } from '../audio/tempo'
import { haveModel } from '../ml/models'
import { beatGrid, guitarNotes } from '../ml/run'
import type { BeatGrid, Note } from '../ml/post'
import { notesToSong } from '../ml/toTab'
import { aiListen, withoutVoice, type Heard } from './listen'
import { aiSettings } from '../assistant/providers'
import { markTechniques, type Evidence } from '../ml/legato'

export type Pass = 'idle' | 'running' | 'ready' | 'done' | 'used' | 'failed' | 'skipped'
export interface ScanState {
  draft: SongDoc | null
  better: SongDoc | null
  betterPass: Pass
  betterPct: number
  betterNote: string
  /** guitar-note model isn't on the phone yet */
  needModels: boolean
  /** waiting for "keep going?" (seconds it will take) */
  askLong: number | null
  ai: Pass
  aiNote: string
  heard: Heard | null
  grid: BeatGrid | null
  /** bars to check (chord and notes disagree), per version */
  check: { draft: number[]; better: number[] }
  how: string
  error: string
}

export interface ScanInput {
  x: Float32Array
  sr: number
  title: string
  inst: Instrument
  youtube?: string
  /** how the sound was got, in words ("the sound of song.mp3") */
  source: string
  /** keep notes played while singing (Riff Scanner's "Include singing") */
  keepSinging?: boolean
}

const canHear = () => !!aiSettings().keys.gemini

export class SoundScan {
  state: ScanState = { draft: null, better: null, betterPass: 'idle', betterPct: 0, betterNote: '', needModels: false, askLong: null, ai: 'idle', aiNote: '', heard: null, grid: null, check: { draft: [], better: [] }, how: '', error: '' }
  private ctrl = new AbortController()
  private draftNotes: Note[] = []
  /** pitch contours + pick clicks from the quick draft: also used to mark techniques on the better version's notes */
  private evidence: Evidence | null = null
  private marked = false
  private betterNotes: Note[] | null = null
  private longAnswer: ((go: boolean) => void) | null = null
  private bpmGuess = 90
  constructor(private inp: ScanInput, private onChange: (s: ScanState) => void, private onStage?: (id: string, p: { state?: 'run' | 'done' | 'skip' | 'fail'; note?: string; pct?: number }) => void) {}

  private set(p: Partial<ScanState>) { this.state = { ...this.state, ...p }; this.onChange(this.state) }
  cancel() { this.ctrl.abort(); this.longAnswer?.(false) }
  /** answer "keep going?" */
  answerLong(go: boolean) { this.longAnswer?.(go); this.longAnswer = null; this.set({ askLong: null }) }

  /** Pass 1 (and starts 2 and 3). Resolves when there's a first tab to show. */
  async start(): Promise<void> {
    const { x, sr } = this.inp
    const signal = this.ctrl.signal
    const beatsHere = await haveModel('beats').catch(() => false)
    const notesHere = await haveModel('notes').catch(() => false)
    // 2 the AI, alongside (asks for notes too when the guitar model can't run)
    const aiP = canHear() ? this.listen(!notesHere) : null
    if (!aiP) this.set({ ai: 'skipped', aiNote: 'No Gemini key: chord names and tempo check skipped.' })
    // 1a the beat grid
    this.onStage?.('beats', { state: 'run' })
    let grid: BeatGrid | null = null
    if (beatsHere) {
      try { grid = await beatGrid(x, sr, { signal, onProgress: p => this.onStage?.('beats', { pct: p }) }) } catch (e) { if (signal.aborted) throw e }
    }
    if (!grid) {
      const a = analyse(x, sr)
      if (a) { this.bpmGuess = Math.round(a.bpm); grid = a.beats.length >= 4 ? { bpm: a.bpm, beatsPerBar: a.meter.num > 6 ? 4 : a.meter.num, firstDownbeat: a.firstDownbeat, beats: a.beats, downbeats: [], steady: a.confidence } : null }
    } else this.bpmGuess = grid.bpm
    this.set({ grid })
    this.onStage?.('beats', { state: grid ? 'done' : 'skip', note: grid ? `${Math.round(grid.bpm)} BPM, ${grid.beatsPerBar} a bar${beatsHere ? '' : ' (quick detector)'}` : 'no clear beat' })
    // 1b the quick draft
    this.onStage?.('draft', { state: 'run', pct: 0 })
    const { scanNotes } = await import('../audio/transcribe')
    const quick = await scanNotes(x.slice(0, sr * 240), sr, p => this.onStage?.('draft', { pct: p }))
    if (signal.aborted) throw new Error('Cancelled.')
    this.draftNotes = quick.notes
    this.evidence = quick.evidence
    this.marked = quick.marked
    const moves = quick.notes.filter(n => n.tech).length
    this.onStage?.('draft', { state: 'done', note: `${this.draftNotes.length} notes${moves ? `, ${moves} hammer-ons / pull-offs / slides / bends` : ''}` })
    this.rebuild()
    if (!this.state.draft) {
      // nothing clear yet: wait for the better pass / the AI before giving up
      this.set({ how: '' })
    }
    // 3 the better version (background)
    if (notesHere) void this.runBetter()
    else this.set({ needModels: true, betterPass: 'skipped' })
    void aiP
  }

  private async listen(withNotes: boolean) {
    this.set({ ai: 'running', aiNote: 'Gemini is listening (chords, tempo, talking)…' })
    try {
      const h = await aiListen(this.inp.x, this.inp.sr, { inst: this.inp.inst.isUke ? 'ukulele' : 'guitar', notes: withNotes, signal: this.ctrl.signal })
      const bits = [h.song && `it's ${h.song}${h.artist ? ` (${h.artist})` : ''}`, h.chords.length && `${h.chords.length} chord changes`, h.voice.length && `${h.voice.some(v => v.kind === 'talk') ? 'talking' : 'singing'} taken out`, h.strum && `strum ${h.strum}`].filter(Boolean)
      this.set({ heard: h, ai: 'done', aiNote: bits.length ? `Gemini: ${bits.join(', ')}.` : 'Gemini listened: nothing to add.' })
      this.rebuild()
      // backup: no guitar model (or it stopped) and the quick draft heard little → the AI's own notes (rough)
      if (this.draftNotes.length < 6 && !this.betterNotes && h.notes?.length && this.state.betterPass !== 'running') {
        this.rebuild(h.notes, 'ai')
        this.set({ betterPass: 'ready' })
      }
    } catch (e) {
      if (this.ctrl.signal.aborted) return
      this.set({ ai: 'failed', aiNote: `Gemini couldn't listen (${e instanceof Error ? e.message : 'error'}).` })
    }
  }

  /** Download done (or already there): run the better pass. */
  async runBetter() {
    if (this.state.betterPass === 'running') return
    this.set({ needModels: false, betterPass: 'running', betterPct: 0, betterNote: 'Starting the guitar-note model…', error: '' })
    try {
      const r = await guitarNotes(this.inp.x, this.inp.sr, {
        signal: this.ctrl.signal,
        onProgress: (f, note) => this.set({ betterPct: f, betterNote: note }),
        confirm: secs => new Promise<boolean>(res => { this.longAnswer = res; this.set({ askLong: secs }) }),
      })
      // the same technique marks as the draft (its pitch contours and pick clicks cover the first 4 minutes)
      this.betterNotes = this.marked && this.evidence ? markTechniques(r.notes, this.evidence) : r.notes
      if (r.notes.length < 6 && canHear() && !this.state.heard?.notes) {
        // it heard almost nothing clear (a busy full band?): ask the AI for its own notes as a backup
        this.set({ betterPass: 'failed', betterNote: 'The guitar model heard almost nothing clear: asking Gemini for a rough version…' })
        await this.listen(true)
        if (this.state.heard?.notes?.length) { this.rebuild(this.state.heard.notes, 'ai'); return }
      }
      this.rebuild(this.betterNotes, 'better')
      this.set({ betterPass: 'ready', betterNote: `${this.betterNotes.length} notes, in ${Math.round(r.secs)} s on ${r.where === 'phone' ? 'the phone' : r.where === 'webgpu' ? 'the graphics chip' : 'this browser'}` })
    } catch (e) {
      const cancelled = e instanceof Error && /Cancelled/.test(e.message)
      this.set({ betterPass: cancelled ? 'skipped' : 'failed', betterNote: cancelled ? 'Kept the quick version.' : `The guitar-note model stopped: ${e instanceof Error ? e.message : 'error'}` })
    }
  }

  /** Build (or rebuild with the AI's labels) the draft, or the better / AI version from `notes`. */
  private rebuild(notes?: Note[], which?: 'better' | 'ai') {
    const h = this.state.heard
    const make = (ns: Note[], kind: 'draft' | 'better' | 'ai') => {
      const clean = h ? withoutVoice(ns, h.voice, this.inp.keepSinging) : ns
      const report = { checkBars: [] as number[] }
      let grid = this.state.grid
      // no Beat This! grid: the AI's tempo settles half / double from the quick detector
      if (grid && h?.tempo && grid.downbeats.length === 0) {
        const r = h.tempo / grid.bpm
        if (Math.abs(r - 2) < 0.15 || Math.abs(r - 0.5) < 0.08) grid = { ...grid, bpm: h.tempo, beats: r > 1 ? grid.beats.flatMap((b, i, a) => (i + 1 < a.length ? [b, (b + a[i + 1]) / 2] : [b])) : grid.beats.filter((_, i) => i % 2 === 0) }
      }
      const song = notesToSong(clean, { tuning: this.inp.inst.midis, title: this.title(), chords: kind !== 'ai', grid, bpm: grid?.bpm ?? h?.tempo ?? this.bpmGuess, chordTimes: h?.chords, report, program: 25 })
      if (!song) return null
      const tempoFrom = this.state.grid ? 'detected' as const : h?.tempo ? 'ai' as const : 'guess' as const
      const doc: SongDoc = {
        id: this.ids[kind] ??= newId(), title: this.title(), source: 'text', inst: this.inp.inst.id, updated: Date.now(),
        song: { ...song, title: this.title(), tempoFrom, ...(h?.strum ? { strum: `custom:${h.strum}` } : {}), ...(h?.song ? { artist: h.artist } : {}) },
        ...(this.inp.youtube ? { youtube: this.inp.youtube } : {}),
      }
      return { doc, check: report.checkBars }
    }
    const d = make(this.draftNotes, 'draft')
    const howBits = [`Worked out from ${this.inp.source}`]
    if (this.state.grid) howBits.push(`beats and tempo heard (${Math.round(this.state.grid.bpm)} BPM)`)
    if (h?.techniques.length) howBits.push(`techniques heard: ${h.techniques.join(', ')}`)
    const upd: Partial<ScanState> = { how: `${howBits.join('; ')}.` }
    if (d) { upd.draft = d.doc; upd.check = { ...this.state.check, draft: d.check } }
    const src = notes ?? this.betterNotes
    if (src) {
      const b = make(src, which === 'ai' ? 'ai' : 'better')
      if (b) { upd.better = b.doc; upd.check = { ...(upd.check ?? this.state.check), better: b.check } }
      if (which === 'ai' && b) upd.betterNote = 'A rough version from Gemini (it guessed the notes by ear): check it.'
    }
    this.set(upd)
  }
  private ids: Partial<Record<'draft' | 'better' | 'ai', string>> = {}
  private title() { const h = this.state.heard; return h?.song ? h.song : this.inp.title }
}
