#!/bin/bash
# KGuitar harvest, step 0 on the owner's Mac: a private Python environment with the tools that host his plugins
# offline (Spotify's pedalboard: VST3 + Audio Units; mido for MIDI; soundfile for FLAC; numpy/scipy for trimming and
# loudness). Installs into ~/KGuitar-harvest/.venv only: nothing system-wide, nothing removed.
# Usage: bash tools/harvest/setup.sh
set -euo pipefail
ROOT="$HOME/KGuitar-harvest"
mkdir -p "$ROOT"
cd "$ROOT"
if ! command -v python3 >/dev/null; then
  echo "python3 is missing. macOS asks to install the Command Line Tools: say yes, then run this again."
  xcode-select --install || true
  exit 1
fi
python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip >/dev/null
pip install "pedalboard>=0.9" mido numpy scipy soundfile
python - <<'EOF'
import pedalboard, mido, numpy, scipy, soundfile
print("ready: pedalboard", pedalboard.__version__)
EOF
echo "Harvest tools installed in $ROOT/.venv"
