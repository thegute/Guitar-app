// First launch: a short welcome that sets the app up (instrument, input, daily goal, reminders) and offers the guide.
import { useState } from 'react'
import { INSTRUMENTS, setInstrument, setTuning, useInstrument, type InstrumentId } from '../instrument'
import { GearSetup } from './GearSetup'
import { setDailyGoalMin, dailyGoalMin } from '../learn/progress'
import { enableReminders, reminderSettings } from '../learn/reminders'
import { go } from '../nav'
import { ProfileForm } from './ProfileForm'

const KEY = 'kg:welcomed'
export function needsWelcome() {
  try {
    if (localStorage.getItem(KEY)) return false
    // someone already using the app (practice history or settings) doesn't need it
    const used = ['kg:practiceLog', 'kg:instrument', 'kg:playSong:guitar', 'kg:tab2'].some(k => localStorage.getItem(k))
    if (used) { localStorage.setItem(KEY, '1'); return false }
    return true
  } catch { return false }
}
export function resetWelcome() { try { localStorage.removeItem(KEY) } catch { /* storage unavailable */ } }
function done() { try { localStorage.setItem(KEY, '1') } catch { /* storage unavailable */ } }

export function Welcome({ onDone }: { onDone: (then?: 'guide' | 'play') => void }) {
  const inst = useInstrument()
  const [step, setStep] = useState(0)
  const [gear, setGear] = useState(false)
  const [goal, setGoal] = useState(dailyGoalMin())
  const [remind, setRemind] = useState(true)
  const [time, setTime] = useState('18:00')
  const finish = async (then?: 'guide' | 'play') => {
    setDailyGoalMin(goal)
    if (remind) await enableReminders({ ...reminderSettings(), on: true, time })
    done()
    onDone(then)
  }
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-label="Welcome to KGuitar">
      <div className={`welcome-card${step === 0 ? ' hello' : ''}`}>
        {step === 0 && (
          <>
            <img className="welcome-art" src="art.jpg" alt="Brandy, KGuitar's samurai chocolate lab, with a neon guitar and a katana" />
            <div className="welcome-hello">
              <div className="gear-steps" aria-hidden>{[0, 1, 2, 3, 4, 5].map(i => <i key={i} className={i === 0 ? 'on' : ''} />)}</div>
              <h1>Welcome to KGuitar</h1>
              <p>Play along with real songs and tabs: KGuitar <b>listens while you play</b> and lights up every note you get right.</p>
              <p className="small muted">It also teaches theory, trains your ear, makes backing tracks to jam over, and helps you practise a little every day. It takes a minute to set up.</p>
              <button className="btn primary big" onClick={() => setStep(1)}>Let's go</button>
            </div>
          </>
        )}
        {step > 0 && <div className="gear-steps" aria-hidden>{[0, 1, 2, 3, 4, 5].map(i => <i key={i} className={i < step ? 'done' : i === step ? 'on' : ''} />)}</div>}
        {step === 1 && (
          <>
            <h2>What do you play?</h2>
            <div className="inst-cards" role="radiogroup" aria-label="Instrument">
              {(Object.keys(INSTRUMENTS) as InstrumentId[]).map(id => (
                <button key={id} role="radio" aria-checked={inst.id === id} className={`inst-card${inst.id === id ? ' on' : ''}`} onClick={() => setInstrument(id)}>
                  <span className="inst-art" aria-hidden>{id === 'guitar' ? '🎸' : id === 'tenor' ? '🌺' : '🌴'}</span>
                  <b>{INSTRUMENTS[id].label}</b>
                </button>
              ))}
            </div>
            <label className="field">
              <span>Tuning</span>
              <select className="select" value={inst.tuning.id} onChange={e => setTuning(inst.id, e.target.value)}>
                {inst.tunings.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <p className="small muted">You can switch any time in Learn → Settings.</p>
            <button className="btn primary big" onClick={() => setStep(2)}>Next</button>
          </>
        )}
        {step === 2 && (
          <>
            <h2>About you</h2>
            <p className="small muted">So KGuitar can pick songs and practice at your level. You can change this any time in Learn → Settings.</p>
            <ProfileForm saveLabel="Next" onSaved={() => setStep(3)} />
            <button className="btn ghost" onClick={() => setStep(3)}>Skip</button>
          </>
        )}
        {step === 3 && (
          <>
            <h2>Let KGuitar hear you</h2>
            <p>Acoustic: the phone's mic hears you. Electric: plug a USB amp or audio interface into the phone.</p>
            <p className="small muted">A two-minute setup tunes note detection to your room and instrument. Allow the microphone when the phone asks: KGuitar only listens while you're playing and nothing is recorded or sent anywhere.</p>
            <div className="row">
              <button className="btn primary" onClick={() => setGear(true)}>Set up now</button>
              <button className="btn" onClick={() => setStep(4)}>Later</button>
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <h2>A little every day</h2>
            <p>How many minutes a day? Any 5 minutes keeps your streak going, with or without your instrument.</p>
            <div className="chips wrap" role="group" aria-label="Daily goal">
              {[5, 10, 15, 20, 30].map(m => <button key={m} className="chip" aria-pressed={goal === m} onClick={() => setGoal(m)}>{m} min</button>)}
            </div>
            <label className="row" style={{ gap: 8 }}>
              <input type="checkbox" checked={remind} onChange={e => setRemind(e.target.checked)} />
              <span>Remind me every day at</span>
              <input className="input" type="time" value={time} style={{ flex: 'none' }} onChange={e => setTime(e.target.value || '18:00')} />
            </label>
            <button className="btn primary big" onClick={() => setStep(5)}>Next</button>
          </>
        )}
        {step === 5 && (
          <>
            <h2>You're set</h2>
            <p>Start with the tour (two minutes, shows what everything does), or jump in: open a song from the <b>Songbook</b> in <b>Play</b>, tap <b>Listen</b> and play.</p>
            <div className="stack" style={{ gap: 8 }}>
              <button className="btn primary big" onClick={() => void finish('guide')}>Show me around</button>
              <button className="btn big" onClick={() => void finish('play')}>Start playing</button>
            </div>
          </>
        )}
      </div>
      {gear && <GearSetup onClose={() => { setGear(false); setStep(4) }} />}
    </div>
  )
}

/** Open the guide inside Learn. */
export function openGuide() {
  try { sessionStorage.setItem('kg:openGuide', '1') } catch { /* storage unavailable */ }
  go('learn')
}
