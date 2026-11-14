# Riff Scanner plan (agreed by the owner, Claude and Gemini, 2026-11-13)

Sources: Gemini's "Riff Scanner 4-Phase Blueprint" PDF (owner upload) + its answers to Claude's 8 follow-up questions.
Measure everything: `veval` (Plini PDF vs GP), `bookcheck` (Tony Rice bar sums), `eval2` (pictures vs GP), the step2
browser video test (LCS vs the drawn tab). Report note precision / recall, rhythm-right, zero-error bars and the SILENT
error rate (wrong note without an amber ring).

## Definition of done (Gemini's targets)
| Source | Notes P / R | Rhythm | Zero-error bars | Silent errors |
|---|---|---|---|---|
| Vector PDF | ≥99.5 / ≥99.0 | ≥97 | ≥95 | <0.3% |
| Pictures | ≥98 / ≥97.5 | ≥92 (stems) / ≥82 (spacing) | ≥88 | <1% |
| Video with tab | ≥97.5 / ≥96.5 | ≥93 | ≥85 | <1.5% |
| Audio only | pitch F1 ≥88 solo / ≥80 mix | ≥80 | n/a | 0 unflagged (confidence shading) |

## Order
1. **Vector PDF** (src/scan/vectorTab.ts, stemRhythm.ts, notationRhythm.ts): grace notes = 0 metric weight (an ornament on
   the next note, Guitar Pro style); ties across bars / systems by matching tie curves to [prevCol.x, curCol.x] and a
   bar's deficit; SMuFL + drawn rest glyphs per voice; drawn tuning headers ("E♭ A♭ D♭ G♭ B♭ E♭", "Drop D") with ~12
   letter templates in the first system's margin.
2. **tab_crnn.onnx — row-pooled column-wise CRNN** for pictures and video frames (≤5 MB FP16):
   - input: the staff strip DEWARPED first (fit each string line as a cubic y_s(x) over ~16 slices; resample so string s
     sits on a fixed row Y_s = 42 + 15·s, s = 0..5, in an H = 160 strip; 0–42 headroom for chords/techniques, 120–160 for
     stems/beams/pick strokes); staff lines NOT erased; ±1.5 px line jitter in training.
   - backbone MobileNetV4-Conv-Small or ConvNeXt-Femto, horizontal stride 4; row pooling = static slices per string row
     + an upper lane + a lower lane; sequence encoder = 4-layer dilated depthwise-separable 1D TCN (dil 1,2,4,8, k5) or a
     small Transformer (all ops on Apple MPS; no GRU / CTC).
   - heads per step: event (blank / note column / barline / rest, Gaussian targets σ=1 + focal loss) + sub-step x offset
     (smooth-L1); ONE shared string head (27 classes: empty, frets 0–24, dead X) with a string-index embedding across 6
     slots (read slots 0..N-1 for 4/6 strings; owner has no 7-string, 2026-11-13); technique + pick head (h p / \ b ~ harmonic, down/up stroke); rhythm
     head (whole…32nd, dots 0–2, tuplet none/3/5/6/7, tie-to-previous, rest value). Direct per-step supervision at the
     known column x (no CTC); inference = 3-point peak pick + argmax.
   - training data: alphaTab in Node (alphaSkia, boundsLookup for exact columns) + our own parameterised canvas/Skia
     renderer (40+ fonts, spacing 4–28 px, line width 0.5–2.5, halos, stems/beams/tuplets/pick strokes) + REAL pages
     auto-labelled by the vector reader. Corruptions: video overlay compositing, low-res + H.264/WebP/JPEG ringing,
     playheads / highlight boxes / balls over 15% of columns, perspective, page curl, light gradients, blur, noise.
   - train on the owner's Mac (PyTorch MPS, fp16/bf16): smoke test 25k strips × 20 epochs (OneCycle, max LR 1.5e-3,
     batch 32), then 100k strips (or 40k + on-the-fly corruptions) × 35–40 epochs.
   - HOLDOUT (never trained on): 3 whole Plini songs + the last 30 Tony Rice tab pages. Report zero-shot transfer
     (synthetic + Tony Rice train → Plini holdout) and production (all train → both holdouts).
   - amber ring: string-head top-1 < 0.82 or top-1/top-2 margin < 0.35; stem duration vs Δx conflict > 2.5×; a bar that
     can't be repaired to its time signature. NO "classic and model must agree" gate.
   - rhythm arbitration: constrained Viterbi per bar, cost −log P_rhythm(d) + λ|log(Δx / (ĝ·d^0.65))|, Σd = bar length.
3. **Audio spine**: keep 4-stem htdemucs_fwd (its "other" beats 6-stem "guitar"); helper for "other" and mix − other
   (backing without the guitar); onsets cross-checked against the raw mix's spectral flux; toTab: score each beat as
   16th (4 slots) vs triplet/sextuplet (3/6) and allow 32nd grace slots; keep every note; slides/bends/vibrato/h/p from
   pitch contours (Basic Pitch contours) vs onset flux.
4. **Video**: 3–4 fps sampling of the tab box; classify each stretch as a static card with a moving playhead (temporal
   median / 25th-75th percentile erases it) or smooth scroll (track bar lines + columns as landmarks, mask a ±6 px band
   round the playhead found by frame differencing, accumulate per-column log-probabilities across frames);
   audio–visual fusion: playhead x(t) → each column's time (snap to Beat This!) or chroma DTW when no playhead;
   log P_fused(s,f) = log P_visual + γ log P_audio(midi(s,f)) settles 0/9, 6/8, 1/7, 3/8, 5/6.

## Progress
- 2026-11-13 Step 1 (vector PDF) done. Plini vs Guitar Pro, per song: notes precision 99.0–100%, recall 98.7–100%,
  rhythm 97.4–100% (was 82–98%); Tony Rice bars adding up 98.2% (was 97.5%); tuning from the page = the GP tuning for all
  10 songs (per guitar group, flats drawn as images read as ♭). Fixed: held stems with no number, grace notes (0 weight,
  a 32nd from the step before, rakes share it, bar-opening graces borrow from the bar before), bracket tuplets, 16th flag
  hooks above the bottom line, pages of half notes, tied heads under triplet brackets, natural harmonics <7>, ghost notes
  (N) vs tie ends (N). Left: GP on-beat vs before-beat graces (can't be told from print), tiny slide graces, a few chords.
- 2026-11-13 Step 2 (tab_crnn) training on the owner's MacBook Air: `~/KGuitar-harvest/scanner` (kit = tools/scanner-train +
  private strips), `runs/v2` (arch dense, 3.24 M params, ~0.55 steps/s, 24k steps, best.pt saved every 2000). Depthwise convs
  were 2× slower on MPS (bench.py). Owner OK'd the model in the public repo (public/models/tab-crnn/tab_crnn.onnx, ~6.5 MB fp16).
  Scoreboard `npm run bench:scanner` (SCANNER_DATA = private folder) + video bench (tools/scanner-bench/make-video.py,
  tests/browser/video-bench.cjs with `npx vite --port 5179`). Step-4000/8000 model, held-back pages:
  clean picture 99.3–99.9% notes right / 98.6–99.7% found (number matcher 86–94%), photo-quality 87–92% (matcher 11–30%);
  video, lesson-style thin strip at the bottom of 720p: 9 px gap 99.4% / 95%, 7 px 90% / 95%, 6 px 84% / 88%, still cards with a
  playhead 97.5% / 97.5% (lengths 97%). Video fixes: crop keeps the rhythm under the staff, playhead left out of scroll tracking,
  per-pixel median over frames, long strips read in windows, white tab in a dark frame found, repeats at the end dropped, look-alike
  page turns kept apart. Open: note lengths on scrolling video (56–74%: triplets vs 8ths in the tuplet head, missed bar lines),
  dead notes x read as 0 at small sizes, the owner's real screen recordings (Billy Strings Short first), audio as referee.
- 2026-11-14 The owner's 3 real phone recordings (1080×1432, YouTube app), checked note by note against the frames:
  LevelUp Short (page flips, the end of each page shown again at the start of the next): 93/93 notes right after the fix;
  James_Guitar "Blue" (small see-through white box, string names): every clear page exact, one note lost under YouTube's
  "Live" badge; Songsterr page view (Tears in Heaven, scrolling up): notes right except Songsterr's heavy quarter rests read as 0.
  Fixes: string-name letters at a staff's start dropped (crnnRead); a top line crowded with 2-digit numbers still counts as a
  line (image.ts: run OR 0.85 × all line pixels); pages that move on in jumps join into one strip (pictures.ts pageOverlap /
  overlapScore: ink-vs-paper 2D match on the staff at half size, 0.93+ same stretch vs ≤0.7 a new page of the same riff; weak
  column-profile shifts are checked the same way); a box's blank margin never paints over notes (Stitcher layers keep a
  "staffed columns" mask); page view scrolling up (mergePages: a picture's first lines = the last picture's last lines are
  read once, the look most others agree with wins). Synth: string names (15%) and heavy music-font rests (55% of rests) →
  retrain v4 on the Mac (`retrain-v4.sh`, from v2/best.pt).
- 2026-11-14 9 more real recordings (owner's phone, sent at ~520 px wide: smaller than the screen; the app grabs full size).
  Right after fixes: LevelUp 93/93; Blue all pages incl. the note under the "Live" badge (same-page frames now stack);
  Songsterr page view right except one phantom chord on the first line; Amazing Grace 19/19; jazz Dm Short 42 notes, one
  grace missed; landscape lessons (tab strip at the bottom, white on black and light Songsterr-style) read right;
  Brown Eyed Girl (see-through box, guitarist moving behind) now one strip, tie-end "(12)" parens read as notes.
  Still wrong (→ synth v5 on the Mac): ¼/½/full bend labels read as top-string notes, Everlong's big bold touching "11 over 9"
  misread as 10/12/13/14 and its 6/X/4 muted chords missed, a few phantoms from video showing through. Billy Strings Short
  (97a93475): at 510 px the B and D lines vanished in the copy sent; nothing found. Fixes: thick lines (d = 2 or 4, rows
  ≤4 px merged), same page by staff height + numbers, page overlap on ink darker than its surroundings, dropLoop.
- 2026-11-14 Audio referee on real recordings: none of the owner's videos has a playhead playheadX can see (coloured lines,
  highlight boxes, none), so it never ran. Now the Stitcher also keeps `views` (each frame's place on the strip and its
  time); hear.ts viewTimeline (a still page is swept left to right while shown; a scroll passes a playhead at fraction p)
  + tuneTiming (p, a −1.2…+1.2 s delay and the tuning: standard / drop D / ½ and 1 step down, chosen by how much better the
  sure notes sound at their own times than shuffled among them; trusted at gain ≥ 0.15 and score ≥ 0.4) + heardAround
  (±0.24 s). On the real videos the timing is found on 5 of 6 (scores 0.48–0.93) and standard tuning picked every time,
  but no note changed: the reader is already sure of nearly every number, and the wrong ones are confidently wrong (bend
  labels, Everlong). A veto of notes not heard (< 0.1) would drop as many real notes as phantoms: not done.
