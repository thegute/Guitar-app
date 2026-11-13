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
