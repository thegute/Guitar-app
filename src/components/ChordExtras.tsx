// Under a chord in the Chords tool: hear it strummed, as an arpeggio, and the scales that fit it; and licks from every
// style that sound good over it, placed on this chord, ready to hear, learn or play along with.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Scale } from 'tonal'
import { audio } from '../audio/engine'
import { playNote, strum, activeSound, soundForProgram } from '../audio/pluck'
import { TabPlayer } from '../audio/tabPlayer'
import { flatten } from '../tabs/model'
import { useInstrument } from '../instrument'
import type { Voicing } from '../theory/chords'
import { licksForChord, lickInKey } from '../licks/generator'
import { lickStyle, LICK_STYLES, type LickStyleId } from '../licks/styles'
import { chordSymbol } from '../theory/chords'
import { pc, noteToMidi } from '../theory/notes'
import { learnGo, openInPlay, remount, go } from '../nav'
import { scaleName } from '../theory/scales'

/** The scales that fit a chord, best first, with why. */
export function scalesForChord(suffix: string): { scale: string; why: string }[] {
  const S = (scale: string, why: string) => ({ scale, why })
  const maj = [S('major', 'Every note of the major scale fits.'), S('major pentatonic', 'Five safe, sweet notes: none can clash.'), S('lydian', 'Dreamy: the raised 4th floats over the chord.')]
  const min = [S('aeolian', 'The natural minor: sad and settled.'), S('minor pentatonic', 'The rock and blues workhorse: no wrong notes.'), S('dorian', 'Minor with a hopeful 6th: soul and funk.')]
  const dom = [S('mixolydian', 'Major with a flat 7th, like the chord itself.'), S('minor blues', 'The blues scale: gritty and vocal over a 7th chord.'), S('major pentatonic', 'Sweet country and Southern-rock sound.')]
  const table: Record<string, { scale: string; why: string }[]> = {
    major: maj, add9: maj, '6': [S('major pentatonic', 'The 6th is already in it.'), ...maj.slice(0, 1)], '69': [S('major pentatonic', 'Every note of a 6/9 chord is in it.'), maj[0]],
    maj7: [maj[0], maj[2], maj[1]], maj9: [maj[0], maj[2]], maj11: [maj[2], maj[0]], maj13: [maj[2], maj[0]], 'maj7#5': [S('lydian', 'The closest common scale; the #5 is the colour.')],
    minor: min, madd9: min, '5': [min[1], S('major pentatonic', 'Power chords have no 3rd, so major works too.'), min[0]],
    m7: [min[2], min[1], min[0]], m9: [min[2], min[1]], m11: [min[2], min[1]], m6: [min[2], S('melodic minor', 'Jazz minor: a smooth, modern minor sound.')], m69: [min[2]],
    mmaj7: [S('melodic minor', 'It holds the major 7th the chord has.'), S('harmonic minor', 'Darker, classical colour.')],
    '7': dom, '9': [dom[0], dom[1]], '11': [dom[0]], '13': [dom[0], dom[2]], sus2: [dom[0], maj[1]], sus4: [dom[0], maj[1]], '7sus4': [dom[0], maj[1]],
    dim: [S('locrian', 'The scale built on the diminished chord.'), S('half-whole diminished', 'Symmetrical and tense.')],
    dim7: [S('half-whole diminished', 'Every note of the dim7 chord is in it, plus the notes between.')], m7b5: [S('locrian', 'The scale made for the half-diminished chord.')],
    aug: [S('whole tone', 'All whole steps: floating, like the chord.')], aug7: [S('whole tone', 'Matches the #5.'), S('altered', 'Maximum tension.')],
    '7b5': [S('whole tone', 'Holds the b5.')], '7b9': [S('phrygian dominant', 'Flamenco and metal tension over V7.'), S('half-whole diminished', 'Jazz choice for 7b9.')],
    '7#9': [dom[1], S('altered', 'The jazz choice for 7#9.')], alt: [S('altered', 'Made for altered dominant chords.')], '9#11': [S('lydian dominant', 'Holds the #11.')],
  }
  return table[suffix] ?? maj
}

export function ChordExtras({ root, suffix, voicing }: { root: string; suffix: string; voicing?: Voicing }) {
  const inst = useInstrument()
  const name = chordSymbol(root, suffix)
  const midis = useMemo(() => (voicing ? voicing.frets.map((f, s) => (f < 0 ? -1 : inst.midis[s] + f)).filter(m => m > 0) : []), [voicing, inst.midis])
  const lowRoot = useMemo(() => {
    const roots = midis.filter(m => m % 12 === pc(root))
    if (roots.length) return Math.min(...roots)
    let m = noteToMidi(root + '3')
    while (m < Math.min(...inst.midis)) m += 12
    return m
  }, [midis, root, inst.midis])
  const fits = scalesForChord(suffix)
  const [busy, setBusy] = useState('')
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const done = (secs: number, what: string) => { setBusy(what); clearTimeout(timer.current); timer.current = window.setTimeout(() => setBusy(''), secs * 1000) }

  const hearChord = () => { void audio().resume(); if (midis.length) strum(midis); done(1.2, 'chord') }
  const hearArp = () => {
    const ctx = audio(); void ctx.resume()
    const seq = [...midis, ...midis.slice(0, -1).reverse()]
    seq.forEach((m, i) => playNote(m, ctx.currentTime + 0.05 + i * 0.2, 0.75))
    done(seq.length * 0.2 + 0.6, 'arp')
  }
  const hearScale = (id: string) => {
    const ctx = audio(); void ctx.resume()
    const notes = Scale.get(`${root} ${id}`).notes
    if (!notes.length) return
    const up: number[] = []
    let m = lowRoot
    for (const n of [...notes, notes[0]]) {
      let x = noteToMidi(n + '0')
      while (x < m) x += 12
      up.push(x)
      m = x + 1
    }
    const seq = [...up, ...up.slice(0, -1).reverse()]
    seq.forEach((x, i) => playNote(x, ctx.currentTime + 0.05 + i * 0.22, 0.7))
    done(seq.length * 0.22 + 0.6, 'scale:' + id)
  }
  const openScale = (id: string) => {
    try { localStorage.setItem('kg:scaleRoot', JSON.stringify(root)); localStorage.setItem('kg:scaleId', JSON.stringify(id)) } catch { /* storage unavailable */ }
    remount(); go('scales')
  }

  return (
    <div className="stack chord-extras" style={{ gap: 10 }}>
      <section className="panel stack" style={{ gap: 8 }}>
        <h3 style={{ margin: 0 }}>Hear {name}</h3>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <button className={`btn${busy === 'chord' ? ' on' : ''}`} onClick={hearChord} disabled={!midis.length}>▶ The chord</button>
          <button className={`btn${busy === 'arp' ? ' on' : ''}`} onClick={hearArp} disabled={!midis.length}>▶ As an arpeggio</button>
          <button className={`btn${busy === 'scale:' + fits[0]?.scale ? ' on' : ''}`} onClick={() => hearScale(fits[0].scale)}>▶ Its scale</button>
        </div>
        <h4 style={{ margin: '4px 0 0' }}>Scales that fit {name}</h4>
        <ul className="fit-list">
          {fits.map(f => (
            <li key={f.scale}>
              <span><b>{root} {scaleName(f.scale)}</b><span className="small muted">{f.why}</span></span>
              <span className="row" style={{ gap: 4, flex: 'none' }}>
                <button className="btn sm" onClick={() => hearScale(f.scale)} aria-label={`Hear ${root} ${f.scale}`}>▶</button>
                <button className="btn sm ghost" onClick={() => openScale(f.scale)}>On the neck</button>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <ChordLicks root={root} suffix={suffix} name={name} />
    </div>
  )
}

function ChordLicks({ root, suffix, name }: { root: string; suffix: string; name: string }) {
  const inst = useInstrument()
  const all = useMemo(() => licksForChord(root, suffix), [root, suffix])
  const styles = useMemo(() => LICK_STYLES.filter(s => all.some(x => x.l.style === s.id)), [all])
  const [style, setStyle] = useState<LickStyleId | null>(null)
  const st = styles.find(s => s.id === style) ?? styles[0]
  const player = useRef<TabPlayer | null>(null)
  const [playing, setPlaying] = useState('')
  useEffect(() => () => player.current?.stop(), [])
  useEffect(() => { player.current?.stop(); setPlaying('') }, [root, suffix, st?.id])
  if (!st) return null
  const list = all.filter(x => x.l.style === st.id).sort((a, b) => Number(!!b.l.must) - Number(!!a.l.must) || a.l.level - b.l.level).slice(0, 6)
  const songOf = (x: (typeof all)[number]) => lickInKey(x.l, root, inst.midis, undefined, x.from)
  const hear = (x: (typeof all)[number]) => {
    const p = (player.current ??= new TabPlayer())
    if (playing === x.l.id) { p.stop(); setPlaying(''); return }
    p.stop()
    const placed = songOf(x)
    if (!placed) return
    const track = placed.song.tracks[0]
    p.onEnd = () => setPlaying('')
    p.sound = activeSound(soundForProgram(track.program))
    p.play(flatten(track), 0, placed.song.tempo ?? 90)
    setPlaying(x.l.id)
  }
  const playAlong = (x: (typeof all)[number]) => {
    const placed = songOf(x)
    if (!placed) return
    openInPlay({ id: `lick:${x.l.id}:${root}${suffix}:${inst.id}`, title: placed.song.title, source: 'lesson', inst: inst.id, key: { root, minor: /^m(?!aj)/.test(suffix) }, song: placed.song, updated: Date.now() })
  }
  return (
    <section className="panel stack" style={{ gap: 8 }}>
      <h3 style={{ margin: 0 }}>Licks that sound good over {name}</h3>
      <div className="search-chips">
        {styles.map(s => <button key={s.id} className="chip" aria-pressed={s.id === st.id} onClick={() => setStyle(s.id)}>{s.label.replace(/ \(.*\)$/, '')}</button>)}
      </div>
      <ul className="fit-list">
        {list.map(x => (
          <li key={x.l.id}>
            <span><b>{x.l.name}</b><span className="small muted">{lickStyle(x.l.style).label} · {['', 'easy', 'medium', 'hard'][x.l.level]}{x.l.must ? ' · explained' : ''}</span></span>
            <span className="row" style={{ gap: 4, flex: 'none' }}>
              <button className={`btn sm${playing === x.l.id ? ' on' : ''}`} onClick={() => hear(x)} aria-label={`Hear ${x.l.name}`}>{playing === x.l.id ? '■' : '▶'}</button>
              {x.l.must && <button className="btn sm ghost" onClick={() => learnGo({ licks: x.l.id })}>Learn</button>}
              <button className="btn sm ghost" onClick={() => playAlong(x)}>Play along</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
