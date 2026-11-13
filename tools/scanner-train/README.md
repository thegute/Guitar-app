# Scanner training kit (tab_crnn)

The picture reader for photos, scans and video frames of tab. See notes/RIFF-SCANNER-PLAN.md step 2.

- `synth.py`: made-up tab strips (random frets and rhythms; every font on the computer). `python3 synth.py preview/` draws 8.
- `realstrips.ts` + `crop.py`: real book pages labelled by the PDF shape reader, cut into the reader's frame. The pages are
  the owner's books: the strips stay on his Mac and in the scratchpad, NEVER in this repo.
- `model.py` (1.35 M parameters), `data.py`, `train.py` (`--smoke` checks it on the CPU), `export.py` → `tab_crnn.onnx`.
- Holdout (never trained on): Plini Selenium Forest, Opening, Wombat; Tony Rice tab pages 83–113.
- On the Mac: `~/KGuitar-harvest/train` venv (torch, numpy, pillow, onnx); kit copied to `~/KGuitar-harvest/scanner`;
  `bash run-mac.sh 20000`.
