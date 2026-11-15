# Engine week (owner 2026-11-14 evening; he keeps test-52 for the week)
Order: 1 shared clock + app speed → 2 shared listener → 3 automatic timing calibration → 4 sampler (sound engine part 1).
Owner recordings for the test bench come next week (imperfect playing is wanted).

Safeguards the owner asked for (Gemini review, agreed):
1. Calibration per gear profile (phone mic / Pocket Master USB / wireless), saved separately, applied automatically when the
   pedal is plugged or unplugged. Acoustic loopback (speaker → mic) only works on the phone mic route; on the pedal route the
   click goes to headphones/Spark NEO, so use a play-along check there (strum on 8 clicks, median offset = the whole round trip
   the judging needs), with a clear prompt; never fail silently (no spike within ~500 ms → say so and offer the play-along).
2. Bleed suppression: the shared listener knows every note/hit KGuitar scheduled (shared clock) + the calibrated delay, and
   down-weights those pitches at scheduledTime + latency (acoustic practice without headphones).
3. Per-consumer listener configs (strictOctave, allowSinging, rollingClipSeconds, …) isolated: one screen's setting never leaks.
4. Sampler legato on the existing banks: hammer-on/pull-off = destination sample started ~35 ms past its pick transient with a
   short crossfade from the ringing string (inheriting its decay); slides = smooth playbackRate/detune ramps.
