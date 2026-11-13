#!/bin/bash
# Train the picture reader on the Mac (keeps the Mac awake while it runs). Usage: bash run-mac.sh [steps]
cd "$(dirname "$0")"
STEPS=${1:-20000}
caffeinate -i ~/KGuitar-harvest/train/bin/python train.py --strips strips/train --holdout strips/holdout --out runs/v1 \
  --steps "$STEPS" --batch 32 --workers 6 --eval 1000 2>&1 | grep -v Warning
