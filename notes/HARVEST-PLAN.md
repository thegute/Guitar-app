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
