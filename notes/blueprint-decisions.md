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
Still waiting for: "Approved — Start Step 1".
