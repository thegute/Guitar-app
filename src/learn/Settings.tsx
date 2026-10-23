// Settings: instrument (with a confirm step so you can't switch by accident), tuning, look, daily goal and reminders.
import { useState } from 'react'
import { Chips } from '../components/Controls'
import { INSTRUMENTS, setInstrument, setTuning, type Instrument, type InstrumentId } from '../instrument'
import { setTheme, useTheme, type ThemeChoice } from '../theme'
import { dailyGoalMin, setDailyGoalMin, useProgress } from './progress'
import { enableReminders, reminderSettings, remindersAvailable, updateReminderSettings, type ReminderSettings } from './reminders'

const INST_ART: Record<InstrumentId, string> = { guitar: '🎸', tenor: '🌺', baritone: '🌴' }

export function Settings({ inst, onExit }: { inst: Instrument; onExit: () => void }) {
  useProgress()
  const theme = useTheme()
  const [ask, setAsk] = useState<InstrumentId | null>(null)
  const [rem, setRem] = useState<ReminderSettings>(reminderSettings)
  const [remMsg, setRemMsg] = useState('')
  const goal = dailyGoalMin()

  async function changeRem(next: ReminderSettings, turningOn = false) {
    setRem(next)
    setRemMsg('')
    if (turningOn) {
      const r = await enableReminders(next)
      if (r === 'denied') { setRem({ ...next, on: false }); setRemMsg('Notifications are blocked for KGuitar. Allow them in your phone settings (Apps → KGuitar → Notifications), then turn this on again.') }
      if (r === 'unsupported') setRemMsg('Reminders work in the Android app. This web version can\'t send them.')
      if (r === 'ok') setRemMsg(`Reminders on. The first one is ${next.time} today or tomorrow, and they skip any day you've already practised.`)
    } else {
      await updateReminderSettings(next)
    }
  }

  const target = ask ? INSTRUMENTS[ask] : null
  const toUke = !!target && target.id !== 'guitar'
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← Back</button>
      </div>
      <h1 style={{ margin: 0 }}>Settings</h1>

      <section className="panel stack" style={{ gap: 10 }}>
        <h2 style={{ margin: 0 }}>Instrument</h2>
        <div className="inst-cards" role="radiogroup" aria-label="Instrument">
          {(Object.keys(INSTRUMENTS) as InstrumentId[]).map(id => (
            <button key={id} role="radio" aria-checked={inst.id === id} className={`inst-card${inst.id === id ? ' on' : ''}`} onClick={() => inst.id !== id && setAsk(id)}>
              <span className="inst-art" aria-hidden>{INST_ART[id]}</span>
              <b>{INSTRUMENTS[id].label}</b>
              <span className="small muted">{INSTRUMENTS[id].strings} strings</span>
            </button>
          ))}
        </div>
        <label className="field">
          <span>Tuning</span>
          <select className="select" value={inst.tuning.id} onChange={e => setTuning(inst.id, e.target.value)}>
            {inst.tunings.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <p className="small muted" style={{ margin: 0 }}>
          Everything follows your instrument: chord shapes, scales, the tuner, quizzes, practice tabs and play-along. Your saved songs are kept
          in separate banks, so guitar tabs only show in guitar mode and ukulele tabs only in ukulele mode.
        </p>
      </section>

      <section className="panel stack" style={{ gap: 10 }}>
        <h2 style={{ margin: 0 }}>Look</h2>
        <Chips<ThemeChoice> label="Theme" items={[{ id: 'auto', label: 'Match my phone' }, { id: 'day', label: 'Day' }, { id: 'night', label: 'Night' }]} value={theme} onChange={setTheme} />
        <p className="small muted" style={{ margin: 0 }}>Night is dim and low-glare for practising in bed. "Match my phone" switches with your phone's dark mode.</p>
      </section>

      <section className="panel stack" style={{ gap: 10 }}>
        <h2 style={{ margin: 0 }}>Daily goal</h2>
        <Chips label="Minutes a day" items={[5, 10, 15, 20, 30, 45, 60].map(m => ({ id: m, label: `${m} min` }))} value={goal} onChange={setDailyGoalMin} />
        <p className="small muted" style={{ margin: 0 }}>Any 5 minutes keeps your streak alive, with or without your guitar. Hitting the goal earns a bonus.</p>
      </section>

      <section className="panel stack" style={{ gap: 10 }}>
        <h2 style={{ margin: 0 }}>Reminders</h2>
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={rem.on} onChange={e => void changeRem({ ...rem, on: e.target.checked }, e.target.checked)} />
          <span>Remind me to practise every day</span>
        </label>
        {rem.on && (
          <div className="stack" style={{ gap: 8 }}>
            <label className="row" style={{ gap: 8 }}>
              <span className="small" style={{ minWidth: 90 }}>Daily reminder</span>
              <input className="input" type="time" value={rem.time} style={{ flex: 'none' }} onChange={e => void changeRem({ ...rem, time: e.target.value || '18:00' })} />
            </label>
            <label className="row" style={{ gap: 8 }}>
              <input type="checkbox" checked={rem.saver} onChange={e => void changeRem({ ...rem, saver: e.target.checked })} />
              <span className="small">Late "streak saver" if I haven't practised yet</span>
              {rem.saver && <input className="input" type="time" value={rem.saverTime} style={{ flex: 'none' }} onChange={e => void changeRem({ ...rem, saverTime: e.target.value || '21:30' })} />}
            </label>
          </div>
        )}
        {remMsg && <p className="small" role="status" style={{ margin: 0 }}>{remMsg}</p>}
        {!remindersAvailable() && !remMsg && <p className="small muted" style={{ margin: 0 }}>Reminders are sent by the Android app.</p>}
        <p className="small muted" style={{ margin: 0 }}>Reminders skip days you've already practised, and they suggest guitar-free practice too, so they work on shift days.</p>
      </section>

      {target && (
        <div className="sheet-backdrop" onClick={() => setAsk(null)}>
          <div className="sheet confirm" role="alertdialog" aria-modal="true" aria-labelledby="switch-title" onClick={e => e.stopPropagation()}>
            <span className="inst-art big" aria-hidden>{INST_ART[target.id]}</span>
            <h2 id="switch-title" style={{ margin: 0 }}>{toUke ? `Are you sure you want to switch to ${target.label.toLowerCase()}?` : 'Switch back to guitar?'}</h2>
            <p className="small" style={{ margin: 0 }}>
              The whole app will change to {target.label.toLowerCase()}: chord shapes, scales, the tuner, quizzes and practice tabs.
              Play will show your {target.label.toLowerCase()} songs. Your {inst.label.toLowerCase()} songs and progress are kept and come back when you switch again.
            </p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setAsk(null)}>Cancel</button>
              <button className="btn primary" onClick={() => { setInstrument(target.id); setAsk(null) }}>Yes, switch to {target.short.toLowerCase()}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
