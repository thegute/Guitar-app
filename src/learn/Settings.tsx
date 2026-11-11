// Settings: instrument (with a confirm step so you can't switch by accident), tuning, look, daily goal and reminders.
import { fullScreen, setFullScreen } from '../theme'
import { FloatPicker } from '../float/FloatLayer'
import { GuideScreen } from './GuideScreen'
import type { Go } from './path'
import { Ico, instIcon } from '../components/Icon'
import { Capacitor } from '@capacitor/core'
import { usePersist } from '../components/Controls'
import { AiSetup } from '../assistant/AiSetup'
import { ShortsSetup } from '../scan/ShortsFeed'
import { GET_READY_CHOICES, getReadySecs, setGetReadySecs } from '../components/GetReady'
import { useEffect, useState } from 'react'
import { Chips } from '../components/Controls'
import { adviceOn, onTips, setAdviceOn, setTipsMode, tipsMode, unmuteAllTips, type TipMode } from '../tips/tips'
import { INSTRUMENTS, setInstrument, setTuning, type Instrument, type InstrumentId } from '../instrument'
import { motionAllowed, setPsyMotion, setTheme, usePsyMotion, useTheme, usePsyDog, setPsyDog, type ThemeChoice } from '../theme'
import { SubTabs, useSubTab } from '../components/SubTabs'
import { PsyDog, PsyPic } from '../components/PsyArt'
import { DOGS, GALLERY, cardSrc, picSrc, thumbSrc } from '../art/samurai'
import { ArtViewer } from '../components/Art'
import { dailyGoalMin, setDailyGoalMin, useProgress } from './progress'
import { GearSetup } from '../components/GearSetup'
import { PedalSettings } from '../controls/PedalSettings'
import { BackupPanel } from '../components/BackupPanel'
import { useShowArt } from '../components/Art'
import { ProfileForm } from '../components/ProfileForm'
import { haptic, hapticsOn, setHapticsOn } from '../audio/tapFeel'
import { TALK_CARD_CHOICES, setTalkCardSecs, talkCardSecs } from '../assistant/talkCard'
import { UsagePanel } from '../components/UsagePanel'
import { onSoundChange, setSoundChoice, soundChoice, strum, loadSound, instrumentSound, activeSound, soundInfo, SOUNDS, type SoundId } from '../audio/pluck'
import { audio } from '../audio/engine'
import { gear, isSetUp, latencyMs, useGear } from '../audio/gear'
import { AudioSetup } from '../components/AudioSetup'
import { enableReminders, reminderSettings, remindersAvailable, updateReminderSettings, type ReminderSettings } from './reminders'
import { Win, WinArea } from '../components/Win'
import { handSize, setHandSize, type HandSize } from '../hand/neck'


/** The gear page: everything about how the app is set up, the floating cards, and the manual. Opened from the menu's
 *  Settings button on any screen (nav.ts openGear). Things you change while playing stay where you play. */
export function Settings({ inst, onExit, onGo, guideSec }: { inst: Instrument; onExit: () => void; onGo?: (g: Go) => void; guideSec?: string }) {
  useProgress()
  const theme = useTheme()
  const motion = usePsyMotion()
  const dog = usePsyDog()
  const [page, setPage] = useSubTab('settings', ['you', 'sound', 'look', 'cards', 'backup', 'manual'] as const)
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
        { id: 'you', label: 'You' }, { id: 'sound', label: 'Sound' }, { id: 'look', label: 'Look' }, { id: 'cards', label: 'Cards' }, { id: 'backup', label: 'Backup' }, { id: 'manual', label: 'Manual' },
      ]} />

      {page === 'you' && <WinArea area="setYou">
      <Win id="ai" title="AI helper" bodyClass="stack" bodyStyle={{ gap: 10 }}>
        <BubbleSwitch />
        <AiSetup />
      </Win>
      <Win id="tips" title="Tips" bodyClass="stack" bodyStyle={{ gap: 10 }}>
        <TipsSettings />
      </Win>
      <Win id="ytkey" title="YouTube key (Shorts)" bodyClass="stack" bodyStyle={{ gap: 10 }}>
        <ShortsSetup inSettings onDone={() => {}} />
      </Win>
      <Win id="inst" title="Instrument" bodyClass="stack" bodyStyle={{ gap: 10 }}>
        <div className="inst-cards" role="radiogroup" aria-label="Instrument">
          {(Object.keys(INSTRUMENTS) as InstrumentId[]).map(id => (
            <button key={id} role="radio" aria-checked={inst.id === id} className={`inst-card${inst.id === id ? ' on' : ''}`} onClick={() => inst.id !== id && setAsk(id)}>
              <span className="inst-art" aria-hidden><Ico n={instIcon(id)} /></span>
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
      </Win>

      <Win id="handsize" title="Your hand" bodyClass="stack" bodyStyle={{ gap: 8 }} resizable={false} hint="How far your fingers spread. KGuitar's fingering engine measures stretches in real distance (frets are wider near the nut), so it knows when to shift your hand and when a stretch is fine.">
        <HandSizePick />
      </Win>

      <Win id="about" title="About you" hint="Your level, what you want to get better at and the music you like. Today's plan and the songbook use them." bodyClass="stack" bodyStyle={{ gap: 10 }}>
        <ProfileForm saveLabel="Save" onSaved={() => setSavedProfile(true)} />
        {savedProfile && <span className="small muted" role="status">Saved. Today's plan has been updated.</span>}
      </Win>

      <Win id="goal" title="Daily goal" hint="Any 5 minutes keeps your streak alive, with or without your guitar. Hitting the goal earns a bonus." bodyClass="stack" bodyStyle={{ gap: 10 }} resizable={false}>
        <Chips label="Minutes a day" items={[5, 10, 15, 20, 30, 45, 60].map(m => ({ id: m, label: `${m} min` }))} value={goal} onChange={setDailyGoalMin} />
      </Win>
      <Win id="ready" title="Get ready time" bodyClass="stack" bodyStyle={{ gap: 10 }} resizable={false} hint="Before anything that scores your timing (In time, the rhythm trainer, chord changes, exercises), a countdown gives you time to get your hands on the guitar. Then a bar of clicks counts you in.">
        <Chips label="Seconds before timed practice starts" items={GET_READY_CHOICES.map(s => ({ id: s, label: s ? `${s} s` : 'Off' }))} value={readySecs} onChange={v => { setGetReadySecs(v); setReadySecs(v) }} />
      </Win>

      <Win id="remind" title="Reminders" hint="Reminders skip days you've already practised, and they suggest guitar-free practice too, so they work on shift days." bodyClass="stack" bodyStyle={{ gap: 10 }}>
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
      </Win>
      <UsagePanel />

      </WinArea>}

      {page === 'sound' && <WinArea area="setSound">
      <Win id="switches" title="Switches" bodyClass="stack" bodyStyle={{ gap: 6 }} resizable={false}>
        <HapticsSwitch />
        <KeepMetronome />
      </Win>
      <Win id="input" title="Your guitar input" hint="Two minutes per input: it measures your room, your strings and the delay of your headphones, so notes are heard reliably and recordings land on the beat." bodyClass="stack" bodyStyle={{ gap: 10 }}>
        <ul className="act-list small">
          {(['mic', 'usb', 'pedal'] as const).map(k => (
            <li key={k}>
              <span>{k === 'mic' ? <><Ico n="mic" /> Phone mic</> : k === 'usb' ? <><Ico n="guitar" /> USB pedal or interface (Pocket Master)</> : <><Ico n="headphones" /> Pocket Master + wireless (mono)</>}</span>
              <b>{k === 'pedal' ? `timing ${latencyMs(k)} ms${gear(k).latencyMs >= 0 ? '' : ' (a guess)'}` : isSetUp(k) ? `set up · sensitivity ${gear(k).gate} · timing ${latencyMs(k)} ms` : 'not set up yet'}</b>
            </li>
          ))}
        </ul>
        <button className="btn" onClick={() => setSetup(true)}>Set up an input</button>
      </Win>

      <Win id="rig" title="Audio setup" hint="How KGuitar's sound reaches your ears. With the Pocket Master plugged in, everything is mono so your wireless (which only hears the left side) gets all of it, and KGuitar never plays your guitar back (the pedal does that with no delay). Each setup keeps its own timing correction."><AudioSetup /></Win>

      <Win id="pedals" title="Hands-free (footswitch)"><PedalSettings /></Win>

      <Win id="sound" title="Playback sound" bodyClass="stack" bodyStyle={{ gap: 10 }} hint="Used for Hear it, tapping notes and the quizzes. On Auto, a Guitar Pro tab plays in its own guitar sound (acoustic, clean, overdrive or distortion). You can also switch it next to Hear it. Jam picks a sound for each style; change it there under Band. The amp sounds were made from your own Peavey 5150 captures and cab impulse responses; your files aren't inside the app, only the finished notes. Your own playing is never sent back out of the phone: you hear it only through your amp.">
        <Chips<'auto' | SoundId> label="Sound" items={[{ id: 'auto', label: `Auto (${inst.isUke ? 'nylon' : 'acoustic'}, or the song's own guitar)` }, ...SOUNDS.map(x => ({ id: x.id, label: x.label }))]} value={sound} onChange={v => void tryIt(v)} wrap />
        <p className="small muted" style={{ margin: 0 }}>{soundInfo(activeSound()).hint}</p>
      </Win>

      </WinArea>}

      {page === 'look' && <WinArea area="setLook">
      {Capacitor.isNativePlatform() && <Win id="full" title="Full screen" resizable={false}><FullScreenSwitch /></Win>}
      <Win id="look" title="Look" bodyClass="stack" bodyStyle={{ gap: 12 }} hint={'Psychedelic is neon colours with the samurai dogs and the rest of the KGuitar artwork all through the app, with the words kept on dark cards so they stay easy to read. Night is dim and low-glare for practising in bed. "Match my phone" switches between Day and Night with your phone\'s dark mode.'}>
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
        {theme === 'psy' && motionAllowed() && (
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
      </Win>
      </WinArea>}

      {page === 'backup' && <WinArea area="setBackup">
      <Win id="backup" title="Backup"><BackupPanel /></Win>

      <Win id="credits" title="Credits" bodyClass="stack small" bodyStyle={{ gap: 6 }}>
        <span className="muted">Recorded guitar and bass: tonejs-instruments samples by Nicholaus P. Brosowsky (github.com/nbrosowsky/tonejs-instruments).</span>
        <span className="muted">Drums: AVL Drumkits by Glen MacArthur (bandshed.net/avldrumkits, CC BY-SA 3.0); the trimmed samples in this app are shared under the same licence.</span>
        <span className="muted">Amp and acoustic sounds: rendered from the owner's own Neural Amp Modeler captures (MirrorProfiles 5150) and impulse responses (York Audio, Tone Factor, Calypso, PastToFutureReverbs).</span>
        <span className="muted">Theory lessons follow the chapters of Offtonic Theory (offtonic.com/theory); the lesson text here is original.</span>
        <span className="muted">Beat maker instruments: Salamander Grand Piano by Alexander Holm (CC BY 3.0, via Tonejs/audio); VSCO 2 Community Edition by Versilian Studios (CC0); MusyngKite soundfont (CC BY-SA 3.0, via gleitz/midi-js-soundfonts). The trimmed samples in this app are shared under the same licences.</span>
        <span className="muted">Chord shapes: chords-db (github.com/tombatossals/chords-db). Guitar Pro import: alphaTab. Pitch detection: pitchy. PDF reading: pdf.js (Mozilla, Apache 2.0).</span>
        <span className="muted">Notes from a recording: Basic Pitch by Spotify (Apache 2.0), running on TensorFlow.js.</span>
      </Win>
      </WinArea>}
      {page === 'cards' && (
        <section className="panel stack" style={{ gap: 12 }} data-testid="gear-cards">
          <p className="small muted" style={{ margin: 0 }}>
            Floating cards hover over everything. Pick a different set for each screen (most people use one at a time). On the screen, drag a card's bar to move it,
            drag its corner to resize it, – shrinks it to a small bubble, × hides it.
          </p>
          {([['play', 'Song player'], ['songs', 'Songs'], ['learn', 'Learn'], ['jam', 'Jam'], ['tools', 'Tools']] as const).map(([id, label]) => (
            <div key={id} className="stack" style={{ gap: 6 }}>
              <b>{label}</b>
              <FloatPicker screen={id} />
            </div>
          ))}
        </section>
      )}
      {page === 'manual' && <GuideScreen key={guideSec ?? ''} initial={guideSec} onExit={onExit} onGo={g => onGo?.(g)} embedded />}
      {setup && <GearSetup onClose={() => setSetup(false)} />}
      {target && (
        <div className="sheet-backdrop" onClick={() => setAsk(null)}>
          <div className="sheet confirm" role="alertdialog" aria-modal="true" aria-labelledby="switch-title" onClick={e => e.stopPropagation()}>
            <span className="inst-art big" aria-hidden><Ico n={instIcon(target.id)} /></span>
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

function BubbleSwitch() {
  const [on, setOn] = usePersist('askBubble', true)
  const [secs, setSecs] = useState(talkCardSecs)
  return (
    <>
      <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={on} onChange={e => { setOn(e.target.checked); try { localStorage.setItem('kg:askBubble', JSON.stringify(e.target.checked)) } catch { /* noop */ } dispatchEvent(new Event('kg-bubble')) }} /> <span>Show the helper bubble on every screen (drag it anywhere to move it out of the way)</span></label>
      <div className="stack" style={{ gap: 4 }}>
        <span className="small">Spoken answers stay on screen after the voice finishes:</span>
        <Chips label="How long spoken answers stay up" items={TALK_CARD_CHOICES.map(v => ({ id: v, label: v === 0 ? 'Until I close it' : v < 60 ? `${v} s` : '1 min' }))} value={secs} onChange={v => { setTalkCardSecs(v); setSecs(v) }} />
        <span className="small muted">Talking gets short answers; typing your question gets a fuller explanation that stays until you close it.</span>
      </div>
    </>
  )
}

function FullScreenSwitch() {
  const [on, setOn] = useState(fullScreen)
  return (
    <section className="panel stack" style={{ gap: 6 }}>
      <label className="row" style={{ gap: 8 }}>
        <input type="checkbox" checked={on} onChange={e => { setOn(e.target.checked); setFullScreen(e.target.checked) }} />
        <span><b>Full screen</b><span className="small muted"> The phone's buttons, status bar and taskbar tuck away so KGuitar gets the whole screen. Swipe up from the bottom middle and they come back for a few seconds, then tuck away again.</span></span>
      </label>
    </section>
  )
}

function KeepMetronome() {
  const [on, setOn] = usePersist('keepMetronome', false)
  return (
    <section className="panel stack" style={{ gap: 6 }}>
      <label className="row" style={{ gap: 8 }}>
        <input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} />
        <span><b>Keep the metronome going when I change pages</b><span className="small muted"> Everything else that plays (tab previews, exercises, Jam, the beat maker, videos) stops when you leave its page.</span></span>
      </label>
    </section>
  )
}

function HapticsSwitch() {
  const [on, setOn] = useState(hapticsOn)
  return (
    <section className="panel stack" style={{ gap: 6 }}>
      <label className="row" style={{ gap: 8 }}>
        <input type="checkbox" checked={on} onChange={e => { setOn(e.target.checked); setHapticsOn(e.target.checked); if (e.target.checked) haptic('medium') }} />
        <span><b>Vibrate on taps</b><span className="small muted"> A light buzz when you tap pads, keys and the rhythm trainer, and a "got it" buzz when a loop or recording is saved, a string is in tune or a quiz answer is right. It never buzzes while the mic is recording.</span></span>
      </label>
    </section>
  )
}

function HandSizePick() {
  const [size, setSize] = useState(handSize)
  return (
    <>
      <Chips<HandSize> label="Hand size" items={[{ id: 'small', label: 'Small' }, { id: 'medium', label: 'Medium' }, { id: 'large', label: 'Large' }]} value={size} onChange={v => { setSize(v); setHandSize(v) }} />
      <span className="small muted">{size === 'small' ? 'Short stretches; the hand moves more often.' : size === 'large' ? 'Four-fret stretches are fine even at frets 1 to 4.' : 'Four frets comfortably from about fret 3 up; lower down the hand shifts instead.'}</span>
    </>
  )
}

/** Settings → You → Tips: how tips show (the glowing dot on ✨, always, only when asked, off) and the guitar-advice switch. */
function TipsSettings() {
  const [mode, setMode] = useState<TipMode>(tipsMode)
  const [advice, setAdvice] = useState(adviceOn)
  const [reset, setReset] = useState(false)
  useEffect(() => onTips(() => { setMode(tipsMode()); setAdvice(adviceOn()) }), [])
  return (
    <>
      <Chips label="How tips show" items={[{ id: 'dot', label: 'Glowing dot' }, { id: 'always', label: 'Always show' }, { id: 'ask', label: 'Only when I ask' }, { id: 'off', label: 'Off' }]}
        value={mode} onChange={v => setTipsMode(v as TipMode)} />
      <p className="small muted" style={{ margin: 0 }}>
        {mode === 'dot' ? 'A gold dot glows on the ✨ bubble when there\'s a tip for the screen you\'re on: tap ✨ to read it.'
          : mode === 'always' ? 'The tip card opens by itself a moment after there\'s a new one (never while you\'re playing).'
            : mode === 'ask' ? 'No dot: ask the helper (✨) for a tip whenever you want one.'
              : 'No tips.'}
      </p>
      <label className="row small" style={{ gap: 8, alignItems: 'center' }}>
        <input type="checkbox" checked={advice} onChange={e => setAdviceOn(e.target.checked)} data-testid="tips-advice" />
        <span><b>Guitar advice</b> too: technique, timing and practice tips, not just how to use the app</span>
      </label>
      <div className="row"><button className="btn sm" onClick={() => { unmuteAllTips(); setReset(true) }}>Show every tip again</button>{reset && <span className="small muted" role="status">Done: tips you dismissed will come back.</span>}</div>
    </>
  )
}
