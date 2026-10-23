// Reads Guitar Pro files (.gp3 .gp4 .gp5 .gpx .gp) with alphaTab's importer and converts them to our Song model.
import { importer, Settings, model } from '@coderline/alphatab'
import type { Song, SongBar, SongNote, SongTrack } from './model'

const QUARTER_TICKS = 960

function techOf(n: model.Note): string | undefined {
  if (n.isDead) return 'x'
  if (n.isHammerPullOrigin && n.hammerPullDestination) return n.hammerPullDestination.fret >= n.fret ? 'h' : 'p'
  if (n.slideOutType !== model.SlideOutType.None) return n.slideOutType === model.SlideOutType.OutDown ? '\\' : '/'
  if (n.hasBend) return 'b'
  if (n.vibrato !== model.VibratoType.None) return '~'
  return undefined
}

export function importGuitarPro(bytes: Uint8Array, fileName = 'Song'): Song {
  const score = importer.ScoreLoader.loadScoreFromBytes(bytes, new Settings())
  const tracks: SongTrack[] = []
  for (const t of score.tracks) {
    if (t.isPercussion) continue
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
      return { steps }
    })
    tracks.push({ name: t.name?.trim() || `Track ${tracks.length + 1}`, tuning, capo, bars })
  }
  if (!tracks.length) throw new Error('No guitar tracks found in this file.')
  const title = score.title?.trim() || fileName.replace(/\.[^.]+$/, '')
  return { title, artist: score.artist?.trim() || undefined, tempo: score.tempo || undefined, tracks }
}
