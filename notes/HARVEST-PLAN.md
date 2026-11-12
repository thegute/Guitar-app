# Harvest plan: real instruments for every sound in KGuitar (A1 result, 2026-11-12)

What the owner has on his Mac, role by role, and what KGuitar will use. Rendered packs are PRIVATE (his phone,
~/KGuitar-harvest on the Mac); nothing rendered goes in this repo. Nothing is rendered before he approves.

## Picks
| Role in the app | Pick | Why | Also have, not picked |
|---|---|---|---|
| Acoustic, single notes / leads / bluegrass / tabs | Orange Tree **Evolution Flatpick 6** | 4 round robins, 3 dynamics; sustain, harmonics, palm mute, mutes, tapped, body hits, string slaps; real hammer-on / pull-off / slide recordings (makes tab techniques sound real); pick-position model | Ample Martin Lite II (free "lite": fewer recordings) |
| Acoustic, strumming (Strum Machine, Jam, chord sheets) | **Ample SJ-200** (AGSJ) | jumbo Gibson (same family as his J-45), body + neck + AB stereo mics = a wide, real strum; its strummer for whole recorded strums | Flatpick 6 (narrower), Logic steel-string (small, dated) |
| Acoustic, fingerstyle | ear test: SJ-200 vs Flatpick 6 vs Martin Lite II | depends on whether each was sampled with fingers or a pick: decide by listening | |
| Electric DI, clean / funk / blues / reggae / crunch | Orange Tree **Evolution Stratosphere** | Strat single coils, 5 pickup positions, 144 recordings per note, 4 RR, 3 dynamics, legato, squeals, chugs | Logic Vintage Strat (small) |
| Electric DI, metal / djent / prog / drop tunings | Orange Tree **Evolution Dracus** | 8-string metal guitar, pickup blend, chugs, half/full palm mutes, squeals: covers every drop tuning | |
| Amps + cabs (re-amping the DI) | **Neural DSP Archetypes**: Petrucci X (prog metal lead/rhythm), Nolly X / Misha Mansoor X (djent), John Mayer X (clean, edge of breakup, blues), Cory Wong X (funk, reggae skank), Mateus Asato (glassy clean, neo-soul), Tim Henson X / Rabea X (extra) | the best amp models he owns; their own matched cabs | Fortin Nameless (metal, A/B vs Petrucci), 5150 NAM captures (A/B for metal), Guitar Rig 7, Black Box .am2 (pedal-only format) |
| Bass | Logic **Studio Bass**: Session/Classic (rock, pop, country), Sixties (reggae, dub, Motown), Modern (prog/metal, pick), American Upright (bluegrass, jazz walking) | 6 deeply sampled basses with articulations, best bass he owns | Logic muted/soul bass (small), Bass Music Essentials (EDM synth bass) |
| Drums | Logic **Drum Kit Designer** (3.7 GB, multi-mic producer kits): a kit per style incl. brushes; Logic percussion (shaker, tambourine, congas…) for reggae / bossa / latin | far deeper than the current AVL kits | Kontakt Acoustic Drums Library (173 MB) |
| Piano | Logic **Studio Piano** (3.2 GB) | best piano he owns | Logic Steinway / Grand (single samples) |
| Organ (reggae bubble), electric piano | Logic Vintage B3 / Vintage Electric Piano (rendered) | reggae needs the organ bubble; EP for soul / lo-fi | |
| Pads, textures, chord beds | NI **Playbox** (+ Analog Dreams / Ethereal Earth / Hypha) | made for chord pads: 8 chords per set = 8 beat-maker pads; chords import from MIDI, global key = render all 12 keys | Massive X, Alchemy |
| Rooms, plate, spring | Logic **Space Designer measured IRs** (rooms, plates, springs) + York Audio DXVB (Fender Deluxe spring) | real spaces beat the generated IRs; spring for clean / surf / reggae dub | Raum (time-varying, can't be captured as an IR) |
| Cabs for live NAM (step C) | York MES 412 OS-V2 (metal), OwnHammer Imperial (cleans, jazz), Tone Factor '66 Deluxe / Two Rock / Creamback 2x12, ML Sound Lab "best IR" | measured, professional cab IRs | GGD Studio Cabs (A/B for metal) |
| Live amps on the phone (step C) | NAM captures of the chosen Archetype presets (TONE3000 sweep + input.wav are already in Downloads) | the phone runs his own favourite amps live | 5150 Mirror Profiles NAMs |
| Ear training extras (optional) | Jacob Collier Audience Choir ("sing" the degree), Playbox drone | variety | |
| Not for KGuitar's sound | NA Acoustic Voice Pro (preamp for a piezo pickup), PastToFuture / acoustic IRs (pickup→acoustic converters: a later "make the pedal sound acoustic" idea), Mantra / Vocal suite / Humanoid (vocal processing), MIDI Guitar 3, Ozone, Replika, Supercharger, Orbital Looper, Scaler (incomplete download) | | |

## How it is rendered (quality rules)
- 48 kHz / 24-bit FLAC masters kept on the Mac (~/KGuitar-harvest/packs); the phone gets Opus 192 kbps (transparent) to keep packs small.
- Every fret on every string (0–15, + higher on the top strings), every dynamic and round robin the library really has (no fake extra layers).
- Tails rendered to −60 dB then trimmed; onsets aligned (2 ms pre-roll) so timing is tight; release noises kept as their own recordings.
- Legato: hammer-on / pull-off / slide recordings sliced from the moment of the transition (the library's string is monophonic, so after that point only the new note sounds).
- Whole recorded strums (SJ-200 strummer and Orange Tree strum engine) for the most common chord shapes, down / up × 3 dynamics × round robins; any other chord is built by the strum engine from single notes.
- Distorted chords: DI notes are summed with the strum engine's timing (a pickup really does add the strings linearly), THEN re-amped through the Archetype, so every power chord / triad distorts like a real chord.
- Loudness: one K-weighted gain per pack (dynamics between layers untouched).
- Logic instruments: one MIDI file per instrument / articulation with every note spaced out, bounced in Logic, sliced by the tool at the known times.

## Order (each step feeds the next)
1. Setup + trial renders (a few notes from each candidate) → blind A/B page on the Mac → owner picks by ear.
2. Acoustic notes + articulations + legato (Flatpick 6, then SJ-200) → real strums.
3. Electric DI (Stratosphere, Dracus) → re-amped tones (Archetypes) + DI-summed chord takes.
4. Bass (Studio Bass), 5. Drums (Drum Kit Designer + percussion), 6. Keys (Studio Piano, B3, EP), 7. Playbox chord beds,
8. Spaces (Logic IRs, York spring) replace the generated room / plate, 9. NAM captures of the chosen Archetype presets (feeds step C).

## Playbox, all of it (owner 2026-11-12: "also do its chord generation and arpeggio thing … integrate more of its technology")
What Playbox is, from the manual and its library files: 320+ presets = a Chord Set (8 chords × up to 6 notes, 224 sets,
each with a name, key, major/minor and mood category) + a Sample Set (a DIFFERENT sound on each note of the chord, ~900
samples: synths, world instruments, basses, voices, noises) + an FX Set (motion: Arp / Strum / Grain; 16 audio FX; LFOs,
Modstep step-modulator, envelopes, Humanize; XY pad, macros, Half-time). Workflow: dice to randomise any part, locks to
keep what you like, Shuffle chord order.
Readable on the Mac (no rendering needed): the chord sets are plain number lists in `Library Data/Chords/*.nka` with
`Chords_NAMES / KEYS / MODES / CATEGORY.nka`; FX sets and Arp/Strum/Grain/Modstep presets are parameter lists. The
samples live inside Kontakt's container, so sounds must be rendered through Kontakt. All of it is PRIVATE data (a pack).

Integration plan:
1. Chord sets → "Inspire me" (Jam + beat maker): pick a mood, get a Playbox chord set moved to your key; every chord named
   with its Roman numeral, turned into a guitar shape you can play (voicing.ts), dice / lock / shuffle like Playbox.
   Feeds Make a tab, the looper bed, Game Mode swell and the theory course ("why does this sound dreamy?").
2. Motion engine in KGuitar's own code (works on every sound: guitar packs, piano, pads): Arp (pattern, synced rate,
   length, swing, octaves, strike repeats), Strum patterns (zig-zag up-down, move in / out, triplets, fast up), Grain
   (stutter, clouds, fake arp), Modstep (rhythmic gating / ducking), Humanize, Half-time, XY pad. Pattern ideas from
   Playbox's preset names and parameters; the code is ours.
3. Guitar tie-in: any arp/strum pattern on any chord set → a tab you can practise (picking.ts / Make a tab), and the
   strum patterns feed the Strum Machine.
4. Sounds: ~30 curated presets rendered note by note PER SLOT (each chord note keeps its own sound, Playbox's signature),
   so KGuitar's motion engine plays them on any chord at any tempo; plus a few presets' own motion baked at reference
   tempos and time-stretched (Signalsmith) for the exact Playbox feel. Rendering uses KGuitar-written user Sound / Chord
   presets (same text format) loaded in Playbox, driven on the Mac's screen.
5. FX worth adding to studio/fx.ts: Lofi (crush, degrade, ambience bed), Choral (70s chorus), Tape, Modstep ducker.
6. "Playbox your own sound": a sample you record (voice, a guitar note, a noise) spread across a chord's notes with the
   pitch shifter, like Playbox's user slots (beat maker → Get a sound).

## Second pass (2026-11-12, owner: "go over it again with a fine tooth comb")
Changes:
- Mono-safe packs: the pedal rig folds everything to mono, and spaced stereo mics (Ample AB pair, piano) comb-filter in
  mono. Render a close-mic stem + a stereo stem; stereo setups blend both, the pedal rig plays mostly the close one.
  sound-report checks every pack folded to mono.
- No reverb / delay / doubler baked into any note (Archetype FX off, Flatpick "enhanced" only if it has no reverb,
  Ample reverb off): a new note on a string cuts the old one, which would chop a baked tail. Spaces stay live (console).
- DI level calibrated to a real pickup's level before re-amping, or the amps distort the wrong amount.
- Each recording's pitch measured; only clear intonation errors (> 5 cents) corrected, natural variation kept.
- Alternate tunings: open strings rendered in Drop D, D standard, Eb standard, open G (slack key), DADGAD — a pitched-down
  open string doesn't sound like a real one.
- Stratosphere: render 3–4 pickup positions (neck, 4 = neck+middle, 2 = bridge+middle, bridge), not one.
- Packs stay in a phone folder read in place (like the video lessons: LessonFoldersPlugin + byte-range server) instead
  of being copied into IndexedDB: no doubled storage, instant import.
- Listening test in music, not single notes: the same tab phrase / strum through the real KGuitar engine per candidate.
- Sustained sounds (organ, pads, strings) get crossfade loop points; piano gets its release (damper) recordings.
Left out before:
- Muted strum "chucks" (Strum Machine), fret / slide / pick noises, harmonics at 5/7/12, body percussion for the
  percussive fingerstyle style.
- Logic Studio Horns (reggae / ska / Motown / country Jam), Studio Strings, Vintage Clav (funk / reggae), and Logic's
  percussion (shaker, tambourine, congas, bongos, cajon, cowbell, claves, timbales, guiro-type) for Jam styles.
- A table of which pack every sound in the app uses (Hear it, tap a note, chord peek, tuner reference, Chords / Scales
  tools, quizzes and ear training, course "hear" blocks, Jam, beat maker, looper, Game band, songbook band, metronome,
  Strum Machine, rhythm / bend trainers) and Guitar Pro GM programs (piano, organ, strings, brass, sax…).
New ideas:
- Logic Drummer → real drummer performances (feel, ghost notes, fills) exported as MIDI grooves for Jam / beat maker /
  Game band; Logic Session Players (Bass / Keyboard Player, if his Logic is 11+) → human basslines and comping as data.
- Apple Loops (2.6 GB) as a private loop library for the beat maker and looper.
- TONE3000 plugin: thousands of community NAM amp captures for live amps, not only Archetype captures.
- Capture his Pocket Master's amp tones (if it can re-amp over USB) so "Hear it" matches what he hears from his pedal.
- Optional later: "sample your own guitar" wizard (his own J-45, note by note).
Gaps nothing on the Mac covers well: nylon / classical (Logic's is basic), ukulele + baritone, banjo, mandolin, lap /
pedal steel (Hawaiian), jazz archtop, a humbucker (Les Paul) guitar for classic rock / blues.

## Owner's answers (2026-11-12 07:58)
- Buying tonight: Orange Tree **Evolution Modern Nylon** 1.3.5 (→ nylon / classical / bossa / Romanza role) and
  **Ample Guitar M** 4.1 (full Martin D-41 → candidate for fingerstyle and strumming, replaces Martin Lite II).
- Humbucker role (classic rock / blues): his Stratosphere's humbucker setting (confirm in the trial; Orange Tree's manual
  doesn't list it, so check its Pickup control). The Evolution engine's "Alternate Tuning" renders real drop / open
  tunings, and its Strum section + Multitracking + release / legato controls are all usable for the harvest.
- Still open: ukulele + baritone, banjo, mandolin, lap / pedal steel, jazz archtop.
- Also downloading NI **Session Guitarist – Strummed Acoustic 2** 1.1: 163 strumming patterns PLAYED by session players to
  drums (not built from single notes) on a 1934 Martin 0-17 and a Guild F-412 12-string, 2 mics each, plus arpeggios,
  power chords and separate bass patterns, 34 song presets. Use: the Strum Machine's sound.
  Harvest: (1) for each chord (12 roots × the chord types the app uses), record a few dense patterns (eighths and
  sixteenths, down / up / muted) and slice them into single real strokes labelled down / up / accent / mute, so KGuitar's
  Strum Machine plays real strokes in ANY pattern at any tempo; (2) the ~20 most useful patterns recorded whole at a few
  tempos for the exact groove. The 12-string becomes a new KGuitar sound (folk / rock jangle).
- Ukulele / baritone from Modern Nylon (owner asked 08:01): baritone uke = guitar's top 4 strings (D G B E) → near exact.
  Ukulele (G C E A) = those strings 5 frets up (no capo needed: fretted notes); the high re-entrant G4 comes from the G
  string at fret 12 (unwound nylon, like a uke string), low-G tuning from the D string at fret 5. Then an offline "uke
  body" pass (less low end, shorter decay) for a ukulele variant pack. A stand-in until a real ukulele library.

## Where the harvest stands (2026-11-12 08:35, owner near his usage limit)
- Mac: ~/KGuitar-harvest/.venv has pedalboard 0.9.17; tools in ~/KGuitar-harvest/tools (setup.sh, agent.py, render.py,
  capture_state.py, trials.py's jobs, playbox_chords.py). Agent: `~/KGuitar-harvest/.venv/bin/python ~/KGuitar-harvest/tools/agent.py`
  (job files → jobs/inbox, results → jobs/outbox, log jobs/agent.log; `touch jobs/close` closes a capture window).
- Probes OK: Kontakt 8 VST3 (no automatable params until a state is set), AGSJ VST3 (120 params: m_mic_1/2/3_vol = body /
  neck / AB, fx_bypassed, m_doubling_tog, play_mode, sound_mode, str_N_tuner, capo…), Archetype John Mayer X (173 params:
  every pedal / amp / cab / reverb settable by name). AGML2 (Martin Lite AU) won't load in pedalboard: skip (Ample M coming).
- AGSJ trial renders came out SILENT: Ample doesn't know its library path (SJ library still in Downloads/VST/…/Library;
  no AGSJ plist in ~/Library/Application Support/Ample Sound). The capture window (python process) did NOT appear on
  his screen. Next: set the library path with Ample's own standalone host (ASHost, com.amplesound.ASHost: computer use can
  drive it) or have him open AGSJ once in Logic; then re-run trials 210–212. Kontakt: Orange Tree .nki must be loaded in
  the plug-in window (drag the .nki in), reverb off, then save state — needs a visible plug-in window (try a Logic project,
  or check why pedalboard's show_editor window doesn't show: maybe it opened behind / off-space).
- Ample SJ: String keyswitches G0–C1 = strings 6→1 (check octave naming), C0 sustain, C#0 harmonic, D0 palm mute,
  D#0 slide in/out, E0 legato slide, F0 hammer/pull; velocity 127 = pop.
