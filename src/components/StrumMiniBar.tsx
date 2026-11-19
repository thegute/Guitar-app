// Slim 1-row floating live Strum Machine bar visible from ANY screen while Strum Machine is playing.
// Replaces NowPlaying cleanly while active (no stacked double bars) and gives 1-tap live access to
// Style, Chords/Guitar pack, Bass, Drums, Volumes/Mutes, and BPM from anywhere in KGuitar.
import { useState } from 'react'
import {
  STRUM_MOTIONS,
  bassVoiceOptions,
  chordVoiceOptions,
  drumKitOptions,
  strumMachine,
  useStrumState,
  type BassVoiceId,
  type ChordVoiceId,
  type DrumKitOverride,
  type StrumMotionId,
} from '../audio/strumMachine'
import { STRUM_STYLES, parseChordQual, type StrumStyleId } from '../theory/harmonicFlow'
import { KEYS, pc } from '../theory/notes'
import { useInstrument } from '../instrument'
import { openStrumGrid } from '../nav'
import { FloatCard } from './FloatCard'
import { LayerNeck } from './LayerNeck'
import { Ico } from './Icon'

const STYLE_GROUPS = ['Acoustic', 'Reggae & Groove', 'Rock & Metal', 'Orchestra & Keys'] as const

function groupOptions<T extends { group: string }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const it of items) {
    const arr = map.get(it.group) ?? []
    arr.push(it)
    map.set(it.group, arr)
  }
  return [...map.entries()]
}

export function StrumMiniBar() {
  const st = useStrumState()
  const [bandOpen, setBandOpen] = useState(false)

  if (!st.playing) return null

  const chordOpts = groupOptions(chordVoiceOptions())
  const bassOpts = groupOptions(bassVoiceOptions())
  const drumOpts = groupOptions(drumKitOptions())

  return (
    <div className="strum-mini-wrap" data-testid="strum-mini-bar">
      {bandOpen && (
        <div className="strum-band-popover panel stack" role="dialog" aria-label="Live Band Sound Mixer" data-testid="strum-band-popover">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.88rem' }}>🎛 Live Band & Key</strong>
            <button className="btn sm" onClick={() => setBandOpen(false)} aria-label="Close band sounds">✕</button>
          </div>

          {/* Live Key & Capo Transposer (Anywhere!) */}
          <div className="strum-band-row">
            <label className="field" style={{ flex: 1 }}>
              <span>Key</span>
              <select
                className="select"
                value={st.chart.tonic}
                onChange={e => strumMachine.setKey(e.target.value)}
                data-testid="mini-key-select"
              >
                {KEYS.map(k => (
                  <option key={k} value={k}>{k}{st.chart.minor ? 'm' : ''}</option>
                ))}
              </select>
            </label>
            <label className="field" style={{ width: 112 }}>
              <span>Capo</span>
              <select
                className="select"
                value={st.capo}
                onChange={e => strumMachine.setCapo(Number(e.target.value))}
                data-testid="mini-capo-select"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7].map(c => (
                  <option key={c} value={c}>{c === 0 ? 'No Capo' : `Capo ${c}`}</option>
                ))}
              </select>
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Motion</span>
              <select
                className="select"
                value={st.motion}
                onChange={e => strumMachine.setMotion(e.target.value as StrumMotionId)}
                data-testid="mini-motion-select"
              >
                {STRUM_MOTIONS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
          </div>

          {/* Chords / Guitar Voice */}
          <div className="strum-band-row">
            <label className="field" style={{ flex: 1 }}>
              <span>Chords / Guitar</span>
              <select
                className="select"
                value={st.chordVoice}
                onChange={e => strumMachine.setChordVoice(e.target.value as ChordVoiceId)}
                data-testid="mini-chord-voice"
              >
                {chordOpts.map(([grp, list]) => (
                  <optgroup key={grp} label={grp}>
                    {list.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <button
              className={`btn sm${st.mutes.chords ? ' muted-btn' : ''}`}
              aria-pressed={st.mutes.chords}
              onClick={() => strumMachine.setMutes({ chords: !st.mutes.chords })}
              title="Mute chords"
            >
              {st.mutes.chords ? 'Muted' : 'On'}
            </button>
            <input
              type="range"
              min={0}
              max={1.3}
              step={0.05}
              value={st.volumes.chords}
              onChange={e => strumMachine.setVolumes({ chords: Number(e.target.value) })}
              aria-label="Chords volume"
              style={{ width: 68 }}
            />
          </div>

          {/* Bass Voice */}
          <div className="strum-band-row">
            <label className="field" style={{ flex: 1 }}>
              <span>Bass</span>
              <select
                className="select"
                value={st.bassVoice}
                onChange={e => strumMachine.setBassVoice(e.target.value as BassVoiceId)}
                data-testid="mini-bass-voice"
              >
                {bassOpts.map(([grp, list]) => (
                  <optgroup key={grp} label={grp}>
                    {list.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <button
              className={`btn sm${st.mutes.bass ? ' muted-btn' : ''}`}
              aria-pressed={st.mutes.bass}
              onClick={() => strumMachine.setMutes({ bass: !st.mutes.bass })}
              title="Mute bass"
            >
              {st.mutes.bass ? 'Muted' : 'On'}
            </button>
            <input
              type="range"
              min={0}
              max={1.3}
              step={0.05}
              value={st.volumes.bass}
              onChange={e => strumMachine.setVolumes({ bass: Number(e.target.value) })}
              aria-label="Bass volume"
              style={{ width: 68 }}
            />
          </div>

          {/* Drums Kit */}
          <div className="strum-band-row">
            <label className="field" style={{ flex: 1 }}>
              <span>Drums</span>
              <select
                className="select"
                value={st.drumKit}
                onChange={e => strumMachine.setDrumKit(e.target.value as DrumKitOverride)}
                data-testid="mini-drum-kit"
              >
                {drumOpts.map(([grp, list]) => (
                  <optgroup key={grp} label={grp}>
                    {list.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <button
              className={`btn sm${st.mutes.drums ? ' muted-btn' : ''}`}
              aria-pressed={st.mutes.drums}
              onClick={() => strumMachine.setMutes({ drums: !st.mutes.drums })}
              title="Mute drums"
            >
              {st.mutes.drums ? 'Muted' : 'On'}
            </button>
            <input
              type="range"
              min={0}
              max={1.3}
              step={0.05}
              value={st.volumes.drums}
              onChange={e => strumMachine.setVolumes({ drums: Number(e.target.value) })}
              aria-label="Drums volume"
              style={{ width: 68 }}
            />
          </div>
        </div>
      )}

      <div className="strum-mini-bar" role="region" aria-label="Live Strum Machine bar">
        <button
          className="btn sm primary"
          onClick={() => strumMachine.stop()}
          aria-label="Stop Strum Machine"
          data-testid="mini-stop-btn"
          title="Stop backing track"
        >
          <Ico n="stop" />
        </button>

        {/* Live Chord + Upcoming Chord + Beat Dots */}
        <button
          className="strum-mini-chord"
          onClick={() => openStrumGrid()}
          title="Jump to Strum Grid chart"
        >
          <span className="strum-mini-now" data-testid="mini-current-chord">
            {st.countInLeft > 0 ? `In ${st.countInLeft}` : st.currentChord}
          </span>
          {st.countInLeft === 0 && (
            <span className="strum-mini-next">→ {st.nextChord}</span>
          )}
          <span className="strum-mini-dots" aria-hidden="true">
            {Array.from({ length: st.beatsPerBar }, (_, i) => (
              <span key={i} className={`strum-dot${st.beat === i ? ' on' : ''}`} />
            ))}
          </span>
        </button>

        {/* Live Style Dropdown (Anywhere!) */}
        <select
          className="select strum-mini-select"
          value={st.style}
          onChange={e => strumMachine.setStyle(e.target.value as StrumStyleId)}
          aria-label="Backing style"
          data-testid="mini-style-select"
        >
          {STYLE_GROUPS.map(g => (
            <optgroup key={g} label={g}>
              {STRUM_STYLES.filter(s => s.group === g).map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Band Sound Mixer Popover Button */}
        <button
          className={`btn sm${bandOpen ? ' primary' : ''}`}
          aria-expanded={bandOpen}
          onClick={() => setBandOpen(!bandOpen)}
          data-testid="mini-band-toggle"
          title="Swap Chords/Guitar pack, Bass, or Drum Kit live"
        >
          🎛 Band
        </button>

        {/* Floating 5-Layer Neck Toggle */}
        <button
          className={`btn sm${st.floatNeckOpen ? ' primary' : ''}`}
          aria-pressed={st.floatNeckOpen}
          onClick={() => strumMachine.setFloatNeckOpen(!st.floatNeckOpen)}
          data-testid="mini-neck-toggle"
          title="Open floating 5-layer scale & chord overlay neck to jam over this track"
        >
          <Ico n="layers" /> Neck
        </button>

        {/* Quick BPM nudge */}
        <div className="strum-mini-bpm">
          <button className="btn sm" onClick={() => strumMachine.setBpm(st.bpm - 5)} aria-label="Slower">−</button>
          <span className="small" style={{ minWidth: 32, textAlign: 'center', fontWeight: 700 }}>{st.bpm}</span>
          <button className="btn sm" onClick={() => strumMachine.setBpm(st.bpm + 5)} aria-label="Faster">+</button>
        </div>

        <button className="btn sm" onClick={() => openStrumGrid()} title="Open Strum Machine">
          Strum
        </button>
      </div>
    </div>
  )
}

/** Draggable, resizable floating 5-Layer Neck (Shape · Triads · Pentatonic · Mode · Free fingers) locked to Strum Machine! */
export function StrumFloatNeck() {
  const st = useStrumState()
  const inst = useInstrument()
  const [bigNeck, setBigNeck] = useState(false)
  if (!st.floatNeckOpen) return null

  // Resolve active rootPc & minor from either the song Key (with Capo concert pitch!) or the live sounding Chord
  const parsedChord = parseChordQual(st.soundingChord || st.currentChord)
  const keyRootPc = (pc(st.chart.tonic) + st.capo + 120) % 12
  const followChord = st.floatNeckFollow === 'chord' && !!parsedChord
  const rootPc = followChord ? parsedChord!.rootPc : keyRootPc
  const minor = followChord
    ? (parsedChord!.qual === 'm' || parsedChord!.qual === 'm7' || parsedChord!.qual === 'dim')
    : st.chart.minor
  const label = followChord
    ? `5-Layer Neck · ${st.soundingChord || st.currentChord}`
    : `5-Layer Neck · Key of ${st.chart.tonic}${st.chart.minor ? 'm' : ''}${st.capo > 0 ? ` (Capo ${st.capo})` : ''}`

  return (
    <FloatCard
      id="strum5layer"
      where="global"
      title={label}
      icon="layers"
      order={8}
      width={bigNeck ? 640 : 420}
      minW={240}
      onHide={() => strumMachine.setFloatNeckOpen(false)}
      bubble={followChord ? st.currentChord : `${st.chart.tonic}${st.chart.minor ? 'm' : ''}`}
    >
      <div className="stack" style={{ gap: 6 }} data-testid="strum-float-neck">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <div className="seg" role="group" aria-label="5-Layer Neck follow mode">
            <button
              aria-pressed={st.floatNeckFollow === 'key'}
              onClick={() => strumMachine.setFloatNeckFollow('key')}
              data-testid="float-neck-follow-key"
            >
              Lock Key ({st.chart.tonic}{st.chart.minor ? 'm' : ''})
            </button>
            <button
              aria-pressed={st.floatNeckFollow === 'chord'}
              onClick={() => strumMachine.setFloatNeckFollow('chord')}
              data-testid="float-neck-follow-chord"
            >
              Follow Chord ({st.currentChord})
            </button>
          </div>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <select
              className="select sm"
              style={{ width: 'auto' }}
              value={st.chart.tonic}
              onChange={e => strumMachine.setKey(e.target.value)}
              aria-label="Transpose Strum Machine key"
            >
              {KEYS.map(k => <option key={k} value={k}>Key: {k}{st.chart.minor ? 'm' : ''}</option>)}
            </select>
            <button
              className="btn sm"
              onClick={() => setBigNeck(b => !b)}
              title="Toggle compact or large fretboard view (or drag the ◢ corner to resize freely)"
            >
              {bigNeck ? 'Compact' : 'Big'}
            </button>
          </div>
        </div>
        <LayerNeck
          rootPc={rootPc}
          minor={minor}
          inst={inst}
          where="strumFloat"
          compact={!bigNeck}
          noLinks={['caged']}
        />
      </div>
    </FloatCard>
  )
}
