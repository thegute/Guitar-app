// Guitarist-First AI Beat Stage View:
// Clean, one-hand stage for playing guitar over 47 AI styles (Full Songs: Intro/Verse/Chorus/Solo
// OR Simple 4-Bar Drums + Bass + Keys/Synth Loops), with Isolated Backing Volume, Per-Instrument
// Band Sliders (Drums, Bass, Keys/Synth with 10 new synths, Guitar), Record Guitar (4-beat count-in),
// and 1-tap toggle to 🎛 Beat Studio (Pads, Step Grid, Sampling, Layers, Piano Roll).
import { useMemo, useState } from 'react'
import { KITS, type KitId } from '../audio/drums'
import { BackingVolumeBar } from '../jam/BackingVolumeBar'
import { AIPromptComposer, AIStyleDropdown, RoleShapeStrip } from '../jam/AIStyleDropdown'
import {
  buildBandFromChords,
  composeAIBeat,
  STAGE_BASS_VOICES,
  STAGE_KEYS_VOICES,
  type ComposeRequest,
  type JamEnergy,
  type JamRole,
  type SongShape,
} from '../jam/aiComposer'
import { useStation } from '../looper/LooperPanel'
import { openJam, openStrumGrid } from '../nav'
import { KEYS } from '../theory/notes'
import type { StrumBar, StrumChart } from '../theory/harmonicFlow'
import {
  curPart,
  partsMade,
  switchPart,
  type Beat,
  type PartId,
} from './beat'
import { beatChords, type BarChord } from './practice'
import { instr } from './sounds'
import type { StudioTransport } from './transport'
import { BeatLight } from './BeatLight'

const PART_NAMES: Record<PartId, string> = { D: 'Intro', A: 'Verse', B: 'Chorus', C: 'Solo' }
const PART_ORDER: PartId[] = ['D', 'A', 'B', 'C']

function groupKeys(): [string, typeof STAGE_KEYS_VOICES][] {
  const m = new Map<string, typeof STAGE_KEYS_VOICES>()
  for (const k of STAGE_KEYS_VOICES) {
    const arr = m.get(k.group) ?? []
    arr.push(k)
    m.set(k.group, arr)
  }
  return [...m.entries()]
}

function beatToStrumChart(beat: Beat): StrumChart {
  const chords = beatChords(beat).filter((c): c is BarChord => !!c)
  const bars: StrumBar[] = chords.length
    ? chords.map((c, i) => ({ chords: [c.name], ...(i === 0 ? { section: 'Verse' } : {}) }))
    : [{ chords: [`${beat.key}${beat.minor ? 'm' : ''}`], section: 'Loop' }]
  return {
    id: `from-beat-${Date.now()}`,
    name: beat.name || 'Beat Chords',
    tonic: beat.key,
    minor: beat.minor,
    capo: 0,
    bpm: beat.bpm,
    style: beat.minor ? 'rhodes' : 'folk',
    bars,
  }
}

export function BeatStageView({
  t,
  beat,
  setBeat,
  playing,
  play,
  stop,
  onOpenStudio,
  compact = false,
}: {
  t: StudioTransport
  beat: Beat
  setBeat: (f: Beat | ((b: Beat) => Beat), remember?: boolean) => void
  playing: boolean
  play: (countIn?: number) => void
  stop: () => void
  onOpenStudio?: () => void
  compact?: boolean
}) {
  const st = useStation()
  const [aiStyleId, setAiStyleId] = useState('classic-rock')
  const [songShape, setSongShape] = useState<SongShape>('song')
  const [role, setRole] = useState<JamRole>('lead')
  const [energy, setEnergy] = useState<JamEnergy>('groove')
  const [seed, setSeed] = useState(1)
  const [promptOpen, setPromptOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [soloScaleLabel, setSoloScaleLabel] = useState('')

  const chords = useMemo(() => beatChords(beat).filter((c): c is BarChord => !!c), [beat])
  const keysGroups = useMemo(() => groupKeys(), [])

  // Identify primary Bass, Keys/Synth, and Guitar tracks in the current beat
  const bassIdx = beat.tracks.findIndex(tr => instr(tr.inst).group === 'Bass')
  const guitarIdx = beat.tracks.findIndex(tr => instr(tr.inst).group === 'Guitars')
  const keysIdx = beat.tracks.findIndex((tr, i) => i !== bassIdx && i !== guitarIdx)

  const bassTrack = bassIdx >= 0 ? beat.tracks[bassIdx] : null
  const keysTrack = keysIdx >= 0 ? beat.tracks[keysIdx] : null
  const guitarTrack = guitarIdx >= 0 ? beat.tracks[guitarIdx] : null

  const updateTrack = (idx: number, patch: Partial<Beat['tracks'][number]>) => {
    if (idx < 0) return
    setBeat(b => {
      const tracks = b.tracks.map((tr, i) => (i === idx ? { ...tr, ...patch } : tr))
      // Also mirror instrument/mute/vol change across Song Parts A–D so Verse/Chorus/Solo stay consistent!
      const parts = b.parts ? { ...b.parts } : undefined
      if (parts) {
        const curInst = b.tracks[idx]?.inst
        for (const pid of Object.keys(parts) as PartId[]) {
          const pc = parts[pid]
          if (!pc) continue
          parts[pid] = {
            ...pc,
            tracks: pc.tracks.map(tr => (tr.inst === curInst ? { ...tr, ...patch } : tr)),
          }
        }
      }
      return { ...b, tracks, ...(parts ? { parts } : {}) }
    }, false)
  }

  const applyRoleToBeat = (nextRole: JamRole) => {
    setRole(nextRole)
    setBeat(b => {
      const applyTracks = (tracks: Beat['tracks']) =>
        tracks.map(tr => {
          const grp = instr(tr.inst).group
          if (grp === 'Bass') return { ...tr, mute: false }
          if (grp === 'Guitars') return { ...tr, mute: nextRole !== 'lead' }
          return { ...tr, mute: nextRole === 'drums' }
        })
      const parts = b.parts ? { ...b.parts } : undefined
      if (parts) {
        for (const pid of Object.keys(parts) as PartId[]) {
          if (parts[pid]) parts[pid] = { ...parts[pid]!, tracks: applyTracks(parts[pid]!.tracks) }
        }
      }
      return { ...b, tracks: applyTracks(b.tracks), ...(parts ? { parts } : {}) }
    })
  }

  const runCompose = (req: ComposeRequest) => {
    const res = composeAIBeat(req)
    setBeat(res.beat)
    setAiStyleId(res.style.id)
    if (req.songShape) setSongShape(req.songShape)
    if (req.role) setRole(req.role)
    if (req.energy) setEnergy(req.energy)
    setSoloScaleLabel(res.soloScale.label)
    setStatus(res.summary)
  }

  const handleRecordGuitar = () => {
    if (!playing) play(4)
    void st.press()
    setStatus(st.rec?.status === 'rec' ? 'Guitar loop captured!' : '4-beat count-in — get ready to play your guitar!')
  }

  const made = partsMade(beat)
  const activePart = curPart(beat)
  const isGuitarRec = st.rec?.status === 'rec' || st.rec?.status === 'armed'

  const currentChordName = chords[0]?.name ?? `${beat.key}${beat.minor ? 'm' : ''}`
  const nextChordName = chords[1]?.name ?? currentChordName

  return (
    <div className={`beat-stage stack${compact ? ' compact' : ''}`} style={{ gap: compact ? 8 : 10 }} data-testid="beat-stage-view">
      {/* 1) Guitarist Stage Header & One-Hand Transport */}
      <div className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: compact ? '0.98rem' : '1.1rem' }}>AI Beat &amp; Groove Stage</h2>
            {!compact && (
              <p className="small muted" style={{ margin: '2px 0 0' }}>
                47 styles · Full Intro/Verse/Chorus/Solo songs or simple Drums + Bass + Keys loops.
              </p>
            )}
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {!compact && (
              <button
                className="btn sm"
                onClick={() => openJam('beats')}
                title="Pop out Beat Maker as a floating opacity-adjustable window"
                data-testid="beat-popout-btn"
              >
                ⧉ Pop Out
              </button>
            )}
            {onOpenStudio && (
              <button
                className="btn sm primary"
                onClick={onOpenStudio}
                data-testid="beat-open-studio-btn"
                title="Switch to Beat Studio for Drum Pads, Step Grid, Live Pad Recording, Sampling & Piano Roll"
              >
                🎛 Beat Studio (Pads &amp; Grid)
              </button>
            )}
          </div>
        </div>

        {/* One-Hand Stage Transport Cluster */}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className={`btn primary lg${playing ? ' on' : ''}`}
            onClick={() => (playing ? stop() : play(0))}
            data-testid="beat-stage-play"
          >
            {playing ? '■ Stop' : '▶ Play'}
          </button>

          <button
            className={`btn sm${isGuitarRec ? ' primary on' : ''}`}
            onClick={handleRecordGuitar}
            data-testid="beat-record-guitar"
            title="4-beat count-in, then records your real guitar into the synced looper over this beat"
          >
            🔴 {isGuitarRec ? 'Stop Guitar Rec' : 'Record Guitar'}
          </button>

          <BeatLight t={t} playing={playing} />

          <div className="row" style={{ gap: 4, alignItems: 'center' }}>
            <button className="btn sm" onClick={() => setBeat(b => ({ ...b, bpm: Math.max(45, b.bpm - 5) }))} aria-label="Slower">−5</button>
            <span className="badge" data-testid="beat-stage-bpm">{beat.bpm} BPM</span>
            <button className="btn sm" onClick={() => setBeat(b => ({ ...b, bpm: Math.min(210, b.bpm + 5) }))} aria-label="Faster">+5</button>
          </div>

          <label className="field" style={{ minWidth: 82 }}>
            <span>Key</span>
            <select
              className="select"
              value={`${beat.key}${beat.minor ? 'm' : ''}`}
              onChange={e => {
                const v = e.target.value
                const nextKey = v.replace('m', '')
                const nextMin = v.endsWith('m')
                runCompose({
                  styleId: aiStyleId,
                  key: nextKey,
                  minor: nextMin,
                  bpm: beat.bpm,
                  songShape,
                  role,
                  energy,
                  keysInst: keysTrack?.inst,
                  bassInst: bassTrack?.inst,
                  seed,
                })
              }}
              data-testid="beat-stage-key"
            >
              {KEYS.flatMap(k => [k, `${k}m`]).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
        </div>

        {/* Isolated Backing Master Volume (completely separate from your electric guitar pedal!) */}
        <BackingVolumeBar compact={compact} />

        {/* 47-Style AI Song & Simple Loop Generator */}
        <div className="ai-gen-strip stack" style={{ gap: 8 }} data-testid="beat-ai-gen">
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <AIStyleDropdown
              styleId={aiStyleId}
              compact={compact}
              testId="beat-ai-style"
              onChange={id => {
                const nextSeed = seed + 1
                setSeed(nextSeed)
                runCompose({ styleId: id, songShape, role, energy, seed: nextSeed })
              }}
            />
            <button
              className="btn sm primary"
              onClick={() => {
                const nextSeed = seed + 1
                setSeed(nextSeed)
                runCompose({ styleId: aiStyleId, songShape, role, energy, seed: nextSeed })
              }}
              data-testid="beat-ai-generate"
            >
              ✨ {songShape === 'song' ? 'AI Full Song' : 'AI Simple Loop'}
            </button>
            <button
              className="btn sm"
              onClick={() => {
                const nextSeed = seed + 1
                setSeed(nextSeed)
                runCompose({
                  styleId: aiStyleId,
                  key: beat.key,
                  minor: beat.minor,
                  bpm: beat.bpm,
                  songShape,
                  role,
                  energy,
                  keysInst: keysTrack?.inst,
                  bassInst: bassTrack?.inst,
                  seed: nextSeed,
                })
              }}
              data-testid="beat-ai-remix"
            >
              🎲 Remix
            </button>
            <button
              className={`btn sm${promptOpen ? ' on' : ' ghost'}`}
              onClick={() => setPromptOpen(v => !v)}
              data-testid="beat-ai-prompt-toggle"
            >
              💬 Prompt / My Chords
            </button>
          </div>

          <RoleShapeStrip
            compact={compact}
            songShape={songShape}
            onSongShape={nextShape => {
              setSongShape(nextShape)
              runCompose({
                styleId: aiStyleId,
                key: beat.key,
                minor: beat.minor,
                bpm: beat.bpm,
                songShape: nextShape,
                role,
                energy,
                keysInst: keysTrack?.inst,
                bassInst: bassTrack?.inst,
                seed,
              })
            }}
            role={role}
            onRole={applyRoleToBeat}
            energy={energy}
            onEnergy={nextE => {
              setEnergy(nextE)
              runCompose({
                styleId: aiStyleId,
                key: beat.key,
                minor: beat.minor,
                bpm: beat.bpm,
                songShape,
                role,
                energy: nextE,
                keysInst: keysTrack?.inst,
                bassInst: bassTrack?.inst,
                seed,
              })
            }}
          />

          {promptOpen && (
            <AIPromptComposer
              compact={compact}
              current={{ styleId: aiStyleId, key: beat.key, minor: beat.minor, bpm: beat.bpm, songShape, role, energy }}
              onGenerate={req => {
                const nextSeed = seed + 1
                setSeed(nextSeed)
                runCompose({ ...req, seed: nextSeed })
              }}
              onBuildFromChords={list => {
                const built = buildBandFromChords(list, { styleId: aiStyleId, bpm: beat.bpm, songShape, role, keysInst: keysTrack?.inst })
                setBeat(built.beat)
                setStatus(built.summary)
              }}
            />
          )}
        </div>
      </div>

      {/* 2) Song Sections (Intro -> Verse -> Chorus -> Solo) + Big Chords & Solo Scale */}
      <div className="panel stack" style={{ gap: 8 }}>
        {made.length > 1 && (
          <div className="row section-pills" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }} data-testid="beat-section-pills">
            <span className="small muted">Section:</span>
            <button
              className={`btn sm${beat.chainOn ? ' primary' : ''}`}
              onClick={() => setBeat(b => ({ ...b, chainOn: true, chain: b.chain?.length ? b.chain : ['D', 'A', 'A', 'B', 'A', 'B', 'C', 'B'] }))}
              data-testid="beat-sec-full"
            >
              🎵 Full Song
            </button>
            {PART_ORDER.filter(p => made.includes(p)).map(p => (
              <button
                key={p}
                className={`btn sm${!beat.chainOn && activePart === p ? ' primary' : ''}`}
                onClick={() => setBeat(b => ({ ...switchPart(b, p, 'copy'), chainOn: false }))}
                data-testid={`beat-sec-${PART_NAMES[p].toLowerCase()}`}
              >
                Loop {PART_NAMES[p]}
              </button>
            ))}
          </div>
        )}

        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {chords.length > 0 ? chords.map((c, i) => (
              <span key={`${c.name}-${i}`} className="badge" style={{ fontSize: compact ? 14 : 17, padding: '4px 10px' }}>
                {c.name}
              </span>
            )) : (
              <span className="badge" style={{ fontSize: 16, padding: '4px 10px' }}>{currentChordName}</span>
            )}
          </div>
          <span className="small" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            NOW: {currentChordName} → {nextChordName}
          </span>
        </div>

        <p className="small muted" style={{ margin: 0 }}>
          🎸 Solo Scale: <b>{soloScaleLabel || `${beat.key} ${beat.minor ? 'Minor' : 'Major'} Pentatonic`}</b>
        </p>

        {/* 3) Per-Instrument Band Balance Sliders (Drums, Bass, Keys/Synth with 10 new synths, Guitar) */}
        <div className="strum-inline-mixer stack" style={{ gap: 8 }} data-testid="beat-band-sliders">
          <div className="strum-band-row">
            <label className="field" style={{ flex: 1 }}>
              <span>🥁 Drums</span>
              <select
                className="select"
                value={beat.kit}
                onChange={e => setBeat(b => ({ ...b, kit: e.target.value as KitId }))}
                data-testid="beat-stage-kit"
              >
                {KITS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </label>
            <button
              className={`btn sm${beat.drumVol === 0 ? ' on' : ''}`}
              onClick={() => setBeat(b => ({ ...b, drumVol: b.drumVol > 0 ? 0 : 0.88 }), false)}
            >
              {beat.drumVol === 0 ? 'Muted' : 'On'}
            </button>
            <input
              type="range"
              min={0}
              max={1.2}
              step={0.05}
              value={beat.drumVol}
              onChange={e => setBeat(b => ({ ...b, drumVol: Number(e.target.value) }), false)}
              aria-label="Drums volume"
              style={{ width: 84 }}
              data-testid="beat-drums-vol"
            />
          </div>

          {bassTrack && (
            <div className="strum-band-row">
              <label className="field" style={{ flex: 1 }}>
                <span>🎸 Bass</span>
                <select
                  className="select"
                  value={bassTrack.inst}
                  onChange={e => updateTrack(bassIdx, { inst: e.target.value })}
                  data-testid="beat-stage-bass"
                >
                  {STAGE_BASS_VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </label>
              <button
                className={`btn sm${bassTrack.mute ? ' on' : ''}`}
                onClick={() => updateTrack(bassIdx, { mute: !bassTrack.mute })}
              >
                {bassTrack.mute ? 'Muted' : 'On'}
              </button>
              <input
                type="range"
                min={0}
                max={1.2}
                step={0.05}
                value={bassTrack.vol}
                onChange={e => updateTrack(bassIdx, { vol: Number(e.target.value) })}
                aria-label="Bass volume"
                style={{ width: 84 }}
                data-testid="beat-bass-vol"
              />
            </div>
          )}

          {keysTrack && (
            <div className="strum-band-row">
              <label className="field" style={{ flex: 1 }}>
                <span>🎹 Keys / Synth</span>
                <select
                  className="select"
                  value={keysTrack.inst}
                  onChange={e => updateTrack(keysIdx, { inst: e.target.value, space: instr(e.target.value).space })}
                  data-testid="beat-stage-keys"
                >
                  {keysGroups.map(([grp, list]) => (
                    <optgroup key={grp} label={grp}>
                      {list.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <button
                className={`btn sm${keysTrack.mute ? ' on' : ''}`}
                onClick={() => updateTrack(keysIdx, { mute: !keysTrack.mute })}
              >
                {keysTrack.mute ? 'Muted' : 'On'}
              </button>
              <input
                type="range"
                min={0}
                max={1.2}
                step={0.05}
                value={keysTrack.vol}
                onChange={e => updateTrack(keysIdx, { vol: Number(e.target.value) })}
                aria-label="Keys and synth volume"
                style={{ width: 84 }}
                data-testid="beat-keys-vol"
              />
            </div>
          )}

          {guitarTrack && (
            <div className="strum-band-row">
              <span className="small" style={{ flex: 1 }}>🎸 Band Guitar ({instr(guitarTrack.inst).label})</span>
              <button
                className={`btn sm${guitarTrack.mute ? ' on' : ''}`}
                onClick={() => updateTrack(guitarIdx, { mute: !guitarTrack.mute })}
              >
                {guitarTrack.mute ? 'Muted (You play!)' : 'On'}
              </button>
              <input
                type="range"
                min={0}
                max={1.2}
                step={0.05}
                value={guitarTrack.vol}
                onChange={e => updateTrack(guitarIdx, { vol: Number(e.target.value) })}
                aria-label="Band guitar volume"
                style={{ width: 84 }}
              />
            </div>
          )}
        </div>

        {/* Cross-tool quick links (open as Floating Popups!) */}
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <button
            className="btn sm"
            onClick={() => openStrumGrid({ chart: beatToStrumChart(beat), autoPlay: playing })}
            data-testid="beat-to-strum"
          >
            🎸 Send to Strum Machine
          </button>
          <button
            className="btn sm"
            onClick={() => openJam('loop')}
            data-testid="beat-to-looper"
          >
            🔁 Open Looper
          </button>
        </div>

        {status && <p className="small muted" style={{ margin: 0 }} role="status">{status}</p>}
      </div>
    </div>
  )
}
