# Riff Scanner lab (runs on the owner's Mac)

The scanner learns from YouTube Shorts by itself, checking its own reading against the video's sound.

- `install.sh`: one-time setup in `~/KGuitar Folder/KGuitar-harvest/lab`. It needs:
  - the app clone (`gemini-week`), its node_modules and Playwright Chromium;
  - Node 22 if the Mac has no Node ≥ 20;
  - yt-dlp and imageio-ffmpeg in the training venv;
  - a launchd job, `app.kguitar.scanlab`, that runs `nightly.sh` at 2:30.
- `nightly.sh` (written by install) updates the app clone, then runs `run-lab.sh` with the Mac kept awake.
- `run-lab.sh` does one night's work:
  1. **Fetch.** `fetch.py` downloads new Mr. Tabs / Level Up Shorts. Personal practice use only; nothing is shared.
  2. **Scan.** `scan-lab.cjs` scans each video with the app's own code.
  3. **Collect.** Checked strips go to `scanner/strips/lab` (labels.jsonl in the trainer's format). The first 10 videos are a fixed exam and are never collected.
  4. **Retrain.** Every 400 new strips it fine-tunes from `lab/current.pt`, using the book pages plus the lab strips. It keeps the new reader only if:
     - its held-back book-page score is no worse (within 0.2), and
     - its exam agreement is at least 0.5 points better.
     A kept reader is written to `lab/for-the-app/`; Claude copies it into `public/models/tab-crnn/`.
- `scan-lab.cjs <video> <out> [model.onnx]` scans one video:
  - Every note column is checked against the sound.
  - The playhead offset is found per video.
  - The sound check uses a plain 16384-sample look, so semitones of low notes stay apart.
  - Alternatives that are really other notes sounding (the same chord, the notes either side) don't count as doubt.
  - A piece is saved as training data only when every note column is confirmed, or is corrected beyond doubt by the sound.
  - `summary.json` gives agreement, the corrected count and hard cases.
  - When `<video>.truth.json` exists it also scores the reading against the right answer.
- `fakeshort.py <out.mp4> [seed] [page|overlay]` makes test Shorts with a known answer:
  - `page` is a Mr. Tabs-style page;
  - `overlay` is a Level Up-style see-through white tab over a moving player and guitar neck.
- Data stays on the Mac. The lab strips come from YouTube videos and the book strips from the owner's books. Neither ever goes in this repo.
