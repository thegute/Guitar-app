// Isolated Backing Volume Bar: adjusts KGuitar's beats, strums & band output (0–100%)
// completely independently of your electric guitar pedal / Pocket Master volume.
// Remembers its level per gear setup (Pedal / Stereo / Interface) and exposes independent
// Guitar Boost when software monitoring is enabled on an audio interface.
import { useEffect, useState } from 'react'
import { backingMaster, onBackingMaster, setBackingMaster } from '../audio/engine'
import { monitorVol, monitoring, setMonitorVol, useRig } from '../audio/rig'

const PRESETS = [0.25, 0.5, 0.75, 1] as const

export function useBackingMaster(): [number, (v: number) => void] {
  const [vol, setVol] = useState(() => backingMaster())
  useEffect(() => {
    setVol(backingMaster())
    return onBackingMaster(() => setVol(backingMaster()))
  }, [])
  return [vol, (v: number) => setBackingMaster(v)]
}

export function BackingVolumeBar({ compact = false }: { compact?: boolean }) {
  const currentRig = useRig()
  const [vol, setVol] = useBackingMaster()
  const [gBoost, setGBoost] = useState(() => monitorVol())
  const showGuitarBoost = monitoring()
  const pct = Math.round(vol * 100)

  return (
    <div
      className={`backing-vol-bar${compact ? ' compact' : ''}`}
      role="region"
      aria-label="Isolated backing track volume"
      data-testid="backing-vol-bar"
    >
      <div className="bv-main">
        <span className="bv-label" title="Turns beats, strums & band up or down without affecting your guitar pedal volume">
          🔊 Backing <b>{pct}%</b>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={vol}
          onChange={e => setVol(Number(e.target.value))}
          aria-label="Isolated backing track volume"
          className="bv-slider"
          data-testid="backing-vol-slider"
        />
        <div className="bv-presets" role="group" aria-label="Quick backing volume presets">
          {PRESETS.map(p => (
            <button
              key={p}
              type="button"
              className={`btn sm${Math.abs(vol - p) < 0.04 ? ' primary' : ' ghost'}`}
              onClick={() => setVol(p)}
              data-testid={`backing-vol-${Math.round(p * 100)}`}
            >
              {Math.round(p * 100)}%
            </button>
          ))}
        </div>
      </div>

      {!compact && (
        <span className="small muted bv-note">
          {currentRig === 'pedal'
            ? 'Pedal isolated — changes beats & strums only, never your guitar'
            : 'Isolated app backing level — keeps your guitar level untouched'}
        </span>
      )}

      {showGuitarBoost && (
        <div className="bv-guitar">
          <span className="bv-label">🎸 Guitar Boost <b>{Math.round(gBoost * 100)}%</b></span>
          <input
            type="range"
            min={0.25}
            max={2.5}
            step={0.05}
            value={gBoost}
            onChange={e => {
              const next = Number(e.target.value)
              setGBoost(next)
              setMonitorVol(next)
            }}
            aria-label="Guitar monitor boost"
            className="bv-slider"
            data-testid="guitar-boost-slider"
          />
        </div>
      )}
    </div>
  )
}
