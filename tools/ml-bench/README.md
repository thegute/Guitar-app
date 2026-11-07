# Bench for the on-phone music models (Riff Scanner)

Models (downloaded on first use in the app, never kept in the repo): Riley et al. GAPS guitar CRNN and Beat This!,
ONNX conversions from huggingface.co/baroned/musicnote-ondevice-models (see src/ml/models.ts for the pinned files).

1. Download the models into a folder (KG_MODELS) and `npm i --ignore-scripts onnxruntime-node@1.22.0` in another (ORT_NODE).
2. `python3 make.py` and `python3 make_rhythm.py` build test pieces from KGuitar's recorded sample banks (known notes and beats).
3. `python3 eval2.py 0.3 8` scores the guitar model against Basic Pitch; `dump_notes.py 0.3 8` and `bt_ref.py` write the Python
   reference results (official Kong post-processing, official Beat This! preprocessing/chunking/post-processing).
4. `npm run bench:ml` runs KGuitar's TypeScript pipeline and checks it matches the Python reference and the right answers.

Results 2026-11-06: guitar notes 96.4% right (Basic Pitch 87.2%) on 18 pieces; TypeScript = Python 99.9%. Beat This!: tempo and
beats per bar right on 10/10 songs (3/4 and 4/4, with and without drums, swing); TypeScript = Python 100%.
Speed: guitar model 2.0 s per 10 s chunk natively on one core here, 8.8 s in WebAssembly on one core.
