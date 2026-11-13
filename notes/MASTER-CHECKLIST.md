# KGuitar master checklist (2026-11-11): EVERY item, one place
Built line by line from the owner's "KGuitar Master Game Plan & Implementation Roadmap" PDF (notes/master-roadmap-2026-11-11.pdf,
made with Gemini, all 12 pages) + notes/MASTER-PLAN.md + the owner's later additions. Agreed order: Stage 1 → 2 → 3 (sound engine, started
2026-11-12; owner: "do the sound engine… best possible techniques… don't cut any corners… professional studio grade"; Mac harvest moved
up right after the engine core + packs) → AI teacher → 4 → 5 → 6 → 7. Theory course runs alongside (owner: "now, then the book pack").
✅ done · 🔨 in progress · ⏳ queued · ➡ moved (where). Keep this file current; nothing here may be dropped without asking him.

## Golden rules (PDF page 1 + owner)
- ✅ Work only on big-update; main only on "ship it". Paid-plugin packs and his books never in the public repo (phone / Drive).
- ⏳ "Zero corners cut": best DSP / neural models / studio samples, no toy fallbacks. A design review with him before each stage.

## Baseline the PDF lists as built (commit 3b01f79): all ✅
Menu Songs·Learn·Jam·Tools·Ask·Settings, Play merged into Songs + Now playing · Game Mode highway, finger colours, bouncing ball,
Hear it drives it · 9 floating cards + resizable tidy-grid windows · Exercises + lick chainer in Learn (For you, Make your own) ·
5-layer fretboard (CAGED, triad X-ray, pentatonic, 3NPS bridge, embellishments, voice-leading arrows, gold targets), tunings
(Taro patch, Wahine, Mauna Loa, Drop D, guitalele, tenor, low-G baritone), style paths (melodic prog, prog-pop, ambient tapping, Gossett).

## Stage 1: test and layout fixes
- ✅ Lick chainer test (Make your own) · ✅ phone splitter drag (cards keep off resize bars) · ✅ logic + browser suites at cover,
  inner and tablet (1280×800), day / night / psy, no sideways overflow (e799633). Re-run in full before the test APK (tonight).

## Stage 2: navigation, floating card hooks, Band behind me, library, manual
- ✅ Jam = 3 choices (Play with a band · Make a beat · Loop myself) + Riff Scanner link.
- ✅ Jam publishes chord now/next, key, bar/beat, BPM to the floating cards (cards pop up when the band starts).
- ✅ Glowing tip dot on ✨ + Always show / Dot / Only when I ask / Off; app tips + guitar advice with its own switch.
- ✅ Band behind me: GP/Songsterr band tracks in sync; chord band for chord-only songs (style guessed, changeable).
- ✅ Mixer floating card (me / band / drums / bass / other, mute + solo) in Play and Game.
- ➡ Stage 4: stems from a YouTube video or song file (htdemucs_6s) saved in IndexedDB as faders in Play AND Game Mode
  (original guitar at 0% = you are the guitar, 15% = quiet guide, solo to study it). Owner: "YouTube band-minus-guitar is Stage 4".
- ✅ One Songs library (Learning first, search, chips All / Learning / My songs / Songbook / Learned, Saved for later).
- ✅ PDF library pills: Practice plan, Scanned (Riff Scanner + recordings), Backing tracks, Style and Tuning pickers.
- ✅ One "Add a song" box: YouTube/Shorts link (Find a tab / Scan it / Just save), song name → tab search, GP/audio/video files, screenshots.
- ✅ Shorts: Mr. Tabs, Level Up Guitar Tabs, Kenneth Acoustic pre-followed + "Find channels for me".
- ✅ Manual: 1-tap "Save the manual (PDF)" in How to use KGuitar: a 2-minute Quick Start with Day Mode screenshots + every guide
  section with why, when and how (tools/make-manual.cjs → public/manual/KGuitar-manual.pdf; re-run when the guide changes).
- ✅ (owner extras) Game Mode: zoom, look-ahead, sized his way, full screen with cards + settings, song plays along with a slider;
  tab lines fill the width.

## THE PLAN FROM 2026-11-12 07:28 (owner: "do 1, 2, 3, 5 (use my Orange Tree and Ample), 6, 7, 8, 9 … build it so things build on
## each other and use the technologies in harmony … don't forget my Kontakt Playbox")
A. Real instruments (Mac harvest; tools/mac-scan.sh, tools/harvest/*)
  - ⏳ A1 full read-only scan + report (what each plugin gives KGuitar and how)
  - ⏳ A2 acoustic: Orange Tree (strings × frets, 3 velocity layers, 4 round robins, pm, mute, releases, fret/pick noise) +
    Ample SJ-200 Strummer (D / U / P / X whole strums: maj min 7 m7 maj7 sus2 sus4 add9 5 × 12 keys) → private packs.
    Bodies/rooms (owner's #5): the real body + mic sound comes from his Orange Tree / Ample recordings; IRs the scan finds
    (Nembrini, his IR folders) rendered/used as the room and the "make my electric sound acoustic" body.
  - ⏳ A3 Playbox: chord sets → chord data (Jam suggestions, beat maker chord pads, Playbox Mode) + pad/chord banks (Jam beds,
    looper beds, under My recordings, Game Mode chord swell option); private packs only.
B. One sound core (owner's #3): C++ engine "kgaudio" built twice: Android native (Oboe, JNI Capacitor plugin) and WebAssembly
   (AudioWorklet) for the web: sampler (packs), strum engine, console (buses, glue + true-peak limiter, convolution), all ported
   from the TS versions (which stay as the reference + fallback).
  - ⏳ B1 core + Oboe output; B2 native input (lock-free ring, measured latency, "Start when I play", 3-min history / capture
    last pass); B3 audio health check (owner's #9: xruns, callback timing, CPU, in Settings, logged).
C. ⏳ Live neural amp models (owner's #2): NeuralAmpModelerCore (MIT) inside kgaudio: clean electric DI packs through any .nam /
   Archetype-matched capture; the live guitar too in the opt-in interface setup.
D. Intelligence: ⏳ D1 neural listener (owner's #6: polyphonic notes, bends, slides; runs in the core) → ⏳ D2 AI teacher (#7)
   → ⏳ D3 one spaced-review model for songs, licks, lessons, Game sections (#8), feeding the teacher.

## Owner notes after build-43 (2026-11-11 21:15: "add them to the list", not fixed yet)
- ✅ Now playing bar ✕ (2026-11-12, big-update): hides it on every screen until another song is opened (`kg:npHidden` = the song
  it was hidden for); test `tests/browser/np-test.cjs`.
- ⏳ Game Mode ball must feel EXACTLY like Yousician's. Now it sometimes "bounces too much" / floats to the next long note. Before
  fixing: study Yousician's ball (videos, frame by frame): one hop per note onset, landing exactly on the onset, hop height and
  shape vs the gap, what it does on long notes, rests, chords and fast runs, and how it leads the eye to the NEXT note. Then match
  it, check with him on the phone. Its job: help him time the next note.

## AI teacher (owner 2026-11-11, right after Stage 2)
- ⏳ Listens to him play and coaches: spoken + text card; strictness is his setting; KGuitar's measurements are the facts, Gemini
  hears a short clip only while the teacher listens; in Play, Game, Learn (lessons, Zero to Hero, gates, check-ins), technique
  trainers, Jam/looper, a Teacher floating card; remembers past advice; built-in coach without a key.
- ⏳ Reads his books (private pack) to teach better; "explain it back" checks in the theory course.

## Theory course (owner 2026-11-11, alongside)
- 🔨 Replaces the old theory lessons: 8 levels, beginner → expert, No Bull is the spine of Levels 1–3, Kolb + his other books after;
  deep lessons (why, ground-up idea, worked examples, hear it, mistakes, practice GOALS + challenge round, use it, check, go deeper,
  spaced review); ear training woven into every level; optional notation track; rhythm in every level; ukes adapted; open with a
  suggested path, mastery checks strongly suggested, never required. Plan: notes/THEORY-COURSE.md. ✅ Levels 1–3 complete (26 lessons
  = all of No Bull, 2026-11-11); ✅ old lessons Levels 1–3 cover removed (old links redirect); ✅ Daniel Seriff's 5-fret triad window
  in L2. ⏸ Levels 4–8 paused while other work goes first (owner 2026-11-11); his approach to be used for L4–L6.
- ✅ Book pack (private) + My books: shelf, reader, "In your books" links, Play this page, book courses, helper grounding, search.

## Stage 4: Riff Scanner "three-sense" overhaul
Video tab reading:
- ⏳ Temporal median playhead eraser (3–5 scroll-aligned frames, the moving cursor vanishes before reading digits).
- ⏳ Smooth-scroll vs page-flip detection (track bar lines so repeated riffs aren't skipped; page cards: wait for fades, stack in order).
- ⏳ Crop headroom +35% above / +20% below the staff (h/p arcs, bend labels, vibrato, triplet brackets, chord symbols).
- ⏳ Audio-visual fusion: always run audio too; the guitar's pitch breaks ties on blurry digits (0/8/9, 1/7); Beat This! sets BPM + grid.
Audio transcription:
- ⏳ Guitar stem first (htdemucs_6s, unload before the note/beat models to save RAM) + raw-mix 2–8 kHz transients so picks stay sharp.
- ⏳ Fast notes: min note ~40 ms, tuned thresholds; automatic 0.5× pitch-kept pass for >130 BPM or dense runs.
- ⏳ Real articulations from pitch contours: h / p (no new pick attack, same string in the hand box), slides, bends, vibrato (4–8 Hz).
- ⏳ Dual-grid quantizer (16ths vs triplets/sextuplets + 32nd grace slots) anchored to Beat This! downbeats.
- ⏳ "Watch the guitarist's hand": keyframes → Gemini Vision finds capo + fret zone → soft prior for fingering.
Pro expansions:
- ⏳ Unsure-note amber glow (<80% confidence) + 1-tap wheel of alternative string/fret (or digit) with sound, hand box recalculated.
- ⏳ Slow-motion harmonic spectrogram scrubber under the timeline, pitch + overtones shown on the Mini neck card.
- ⏳ Tuning + capo pre-classifier (Standard, Drop D, Eb, Taro patch, capo N) with a 1-tap switch.
- ⏳ Palm-mute and natural / pinch harmonic tagging from the spectrum.
- ⏳ Live play-along upgrades in noteDetect: 40 ms lockout where the tab expects h/p/slides, follow bend trajectories, distortion
  overtone rejection only on a fresh low-string attack, looser tolerances on low wound acoustic strings; check with the bench + Jam
  Origin F1 scores.
- ⏳ (earlier owner list) Riff Scanner handles ALL video kinds; scan an A–B section; test case: the Billy Strings Short.

## Stage 3: the studio-grade audio engine + Mac harvest (contract: notes/AUDIO-ENGINE.md)
Console:
- ⏳ 6 buses: Drums (transient shaper, parallel saturation, kick trigger for sidechains) · Bass (28 Hz subsonic, mono below 110 Hz,
  kick ducking) · Guitars (stereo imaging, Nembrini body IR send, "Auto-Pocket Lead Carve": backing guitars dip 1.5–3.2 kHz by
  2.5 dB only while he plays) · Keys/synths/chops ("Kick Pump" ducking, tape warmth, mid-side widener) · Looper + Perform FX
  (Signalsmith real-time pitch/time, bass octave, half speed, 1-tap resample) · Live input + Guitarcatcher (keeps rig.ts rules).
- ⏳ 3 aux sends: wood room IR (one room for acoustic, bass, drums), plate/shimmer (leads, choirs), tempo-synced tape delay.
- ⏳ Master: 90 Hz sidechain-HP VCA glue (2:1, 30 ms, auto release) + 4× oversampled look-ahead true-peak limiter at −0.3 dBFS.
Engine core:
- ⏳ 6-string voice stealing (12 ms finger-lift damping on the same string) + sympathetic open strings.
- ⏳ Lock-free SharedArrayBuffer ring buffers (fallback) + "Capture last pass": 3-minute rolling audio + 4-bar note/pad history.
- ⏳ One sample-accurate master clock for Jam, Strum Machine, Play, Game, looper, beat maker.
- ⏳ Continuous pitch-contour spine (midiFloat, bend, RMS, pick flux at ~90 Hz) for scanner, Game bend arches, Guitarcatcher.
Mac harvest (no Logic work; packs to his phone/Drive, 2 GB+ OK):
- ⏳ FIRST (owner 2026-11-11, "not now but later"): a FULL SCAN of his Mac (when linked) for everything usable: the 8 Archetypes,
  Ample guitars, Orange Tree samples, Nembrini, Humanoid, VocalEssential, Jam Origin, .nam / IRs, AND Native Instruments **Playbox**
  (Kontakt: chord/sample-based instrument; render its sounds/chord sets into packs headlessly like the others, if its licence
  allows personal use), then a report of what each can give KGuitar and how. Ask before deleting anything on his computer.
- ⏳ Batch 1 acoustic: Orange Tree through Nembrini bodies + mic blend, 3–4 round robins, notes 38–84, boom/alt bass, palm mutes,
  bass walks · Ample SJ-200 Strummer D/U/P/X chords (maj, min, 7, m7, maj7, sus2, sus4, add9, 5) in 12 keys · slack key bank
  (Taro patch, Wahine, Mauna Loa, harmonics 5/7/12) · 10 Nembrini body IRs + a 1-tap "Make my electric sound acoustic" switch.
- ⏳ Batch 2 electric: real sampled DI (Orange Tree Evolution Electric) through the 8 Archetypes + .nam: Cory Wong funk chucks/stabs,
  Mayer clean + double stops, Asato shells + legato, Henson sparkly clean + Multivoicer chord bank, Petrucci lead + doubler,
  Misha chugs + odd groupings, Gojira heavy + scrapes + whammy FX, Rabea Overlord pads/drones (for Jam, beat maker, looper).
- ⏳ Playbox (with the Mac scan): render its chord sets to chord data / MIDI for Jam + beat maker chord libraries (keeping its
  6-note voicings) and bounce playbox-pads / playbox-chords banks (ambient beds for Ichika / Plini / neo-soul / lo-fi), private
  pack only (NI licence: personal use, never redistributed, never in the repo).
- ⏳ Batch 3: Humanoid choir + Multivoicer instrument, 2–3 vocal-chop pad banks (VocalEssential + Humanoid), hum-to-tab and
  hum-to-synth (hum a melody → lead/synth/chop + a playable tab), spoken count-ins and chord callouts through VocalEssential,
  Jam Origin ground truth for the scanner + human strum/fingerpick timing templates for strums.ts.

## Stage 5: Strum Machine carbon copy + multi-genre rhythm engine
- ⏳ Owner 2026-11-12: "looking forward to Strum Machine"; it must have ELECTRIC tones too (his Archetypes packs from the harvest),
  and every idea in the Gemini PDF's Strum Machine section (re-read notes/master-roadmap-2026-11-11.pdf before starting Stage 5).
- ⏳ Real-instrument stitching: Orange Tree dreadnought, Ample SJ-200, Weissenborn slack key, Dual-acoustic (boom-chick + runs 25% L,
  lush strums 25% R); electric mode with the same chart: prog-metal chugs + extended arpeggios, Cory Wong funk, Mayer/Asato neo-soul,
  reggae skanks.
- ⏳ Band settings: 2D strum-feel pad (boom↔chuck, strum↔crosspick), upstroke swing, backbeat, damped sustain; automatic bass runs
  (Off / Occasional / Frequent); open shapes, virtual capo, Drop D, Celtic drop D, Taro patch, "Cadd9 for C in G"; standup bass,
  mandolin/banjo chop, foot tap, drums, each with volume, pan, range, pattern.
- ⏳ Chart: 2/3/4 chords a bar, pushes, holds, rests, repeats + 1st/2nd endings, parts A/B, 1-tap transpose, letters / Nashville /
  Roman; auto speed-up every N reps; Scaler-style "suggest next chord" (voice-led subs, borrowed chords, passing chords, preview);
  YouTube / audio backing analyser (key, BPM, chords) driving the grid + cards; "Write a lead / flatpicking break over this" → tab
  in Play/Game with the band.
- ⏳ (MASTER-PLAN) 300 songs, bluegrass first, public domain / traditional / original; automatic style + level for every song.

## Stage 6: beat maker groovebox (mockup first for his OK, at cover 412×915, inner 840×757, tablet 1280×800)
- ⏳ Everything in MASTER-PLAN item 6 (pro layout, pads, views, parts A–D, pad editor, sounds drawer, voice "record this",
  starters, Variation, Fill, swing, humanise, riff → pads, chord pads, practice over it, kits, arp/strum pills, Kick Pump,
  Auto-Bass, Warmth + Length) PLUS:
- ⏳ Full-screen cockpit (transport at pixel 0, small ⤡); unfolded/tablet 4 quadrants, no scrolling; tabletop split.
- ⏳ Match a Song's Vibe (BPM, meter, swing, groove DNA, key/colour → similar-but-different beat, "How close?", Reroll,
  cousin progression, extract one-shots).
- ⏳ Guitarcatcher (guitar → synths/choirs/808/pads live, <12 ms, into the piano roll).
- ⏳ **Playbox Mode** (owner 2026-11-11: has NI Playbox, wants it in the app; Gemini's notes in the chat): a chord as a 6-layer stack,
  one sound per string/chord note (e.g. 808 sub on the root, acoustic pluck, clean Archetype note, Humanoid choir, vocal chop,
  shimmer bell), from his packs or his own pads; Motion modes Strum (Down / Up / Zig-zag / Outside-in at strum speed), Arp (on the
  grid) and Grain (granular clouds from pads or guitar loops); 🎲 Roll samples with 🔒 locks (Chords / Samples / FX); a dropped or
  recorded sample is pitch-detected and slotted into the stack; Guitarcatcher strums play the stack. In the beat maker chord pads
  and Jam's backing pad.
- ⏳ **Playbox around the app** (owner picked ALL of these 2026-11-11; build them once the Playbox packs exist):
  1 voice-leading lessons with each chord voice its own sound (follow the 3rd into the next 7th) · 2 chord-tone ear drills ("which
  sound moved?", "which one is the 9th?") · 3 mode / key beds in Scales, the modes lessons and the Ear trainer drone · 4 Playbox chord
  sets turned into playable guitar voicings (Chords tool, Level 5 voicing lessons) · 5 ambient texture backing in Play for chord-sheet
  songs · 6 ambient follower: a pad that follows the chord you play · 7 one-tap Playbox stack as looper track 1 (Grain motion) ·
  9 re-voice found chords (Find the chords / Riff Scanner) and send them to Jam or Tab maker · 10 Playbox chord sets as style-tagged
  Jam starters with the Composer writing over them · 11 a Playbox bed under My recordings / Then vs Now takes · 12 the AI teacher
  plays a voicing in its chat card. 8 an optional chord swell as a Game Mode reward when you hit a chord well (owner: "add that as an option"; a setting, off by default unless he says otherwise).
- ⏳ 16 Levels, Tidy pads, step gestures (velocity, ratchets, hold wheel: fills, probability, pitch lock, per-row lengths /
  polyrhythms), latched XY trails, Auto-build song A–D, Track mute mode.

## Stage 7: Learn mastery rebuild + phone stompbox + sync
- ⏳ BOTH (owner): 6 Pickup-style grades for the path AND the PDF's 10 deep-dive units (CAGED connection; close + spread triads;
  7 modes + modal mixture; intervals + melodic ear training; shell, drop-2, extended voicings; voice leading + guide tones;
  playing the changes; progressive melodic metal; Dylan Gossett acoustic storytelling; Hawaiian slack key / Taro patch).
- ⏳ 15-minute daily micro-routine: see it + video → targeted drill with auto speed ramp (+3% after 2 clean passes) → jam over
  Strum Machine / Archetype backing → graduation check-in recorded in Then vs Now.
- ⏳ Native Android Oboe/AAudio stompbox (<8 ms) ADDED ON TOP of the Pocket Master (looper, synth, backing; doesn't replace its
  tones): .nam amps, Nembrini IRs, gate, comp, drive, chorus, synced delay, reverb, Guitarcatcher, looper; bar-synced preset
  switching (clean verse → lead solo); MidiPlugin.java two-way USB/BLE MIDI for the Pocket Master and the Chocolate Plus.
- ⏳ Light cloud sync (lessons, streaks, charts, card layouts, mic overrides) + streaming his private packs from Google Drive.

## Other promises (MASTER-PLAN, handoff)
- ✅ Tidy-grid windows · ✅ Exercises in Learn · ⏳ Game Mode extras: looper "start when I play" · ⏳ keep the brother's guide in step
  with the app · ⏳ GitHub Pages web app goes live with "ship it" (he must switch Pages on).

## Saved for after the sound harvest (owner, 2026-11-12)
- [ ] **Looper "play it, hear a real bass"**: play a bassline on the guitar, KGuitar works out each note (noteDetect / the
      transcriber) and the looper track plays them with the recorded Studio Bass packs (velocity from the pick; bass sound
      switchable after: fingers / sixties / modern / upright). Owner chose this over the octave-down track.
- [ ] **Phone as a multi-effects pedal** (brainstormed, owner liked it):
  - Live amp tones: NAM captures of HIS Archetype tones made on the Mac (test signal through each tone → train NAM, lite/
    feather size), run live on the phone; time effects from KGuitar's own space. Private like the packs.
  - Acoustic / nylon simulator: matching filter learned from the paired Strat DI ↔ Flatpick 6 (and J-45, Modern Nylon)
    notes, applied live to the electric (Aura / Line 6 style).
  - Split with the Pocket Master (gate / drive / tuner stay on the pedal); per-song snapshots on the Chocolate footswitch;
    Henson octave synth live.
  - FIRST: **research how to make the latency unnoticeable** (native Android audio path: AAudio / Oboe low-latency
    exclusive mode, USB audio through the Pocket Master, buffer sizes, measured round trip on the Fold 8; what pro Android
    amp apps achieve) and measure before building anything else. Ask him: home (headphones / speaker) or also live with the Spark.
- [ ] **Speed / power / accuracy plan (owner asked 2026-11-12 13:05; proposed, not yet approved in detail)**:
  1. Native audio core (C++ in a Capacitor plugin: Oboe / AAudio low-latency exclusive mode, 48 kHz, small buffers, USB
     through the Pocket Master): live effects (NAM amps, partitioned-convolution IRs, acoustic sim), sample/pack player,
     looper recording, metronome, all sample-accurate on one native clock. WebView = UI only; the web version keeps Web Audio.
     Target < 10 ms round trip; measure on the Fold 8 first (automatic loopback latency test per rig).
  2. Note listener native too (onset + pitch in C++, ~2–3 ms hops): faster, steadier Play / Game / tuner / "start when I play".
  3. ML on the phone's NPU (ONNX Runtime QNN / NNAPI execution provider): Demucs, Basic Pitch, Beat This, the guitar-note
     model several times faster; neural polyphonic listener (D1) so chords are judged note by note, plus bends / slides / h-p.
  4. App speed: lazy-loaded screens, PlayScreen split, tab + Game highway on canvas / OffscreenCanvas, heavy analysis in
     workers, packs decoded once into a PCM cache (no decode hiccups), quicker start-up.
  5. Native BLE-MIDI for the Chocolate Plus (all 4 buttons + long press, no keyboard-mode lag).

## Owner's bug list + asks (2026-11-12 15:44, from the build-43 APK)
- [ ] Play top bar ("1 of 53 · bar 81 …", next note) flickers between texts at high speed in In time (check Wait mode,
      Game, music stand, every readout). He saw flicker in other apps too, so check it's ours first.
- [ ] Play: a metronome with a volume SLIDER (silence ↔ loud) on screen while playing a tab, part of the same "sounds while
      I play" mixer as the backing track / Strum Machine (me / band / click buses).
- [ ] Play: the highlight moves in time with the beat THROUGH RESTS too (In time: a rest gets its turn on the beat).
- [ ] Add a song: a 2-page tab PDF came in as one 2-note chord. Redo the PDF tab reader (with the Riff Scanner overhaul).
- [ ] My books (json book pack): tab pages unreadable (one number per line), some pages empty. Keep the page LAYOUT
      (monospace, line positions), show the book's PICTURES in the page viewer (pack needs page images), and the new Riff
      Scanner must read tabs printed in his books. Waiting for his screenshots.
- Sounds: owner prefers the Ample (SJ) acoustic over Flatpick 6 after re-listening → Ample = primary acoustic, Flatpick 6
  second. Ample Guitar M (Martin dreadnought) and Ample Guitar L (nylon → ukulele mode) arrive tonight; he prefers
  dreadnoughts over jumbos, so Ample M is likely the new primary once rendered (blind A/B first).
- Native sound core (#1 of the speed plan): owner said go. Phone upgrade = nothing to redo (ONNX Runtime picks the chip).
- [x] Play top bar flicker: the readout grew/shrank per judged note (whole screen jumped); fixed height + In time tally. (2026-11-12)
- [x] Play click with a volume slider (strip under the play buttons, both modes; Wait mode runs a metronome at the song's tempo).
- [x] In time: the highlight steps through rests on their beat (cursor from every step's beat, rests included).
- [x] Books: real page first with the PDF, junk OCR hidden as "a picture, music or tab is here", add the PDF from the reader;
      "Read this page's tab" reads right where you tapped (it went to a tucked-away window and needed a second tap).
- [x] Sultans PDF: a Songsterr print draws its fret numbers as shapes; the time signature's 4 / 4 became a bogus chord.
      Now: drawn numbers → the picture reader, and a Songsterr print offers the real song from Songsterr.
- [ ] Stage 4: read DRAWN tab numbers ourselves (Songsterr / Guitar Pro prints): the glyph outlines are vectors, so match them
      to digit shapes (Roboto) on the string lines, and read the rhythm stems under the staff → exact tab, no AI.
- [ ] Pedal effects to rival the Pocket Master (owner 2026-11-12): amps = NAM captures of his Archetypes; cabs + reverbs =
      convolution with real impulse responses (his IR folder, Logic Space Designer / ChromaVerb and the Archetypes' own
      reverbs captured as IRs, free Valhalla Supermassive optional); delays, modulation (chorus, phaser, flanger, tremolo,
      vibrato, rotary), comp, gate, EQ, drive, octaver / harmonizer written in the native core from MIT-licensed DSP
      (Airwindows, Signalsmith DSP, NeuralAmpModelerCore, RTNeural). No GPL code in the app.
- [ ] **TOP PRIORITY after the sounds (owner 2026-11-12 16:54): our own tab-picture reader.** The AI reader got "You Are My
      Sunshine" (Fingerpicking Country, p.41–42) wrong: the first bar should be B-0 / low E-3 / D-0 (thumb on the low E,
      melody on the B), the app made 2s on G and 0s on high e: wrong strings AND wrong frets. Build: staff-line finder → digit
      blobs on lines (the line = the string, exact) → digit classifier trained on rendered printed digits (0–24, many book
      fonts) → rhythm from stems / the notation above → bar-length + playability checks → amber glow on unsure notes. AI only
      for text marks (H, P, sl., let ring). Same reader for Songsterr PDFs and tabs in videos. Owner's pages = first test
      (private, never committed).
      Test pages: the owner's book PDFs are on his Mac in ~/Downloads/"Guitar books for Claude to use" (31 PDFs, readable
      through the device bridge; stage only the pages needed, never commit them). Ground truth with no hand-checking:
      ~/Downloads/"Sheet Happens Plini Trilogy Tabs GPX PDF" has Guitar Pro files AND their printed PDFs (render the GP, compare
      note for note); also the Sultans Songsterr PDF and the GP files in ~/Downloads.
