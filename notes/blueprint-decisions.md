# Master blueprint: decisions so far (discussion only; NO code until the owner says "Approved — Start Step 1")

Received 2026-11-06 as an attachment cut off at ~20,000 characters, mid Step 2 §3 Game Mode ("accompanied by a **bouncin").
The rest arrived the same day. Full text: notes/blueprint-part1.txt (to the cut) + notes/blueprint-part2.txt (from Game Mode §3 on).

Owner's answers (2026-11-06):
- Tunings: baritone uke stays D-G-B-E ("low-G G-C-E-A" = the tenor low-G that exists). No guitalele.
- "Where your fingers go" box floats anywhere (the one exception to the reorder-style windows).
- Styles: loves Tim Henson, Plini, Ichika Nito, Syncatto; wants Ichika much more in the app. Proposed (awaiting OK): drop only the
  heavy low chug "djent"; split math rock/djent into Melodic Prog (Plini), Prog-Pop (Tim Henson), Ambient Math (Ichika),
  Rudiment Picking (Syncatto: selective picking from drum rudiments, muted arpeggios, left-hand tapping, drop C, nylon/clean with bite).
- Riff Scanner Scan = A + B combined: Gemini watches the video link first (public videos; ~8 h video/day free) → if it can't,
  Android screen grab of KGuitar's own screen + sound for chosen seconds (permission each time) → if that fails, play it out loud (mic + Basic Pitch).
- Shorts source = C with fallback: YouTube Data API key search (~100 searches/day) → if no key / quota out / error, followed-channels feed; mixed.
- AI waiting = A: first good answer wins, quick jobs 5 s; big scans keep loading with progress steps (as long as needed) + Cancel.
- Tempo = A (GP exact, Gemini estimate, own beat detection for mic/loops/files, guess for pasted tabs) + tap tempo backup when it fails.

Concept-check answers (2026-11-06, after the full text):
- Bass octave on Track 3: applied on playback (perfect timing), no live monitoring.
- Looper with the screen off: not now; keep the screen on while the looper runs.
- The new 4-track looper REPLACES the Jam looper and the beat maker looper; old test loops don't need moving over.
- Game Mode: high e on top (like tab).
- No body-slap percussion mode (Track 1 is plain rhythm).
- Style names: generic descriptive names everywhere, never "<artist> style" (done 2026-11-06 for every existing style;
  players stay only in "Listen to" lines, video teacher credits and search keywords). New styles planned for Step 3:
  Melodic prog, Prog-pop (tapping and hybrid picking), Ambient tapping (the Ichika sound, much more of it), Rudiment picking;
  heavy low chug and the words "djent"/"math rock" go.
- Proxy Stream dropped (screen grab covers it); offline mode = built-in generators instead of mock data.
- Screen on while looping: the owner handles it himself (no WakeLock work needed for the looper).
- YouTube Data API key: he'll get one himself (Gemini walking him through it); KGuitar needs a place to paste it (Step 2), kept on the phone only like the AI keys.
- He's going with my recommendations (checkpoints per piece, reuse existing parts, track roles as defaults, built-in offline fallbacks,
  no Proxy Stream, original pieces in the acoustic songwriter style, architecture file at the end).
Approved 2026-11-06 ("okay you start the build"); the owner tries everything once all three steps are done; checkpoints per piece
(backup branch backup-before-blueprint = the state before any blueprint code).
Step 1 answers: hand size medium; the floating box replaces the readout's hand diagram.
Steps 2 and 3 are broken into substeps (2a–2g, 3a–3j) like Step 1. Owner went with my picks:
- Riff Scanner lives in Jam (replaces Find chords; shortcut from Songs → Add a song), three big buttons: Scan a video / Shorts / Listen.
- Game Mode is a view inside Play (Tab · Stand · Game), not its own screen.
- The 4-track looper has its own Jam page and a slim bar on Play, Scales and the beat maker.
- Scans that were heard (not read from the screen) ask "Does this look right?" before saving.
- Guitar separation (stem model): off for now, maybe later.
- Scan chain: 1 Gemini watches the link → 2 KGuitar screen grab (on-screen tab) + inside-the-phone sound (AudioPlaybackCapture) →
  3 the owner's Samsung screen recording (media sounds) picked as a file (Riff Scanner explains how when 2 fails) →
  4 the mic only when he taps "Play it out loud". On-screen tab gives notes/frets, sound gives timing/tempo.
- Chocolate MIDI (1g) comes before the looper pedal profile (3d).
