// Shared 47-Style Organized AI Style Picker, Prompt Composer & "Strum a Riff -> Build Band" controls
// Used across AI Beat Maker, AI Strum Machine, and Floating Jam Popups.
import { useState } from 'react'
import {
  AI_STYLE_GROUPS,
  AI_STYLES,
  aiStyleById,
  favoriteStyleIds,
  parsePromptToRequest,
  randomAIStyle,
  recentStyleIds,
  toggleFavoriteStyle,
  type ComposeRequest,
  type JamEnergy,
  type JamRole,
  type SongShape,
} from './aiComposer'

const SURPRISE = '__surprise__'

const PROMPT_EXAMPLES = [
  'Slow moody blues in A minor at 72 BPM with organ',
  'Upbeat acoustic campfire song in G major, verse and chorus',
  'Funky E minor groove at 106 BPM drums and bass only',
  'Chill lo-fi loop in C major with tape keys',
  '80s synthwave in A minor with Juno pad',
  'Heavy Drop D metalcore groove for soloing',
]

export function AIStyleDropdown({
  styleId,
  onChange,
  compact = false,
  testId = 'ai-style-select',
}: {
  styleId: string
  onChange: (nextId: string) => void
  compact?: boolean
  testId?: string
}) {
  const [favs, setFavs] = useState<string[]>(() => favoriteStyleIds())
  const recent = recentStyleIds()
  const isFav = favs.includes(styleId)
  const cur = aiStyleById(styleId)

  const handleSelect = (val: string) => {
    if (val === SURPRISE) {
      onChange(randomAIStyle(styleId).id)
      return
    }
    onChange(val)
  }

  return (
    <div className="ai-style-pick row" style={{ gap: 6, flexWrap: 'nowrap', alignItems: 'center' }}>
      <select
        className="select ai-style-select"
        style={{ minWidth: compact ? 155 : 210, flex: 1 }}
        value={styleId}
        onChange={e => handleSelect(e.target.value)}
        aria-label="Musical style (47 styles)"
        title={cur.hint}
        data-testid={testId}
      >
        <option value={SURPRISE}>🎲 Surprise Me! (Random Style)</option>
        {favs.length > 0 && (
          <optgroup label="⭐ Favorites">
            {favs.map(id => {
              const s = AI_STYLES.find(x => x.id === id)
              return s ? <option key={`fav-${s.id}`} value={s.id}>★ {s.label}</option> : null
            })}
          </optgroup>
        )}
        {recent.length > 0 && (
          <optgroup label="🕒 Recently Used">
            {recent.map(id => {
              const s = AI_STYLES.find(x => x.id === id)
              return s ? <option key={`rec-${s.id}`} value={s.id}>{s.label}</option> : null
            })}
          </optgroup>
        )}
        {AI_STYLE_GROUPS.map(group => (
          <optgroup key={group} label={group}>
            {AI_STYLES.filter(s => s.group === group).map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <button
        type="button"
        className={`btn sm${isFav ? ' on' : ' ghost'}`}
        onClick={() => setFavs(toggleFavoriteStyle(styleId))}
        aria-pressed={isFav}
        title={isFav ? 'Remove style from favorites' : 'Save style to favorites'}
        data-testid={`${testId}-fav`}
      >
        {isFav ? '★' : '☆'}
      </button>
    </div>
  )
}

export function AIPromptComposer({
  current,
  onGenerate,
  onBuildFromChords,
  compact = false,
}: {
  current: Partial<ComposeRequest>
  onGenerate: (req: ComposeRequest) => void
  onBuildFromChords?: (chords: string[]) => void
  compact?: boolean
}) {
  const [prompt, setPrompt] = useState('')
  const [riffOpen, setRiffOpen] = useState(false)
  const [riffText, setRiffText] = useState('Am, F, C, G')

  const submitPrompt = () => {
    if (!prompt.trim()) return
    const req = parsePromptToRequest(prompt, current)
    onGenerate(req)
  }

  return (
    <div className="ai-prompt-box stack" style={{ gap: 6 }}>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input"
          style={{ flex: '1 1 200px' }}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitPrompt() }}
          placeholder='Describe a jam track… e.g. "slow minor blues in A at 74 BPM with organ"'
          aria-label="Describe a jam track"
          data-testid="ai-prompt-input"
        />
        <button
          type="button"
          className="btn sm primary"
          onClick={submitPrompt}
          disabled={!prompt.trim()}
          data-testid="ai-prompt-go"
        >
          ✨ Build Track
        </button>
        {onBuildFromChords && (
          <button
            type="button"
            className={`btn sm${riffOpen ? ' on' : ''}`}
            onClick={() => setRiffOpen(v => !v)}
            data-testid="ai-riff-toggle"
            title="Enter or strum 2–4 chords and let AI build the full band around them"
          >
            🎸 My Chords → Band
          </button>
        )}
      </div>

      {!compact && (
        <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
          {PROMPT_EXAMPLES.slice(0, 4).map(ex => (
            <button
              key={ex}
              type="button"
              className="btn sm ghost"
              style={{ fontSize: 11, padding: '2px 7px' }}
              onClick={() => {
                setPrompt(ex)
                onGenerate(parsePromptToRequest(ex, current))
              }}
            >
              “{ex.slice(0, 34)}{ex.length > 34 ? '…' : ''}”
            </button>
          ))}
        </div>
      )}

      {riffOpen && onBuildFromChords && (
        <div className="row ai-riff-panel" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }} data-testid="ai-riff-panel">
          <span className="small muted">Your chords (2–8):</span>
          <input
            className="input"
            style={{ flex: '1 1 160px' }}
            value={riffText}
            onChange={e => setRiffText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const list = riffText.split(/[\s,|→-]+/).filter(Boolean)
                if (list.length >= 2) { onBuildFromChords(list); setRiffOpen(false) }
              }
            }}
            placeholder="e.g. Em, G, D, A"
            aria-label="Your chord progression"
            data-testid="ai-riff-input"
          />
          <button
            type="button"
            className="btn sm primary"
            onClick={() => {
              const list = riffText.split(/[\s,|→-]+/).filter(Boolean)
              if (list.length >= 2) { onBuildFromChords(list); setRiffOpen(false) }
            }}
            data-testid="ai-riff-build"
          >
            ✨ Build Band Around Me
          </button>
        </div>
      )}
    </div>
  )
}

export function RoleShapeStrip({
  songShape,
  onSongShape,
  role,
  onRole,
  energy,
  onEnergy,
  compact = false,
}: {
  songShape: SongShape
  onSongShape: (s: SongShape) => void
  role: JamRole
  onRole: (r: JamRole) => void
  energy?: JamEnergy
  onEnergy?: (e: JamEnergy) => void
  compact?: boolean
}) {
  return (
    <div className="row role-shape-strip" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <div className="seg" role="group" aria-label="Song structure" data-testid="song-shape-seg">
        <button type="button" aria-pressed={songShape === 'song'} onClick={() => onSongShape('song')} title="Intro → Verse → Chorus → Solo Break → Outro">
          🎵 {compact ? 'Song' : 'Full Song'}
        </button>
        <button type="button" aria-pressed={songShape === 'loop'} onClick={() => onSongShape('loop')} title="Simple 4/8-bar Drums + Bass + Keys chord loop">
          🔁 {compact ? 'Loop' : 'Simple Loop'}
        </button>
      </div>

      <div className="seg" role="group" aria-label="Your guitar role" data-testid="jam-role-seg">
        <button type="button" aria-pressed={role === 'lead'} onClick={() => onRole('lead')} title="Full band plays (Drums + Bass + Keys/Guitar) so you solo on top">
          🎸 Lead
        </button>
        <button type="button" aria-pressed={role === 'rhythm'} onClick={() => onRole('rhythm')} title="Mutes app guitar — Drums + Bass + Keys so YOU play rhythm cleanly">
          🥁 Rhythm
        </button>
        <button type="button" aria-pressed={role === 'drums'} onClick={() => onRole('drums')} title="Drums + Bass only — pure pocket">
          🥁 D+B
        </button>
      </div>

      {energy && onEnergy && !compact && (
        <div className="seg" role="group" aria-label="Band energy" data-testid="jam-energy-seg">
          <button type="button" aria-pressed={energy === 'chill'} onClick={() => onEnergy('chill')}>🌙 Chill</button>
          <button type="button" aria-pressed={energy === 'groove'} onClick={() => onEnergy('groove')}>⚡ Groove</button>
          <button type="button" aria-pressed={energy === 'drive'} onClick={() => onEnergy('drive')}>🔥 Drive</button>
        </div>
      )}
    </div>
  )
}
