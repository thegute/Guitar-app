# KGuitar master checklist (2026-11-11): EVERY item, one place
Built line by line from the owner's "KGuitar Master Game Plan & Implementation Roadmap" PDF (notes/master-roadmap-2026-11-11.pdf,
made with Gemini, all 12 pages) + notes/MASTER-PLAN.md + the owner's later additions. Agreed order: Stage 1 → 2 → AI teacher →
4 → 3 → 5 → 6 → 7 (owner 2026-11-11; the PDF had 3 before 4). Theory course runs alongside (owner: "now, then the book pack").
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
