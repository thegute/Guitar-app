// Tapping a search result: go there, already set up (the chord, the scale, the tempo, the tuning, the jam).
import { go, openInPlay, openJam, openSongs, learnGo, playAction, remount, openExercise } from '../nav'
import type { Go } from '../learn/path'
import { current, setTuning } from '../instrument'
import { getSong, refreshBuiltIn } from '../tabs/library'
import { loadSongbookDoc } from '../tabs/songbookDocs'
import { exampleDoc } from '../tabs/examples'
import { STYLE_DEFAULTS } from '../theory/progressions'
import type { Target } from './types'

const put = (k: string, v: unknown) => {
  try { localStorage.setItem('kg:' + k, JSON.stringify(v)) } catch { /* storage unavailable */ }
}

function launchGo(g: Go) {
  if ('tab' in g) go(g.tab)
  else if ('songs' in g) openSongs(g.songs)
  else if ('jam' in g) openJam(g.jam)
  else if ('song' in g) void getSong(g.song).then(doc => (doc ? openInPlay(g.loop ? { ...doc, loop: g.loop } : doc) : go('play')))
  else if ('songbook' in g) void loadSongbookDoc(g.songbook.song, g.songbook.part, current()).then(doc => (doc ? openInPlay(doc) : openSongs('songbook')))
  else learnGo(g)
}

export function launch(t: Target) {
  if ('go' in t) return launchGo(t.go)
  if ('play' in t) return playAction(t.play)
  if ('guide' in t) return learnGo({ guide: t.guide })
  if ('exercise' in t) return openExercise(t.exercise)
  if ('example' in t) {
    void refreshBuiltIn(exampleDoc(t.example, current().tuning.notes)).then(openInPlay)
    return
  }
  if ('tool' in t) { go(t.tool); return }
  if ('chord' in t) {
    put('chordRoot', t.chord.root)
    put('chordSuffix', t.chord.suffix)
    remount(); go('chords'); return
  }
  if ('scale' in t) {
    if (t.scale.root) put('scaleRoot', t.scale.root)
    put('scaleId', t.scale.scale)
    remount(); go('scales'); return
  }
  if ('tuning' in t) {
    setTuning(current().id, t.tuning)
    remount(); go('tuner'); return
  }
  if ('metronome' in t) {
    if (t.metronome.bpm) put('bpm', t.metronome.bpm)
    if (t.metronome.sig) put('sig', t.metronome.sig)
    remount(); go('metronome'); return
  }
  if ('jam' in t) {
    const j = t.jam
    if (j.key || j.style) {
      if (j.key) put('progKey', j.key)
      if (j.style) put('progStyle', j.style)
      const mode = j.mode ?? (j.style ? STYLE_DEFAULTS[j.style].mode : undefined) ?? (j.key ? 'major' : undefined)
      if (mode) put('progMode', mode)
      put('progBpm', j.bpm ?? (j.style ? STYLE_DEFAULTS[j.style].bpm : 90))
      // an empty progression makes Jam write a new one in the new key and style
      put('jamProg', [])
    }
    remount()
    openJam(j.page ?? 'jam')
  }
}
