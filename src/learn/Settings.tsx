// Settings: instrument (with a confirm step so you can't switch by accident), tuning, look, daily goal and reminders.
import { AiSetup } from '../assistant/AiSetup'
import { GET_READY_CHOICES, getReadySecs, setGetReadySecs } from '../components/GetReady'
import { useEffect, useState } from 'react'
import { Chips } from '../components/Controls'
import { INSTRUMENTS, setInstrument, setTuning, type Instrument, type InstrumentId } from '../instrument'
import { setPsyMotion, setTheme, usePsyMotion, useTheme, usePsyDog, setPsyDog, type ThemeChoice } from '../theme'
import { SubTabs, useSubTab } from '../components/SubTabs'
import { PsyDog, PsyPic } from '../components/PsyArt'
import { DOGS, GALLERY, cardSrc, picSrc, thumbSrc } from '../art/samurai'
import { ArtViewer } from '../components/Art'
import { dailyGoalMin, setDailyGoalMin, useProgress } from './progress'
import { GearSetup } from '../components/GearSetup'
import { PedalSettings } from '../controls/PedalSettings'
import { BackupPanel } from '../components/BackupPanel'
import { useShowArt } from '../components/Art'
import { HintHead } from '../components/Fold'
import { ProfileForm } from '../components/ProfileForm'
import { onSoundChange, setSoundChoice, soundChoice, strum, loadSound, instrumentSound, activeSound, soundInfo, SOUNDS, type SoundId } from '../audio/pluck'
import { audio } from '../audio/engine'
import { gear, isSetUp, latencyMs, useGear } from '../audio/gear'
import { enableReminders, reminderSettings, remindersAvailable, updateReminderSettings, type ReminderSettings } from './reminders'

const INST_ART: Record<InstrumentId, string> = { guitar: '🎸', tenor: '🌺', baritone: '🌴' }

export function Settings({ inst, onExit }: { inst: Instrument; onExit: () => void }) {
  useProgress()
  const theme = useTheme()
  const motion = usePsyMotion()
  const dog = usePsyDog()
  const [page, setPage] = useSubTab('settings', ['you', 'sound', 'look', 'backup'] as const)
  const [showArt, setShowArt] = useShowArt()
  const [readySecs, setReadySecs] = useState(getReadySecs)
  const [ask, setAsk] = useState<InstrumentId | null>(null)
  const [savedProfile, setSavedProfile] = useState(false)
  const [rem, setRem] = useState<ReminderSettings>(reminderSettings)
  const [remMsg, setRemMsg] = useState('')
  const [setup, setSetup] = useState(false)
  const [sound, setSound] = useState(soundChoice())
  useEffect(() => onSoundChange(() => setSound(soundChoice())), [])
  async function tryIt(c: 'auto' | SoundId) {
    setSoundChoice(c)
    const ctx = audio()
    await ctx.resume()
    const id = c === 'auto' ? instrumentSound() : c
    await loadSound(id)
    // the amp sounds play a power chord, the others a C chord on whatever you're playing
    if (soundInfo(id).amp && !inst.isUke) { strum([45, 52, 57], ctx.currentTime + 0.05, { sound: id }); return }
    const frets = inst.id === 'tenor' ? [0, 0, 0, 3] : inst.id === 'baritone' ? [2, 0, 1, 0] : [-1, 3, 2, 0, 1, 0]
    strum(inst.midis.map((m, i) => (frets[i] < 0 ? -1 : m + frets[i])).filter(m => m > 0), ctx.currentTime + 0.05, { spread: 0.03, sound: id })
  }
  useGear()
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
      <header className="screen-head">
        <PsyPic id="torii" at="50% 40%" className="screen-art" />
        <h1 style={{ margin: 0 }}>Settings</h1>
      </header>
      <SubTabs label="Settings" value={page} onChange={setPage} tabs={[
        { id: 'you', label: 'You' }, { id: 'sound', label: 'Sound' }, { id: 'look', label: 'Look' }, { id: 'backup', label: 'Backup' },
      ]} />

      {page === 'you' && <>
      <section className="panel stack" style={{ gap: 10 }}>
        <h2 style={{ margin: 0 }}>AI helper</h2>
        <AiSetup />
      </section>
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
        <HintHead title="About you" hint="Your level, what you want to get better at and the music you like. Today's plan and the songbook use them." />
        <ProfileForm saveLabel="Save" onSaved={() => setSavedProfile(true)} />
        {savedProfile && <span className="small muted" role="status">Saved. Today's plan has been updated.</span>}
      </section>

      <section className="panel stack" style={{ gap: 10 }}>
        <HintHead title="Daily goal" hint="Any 5 minutes keeps your streak alive, with or without your guitar. Hitting the goal earns a bonus." />
        <Chips label="Minutes a day" items={[5, 10, 15, 20, 30, 45, 60].map(m => ({ id: m, label: `${m} min` }))} value={goal} onChange={setDailyGoalMin} />
      </section>
      <section className="panel stack" style={{ gap: 10 }}>
        <HintHead title="Get ready time" hint="Before anything that scores your timing (In time, the rhythm trainer, chord changes, exercises), a countdown gives you time to get your hands on the guitar. Then a bar of clicks counts you in." />
        <Chips label="Seconds before timed practice starts" items={GET_READY_CHOICES.map(s => ({ id: s, label: s ? `${s} s` : 'Off' }))} value={readySecs} onChange={v => { setGetReadySecs(v); setReadySecs(v) }} />
      </section>

      <section className="panel stack" style={{ gap: 10 }}>
        <HintHead title="Reminders" hint="Reminders skip days you've already practised, and they suggest guitar-free practice too, so they work on shift days." />
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
      </section>

      </>}

      {page === 'sound' && <>
      <section className="panel stack" style={{ gap: 10 }}>
        <HintHead title="Your guitar input" hint="Two minutes per input: it measures your room, your strings and the delay of your headphones, so notes are heard reliably and recordings land on the beat." />
        <ul className="act-list small">
          {(['mic', 'usb'] as const).map(k => (
            <li key={k}>
              <span>{k === 'mic' ? '🎤 Phone mic' : '🎸 USB amp (Amphonix)'}</span>
              <b>{isSetUp(k) ? `set up · sensitivity ${gear(k).gate} · timing ${latencyMs(k)} ms` : 'not set up yet'}</b>
            </li>
          ))}
        </ul>
        <button className="btn" onClick={() => setSetup(true)}>Set up an input</button>
      </section>

      <PedalSettings />

      <section className="panel stack" style={{ gap: 10 }}>
        <HintHead title="Playback sound" hint="Used for Hear it, tapping notes and the quizzes. On Auto, a Guitar Pro tab plays in its own guitar sound (acoustic, clean, overdrive or distortion). You can also switch it next to Hear it. Jam picks a sound for each style; change it there under Band. The amp sounds were made from your own Peavey 5150 captures and cab impulse responses; your files aren't inside the app, only the finished notes. Your own playing is never sent back out of the phone: you hear it only through your amp." />
        <Chips<'auto' | SoundId> label="Sound" items={[{ id: 'auto', label: `Auto (${inst.isUke ? 'nylon' : 'acoustic'}, or the song's own guitar)` }, ...SOUNDS.map(x => ({ id: x.id, label: x.label }))]} value={sound} onChange={v => void tryIt(v)} wrap />
        <p className="small muted" style={{ margin: 0 }}>{soundInfo(activeSound()).hint}</p>
      </section>

      </>}

      {page === 'look' && <>
      <section className="panel stack" style={{ gap: 12 }}>
        <HintHead title="Look" hint={'Psychedelic is neon colours with the samurai dogs and the rest of the KGuitar artwork all through the app, with the words kept on dark cards so they stay easy to read. Night is dim and low-glare for practising in bed. "Match my phone" switches between Day and Night with your phone\'s dark mode.'} />
        <div className="theme-cards" role="radiogroup" aria-label="Theme">
          {([
            { id: 'auto', label: 'Match my phone', sub: 'Day or Night' },
            { id: 'day', label: 'Day', sub: 'Bright and clear' },
            { id: 'night', label: 'Night', sub: 'Dim, low glare' },
            { id: 'psy', label: 'Psychedelic', sub: 'Neon, trippy, the dog' },
          ] as { id: ThemeChoice; label: string; sub: string }[]).map(t => (
            <button key={t.id} role="radio" aria-checked={theme === t.id} className={`theme-card t-${t.id}${theme === t.id ? ' on' : ''}`} onClick={() => setTheme(t.id)}>
              <span className="theme-swatch" aria-hidden="true" style={t.id === 'psy' ? { backgroundImage: `url(${cardSrc('shrooms')})` } : undefined} />
              <b>{t.label}</b>
              <span className="small muted">{t.sub}</span>
            </button>
          ))}
        </div>
        {theme === 'psy' && (
          <label className="opt-row opt-check">
            <input type="checkbox" checked={motion} onChange={e => setPsyMotion(e.target.checked)} />
            <span><b>Moving colours</b><span className="small muted">The background slowly drifts and the art floats. It holds still while KGuitar listens to you. Switch off to save battery.</span></span>
          </label>
        )}
        {theme === 'psy' && (
          <div className="stack samurai-pick" style={{ gap: 8 }}>
            <h3 style={{ margin: 0 }}>Your samurai</h3>
            <p className="small muted" style={{ margin: 0 }}>The samurai dog who greets you on finished songs, quizzes, celebrations and empty pages. Every one has a guitar.</p>
            <div className="dog-cards" role="radiogroup" aria-label="Your samurai">
              <button role="radio" aria-checked={dog === 'mix'} className={`dog-card${dog === 'mix' ? ' on' : ''}`} onClick={() => setPsyDog('mix')}>
                <span className="dog-card-art dog-mix"><PsyDog breed="shiba" /><PsyDog breed="lab" /><PsyDog breed="husky" /></span>
                <span>Mix it up</span>
              </button>
              {DOGS.map(b => (
                <button key={b.id} role="radio" aria-checked={dog === b.id} className={`dog-card${dog === b.id ? ' on' : ''}${b.name ? '' : ' unnamed'}`}
                  onClick={() => setPsyDog(b.id)} aria-label={b.name ?? `Samurai ${b.breed}`}>
                  <PsyDog breed={b.id} className="dog-card-art" />
                  {b.name && <span>{b.name}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        {theme === 'psy' && <ArtGallery />}
        <label className="opt-row opt-check">
          <input type="checkbox" checked={showArt} onChange={e => setShowArt(e.target.checked)} />
          <span><b>Show the KGuitar poster</b><span className="small muted">Small, in the menu and on Learn. Tap it to see it full size.</span></span>
        </label>
      </section>
      </>}

      {page === 'backup' && <>
      <BackupPanel />

      <section className="panel stack small" style={{ gap: 6 }}>
        <h2 style={{ margin: 0 }}>Credits</h2>
        <span className="muted">Recorded guitar and bass: tonejs-instruments samples by Nicholaus P. Brosowsky (github.com/nbrosowsky/tonejs-instruments).</span>
        <span className="muted">Drums: AVL Drumkits by Glen MacArthur (bandshed.net/avldrumkits, CC BY-SA 3.0); the trimmed samples in this app are shared under the same licence.</span>
        <span className="muted">Amp and acoustic sounds: rendered from the owner's own Neural Amp Modeler captures (MirrorProfiles 5150) and impulse responses (York Audio, Tone Factor, Calypso, PastToFutureReverbs).</span>
        <span className="muted">Theory lessons follow the chapters of Offtonic Theory (offtonic.com/theory); the lesson text here is original.</span>
        <span className="muted">Beat maker instruments: Salamander Grand Piano by Alexander Holm (CC BY 3.0, via Tonejs/audio); VSCO 2 Community Edition by Versilian Studios (CC0); MusyngKite soundfont (CC BY-SA 3.0, via gleitz/midi-js-soundfonts). The trimmed samples in this app are shared under the same licences.</span>
        <span className="muted">Chord shapes: chords-db (github.com/tombatossals/chords-db). Guitar Pro import: alphaTab. Pitch detection: pitchy.</span>
      </section>
      </>}
      {setup && <GearSetup onClose={() => setSetup(false)} />}
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

/** Every piece of the KGuitar artwork: tap one to see it full screen. */
function ArtGallery() {
  const [open, setOpen] = useState<number | null>(null)
  const item = open === null ? null : GALLERY[open]
  return (
    <div className="stack" style={{ gap: 8 }}>
      <h3 style={{ margin: 0 }}>The art</h3>
      <p className="small muted" style={{ margin: 0 }}>All the KGuitar artwork. Tap a picture to see it full screen, then tap to zoom in.</p>
      <div className="art-grid">
        {GALLERY.map((g, i) => (
          <button key={g.id} className={`art-tile${g.wide ? ' wide' : ''}`} onClick={() => setOpen(i)} aria-label={`Picture ${i + 1} of ${GALLERY.length}`}>
            <img src={thumbSrc(g.id)} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
      {item && <ArtViewer src={picSrc(item.id)} alt={`KGuitar art, picture ${open! + 1} of ${GALLERY.length}`} onClose={() => setOpen(null)}
        onPrev={() => setOpen(i => (i === null ? 0 : (i + GALLERY.length - 1) % GALLERY.length))}
        onNext={() => setOpen(i => (i === null ? 0 : (i + 1) % GALLERY.length))} />}
    </div>
  )
}
