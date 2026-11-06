// Reads Guitar Pro files (.gp3 .gp4 .gp5 .gpx .gp) with alphaTab's importer and converts them to our Song model.
import { importer, Settings, model } from '@coderline/alphatab'
import type { Song, SongBar, SongNote, SongTrack } from './model'
import { gmDrum, type DrumHit } from '../audio/band'

const QUARTER_TICKS = 960

function techOf(n: model.Note): string | undefined {
  if (n.isDead) return 'x'
  if (n.isPalmMute) return 'PM'
  if (n.isHammerPullOrigin && n.hammerPullDestination) return n.hammerPullDestination.fret >= n.fret ? 'h' : 'p'
  if (n.slideOutType !== model.SlideOutType.None) return n.slideOutType === model.SlideOutType.OutDown ? '\\' : '/'
  if (n.hasBend) return 'b'
  if (n.vibrato !== model.VibratoType.None) return '~'
  return undefined
}

export function importGuitarPro(bytes: Uint8Array, fileName = 'Song'): Song {
  const score = importer.ScoreLoader.loadScoreFromBytes(bytes, new Settings())
  const tracks: SongTrack[] = []
  // every bar's length from the time signature, so all parts line up (empty or short bars are padded with a rest)
  const barLen = score.masterBars.map(mb => mb.calculateDuration() / QUARTER_TICKS)
  const barStart: number[] = []
  barLen.reduce((a, l, i) => { barStart[i] = a; return a + l }, 0)
  const drums: DrumHit[] = []
  for (const t of score.tracks) {
    if (t.isPercussion || t.staves.every(s => s.isPercussion)) {
      // the drum part, for "play with the band"
      for (const staff of t.staves) staff.bars.forEach((bar, bi) => {
        for (const v of bar.voices) for (const b of v.beats) {
          if (b.isRest || b.isEmpty) continue
          const vel = 0.4 + 0.6 * Math.min(1, Math.max(0, (b.dynamics ?? 5) / 7))
          for (const n of b.notes) {
            const art = n.percussionArticulation
            const midi = t.percussionArticulations?.[art]?.outputMidiNumber ?? (art >= 0 ? art : n.fret)
            let voice = gmDrum(midi)
            if (!voice) continue
            if (voice === 'snare' && n.isGhost) voice = 'ghost'
            drums.push({ beat: (barStart[bi] ?? 0) + b.playbackStart / QUARTER_TICKS, voice, vel: n.isGhost ? vel * 0.5 : vel })
          }
        }
      })
      continue
    }
    const staff = t.staves.find(s => s.isStringed && !s.isPercussion && s.tuning.length >= 4)
    if (!staff) continue
    // alphaTab lists the tuning highest string first, and numbers strings from 1 = lowest
    const tuning = staff.tuning.slice().reverse()
    const capo = staff.capo || 0
    const bars: SongBar[] = staff.bars.map(bar => {
      const voice = bar.voices[0]
      const steps = (voice?.beats ?? [])
        .filter(b => !b.isEmpty)
        .map(b => {
          const notes: SongNote[] = b.isRest
            ? []
            : b.notes
                .filter(n => !n.isTieDestination && n.string >= 1 && n.string <= tuning.length)
                .map(n => ({ string: n.string - 1, fret: n.fret, midi: tuning[n.string - 1] + capo + n.fret, tech: techOf(n) }))
                .sort((a, b) => a.string - b.string)
          return { notes, dur: b.playbackDuration / QUARTER_TICKS, chord: b.chord?.name?.trim() || undefined }
        })
      const len = steps.reduce((a, x) => a + x.dur, 0)
      const want = barLen[staff.bars.indexOf(bar)]
      if (want && len < want - 1e-3) steps.push({ notes: [], dur: Math.round((want - len) * 1000) / 1000, chord: undefined })
      return { steps }
    })
    const program = t.playbackInfo?.program
    tracks.push({ name: t.name?.trim() || `Track ${tracks.length + 1}`, tuning, capo, bars, ...(typeof program === 'number' ? { program } : {}) })
  }
  if (!tracks.length) throw new Error('No guitar tracks found in this file.')
  const title = score.title?.trim() || fileName.replace(/\.[^.]+$/, '')
  drums.sort((a, b) => a.beat - b.beat)
  // the time signature and every tempo change, exactly as the file has them
  const mb0 = score.masterBars[0]
  const num = mb0?.timeSignatureNumerator ?? 4, den = mb0?.timeSignatureDenominator ?? 4
  const quarters = (num * 4) / den
  const tempoMap: { beat: number; bpm: number }[] = []
  score.masterBars.forEach((mb, i) => {
    const autos = (mb as unknown as { tempoAutomations?: model.Automation[] }).tempoAutomations ?? (mb.tempoAutomation ? [mb.tempoAutomation] : [])
    for (const a of autos) if (a && a.value > 0) tempoMap.push({ beat: Math.round(((barStart[i] ?? 0) + (a.ratioPosition || 0) * (barLen[i] ?? 0)) * 1000) / 1000, bpm: a.value })
  })
  const tempo = score.tempo || tempoMap[0]?.bpm || undefined
  const changes = tempoMap.filter((p, k) => p.beat > 0 && Math.abs(p.bpm - (k ? tempoMap[k - 1].bpm : tempo ?? p.bpm)) > 0.01)
  return {
    title, artist: score.artist?.trim() || undefined, tempo, ...(tempo ? { tempoFrom: 'file' as const } : {}), tracks,
    ...(drums.length ? { drums } : {}),
    ...(num !== 4 || den !== 4 ? { timeSig: [num, den] as [number, number] } : {}),
    ...(Number.isInteger(quarters) && quarters !== 4 ? { meter: quarters } : {}),
    ...(changes.length ? { tempoMap: changes } : {}),
  }
}
