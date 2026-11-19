"""KGuitar Kontakt 8 one-at-a-time capture, live audio verifier, and headless renderer + Studio/Pocket exporter.

Usage:
  # 1. Capture and verify a single library (opens Finder to the .nki + Kontakt 8 window, then verifies audio_peak > 0):
  ~/KGuitar-harvest/.venv/bin/python3 tools/harvest/kontakt_wizard.py capture sunburst-deluxe
  ~/KGuitar-harvest/.venv/bin/python3 tools/harvest/kontakt_wizard.py capture picked-acoustic
  ~/KGuitar-harvest/.venv/bin/python3 tools/harvest/kontakt_wizard.py capture picked-nylon
  ~/KGuitar-harvest/.venv/bin/python3 tools/harvest/kontakt_wizard.py capture strummed-12
  ~/KGuitar-harvest/.venv/bin/python3 tools/harvest/kontakt_wizard.py capture jambass
  ~/KGuitar-harvest/.venv/bin/python3 tools/harvest/kontakt_wizard.py capture dracus

  # 2. Verify an already-saved .state file without opening any GUI window:
  ~/KGuitar-harvest/.venv/bin/python3 tools/harvest/kontakt_wizard.py verify dracus

  # 3. Headlessly render + export Studio (.kgpack) & Pocket (-pocket.kgpack) bundles (with watchdog auto-resume):
  ~/KGuitar-harvest/.venv/bin/python3 tools/harvest/kontakt_wizard.py render dracus
  ~/KGuitar-harvest/.venv/bin/python3 tools/harvest/kontakt_wizard.py render-all
"""
import argparse
import os
import subprocess
import sys
import threading
import time

from mido import Message
from pedalboard import load_plugin

HOME = os.path.expanduser('~')
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HARVEST = os.path.join(HOME, 'KGuitar-harvest')
STATES = os.path.join(HARVEST, 'states')
PACKS = os.path.join(HARVEST, 'packs')
PHONE = os.path.join(HARVEST, 'phone')
KONTAKT_VST3 = '/Library/Audio/Plug-Ins/VST3/Kontakt 8.vst3'

LIBRARIES = {
    'dracus': {
        'name': 'Orange Tree — Evolution Dracus',
        'nki': os.path.join(HOME, 'Downloads/Evolution Dracus/Instruments/Evolution Dracus.nki'),
        'plan': os.path.join(REPO, 'tools/harvest/plans/dracus.json'),
        'test_notes': [52],
    },
    'sunburst-deluxe': {
        'name': 'NI Session Guitarist — Electric Sunburst Deluxe (Melody)',
        'nki': os.path.join(HOME, 'Downloads/Native.Instruments Session Guitarist Electric Sunburst Deluxe.v1.2.0.KONTAKT/Session Guitarist - Electric Sunburst Deluxe Library/Instruments/Electric Sunburst Deluxe (Melody).nki'),
        'plan': os.path.join(REPO, 'tools/harvest/plans/sunburst-deluxe.json'),
        'test_notes': [52],
    },
    'picked-acoustic': {
        'name': 'NI Session Guitarist — Picked Acoustic (Melody)',
        'nki': os.path.join(HOME, 'Downloads/Native.Instruments Session Guitarist Picked Acoustic.v1.2.0.KONTAKT/Session Guitarist - Picked Acoustic Library/Instruments/Picked Acoustic (Melody).nki'),
        'plan': os.path.join(REPO, 'tools/harvest/plans/picked-acoustic.json'),
        'test_notes': [52],
    },
    'picked-nylon': {
        'name': 'NI Session Guitarist — Picked Nylon (Melody)',
        'nki': os.path.join(HOME, 'Downloads/Native.Instruments.Session Guitarist Picked Nylon.v1.1.0.KONTAKT/Session Guitarist - Picked Nylon Library/Instruments/Picked Nylon (Melody).nki'),
        'plan': os.path.join(REPO, 'tools/harvest/plans/picked-nylon.json'),
        'test_notes': [52],
    },
    'strummed-12': {
        'name': 'NI Session Guitarist — Strummed Acoustic 2 (12-String)',
        'nki': os.path.join(HOME, 'Downloads/Native.Instruments Session Guitarist Strummed Acoustic.2.v1.1.0.KONTAKT/Session Guitarist - Strummed Acoustic 2 Library/Instruments/Strummed Acoustic 2 - 12-String.nki'),
        'plan': os.path.join(REPO, 'tools/harvest/plans/strummed-acoustic-2.json'),
        'test_notes': [40, 47, 52],
    },
    'strummed-6': {
        'name': 'NI Session Guitarist — Strummed Acoustic 2 (6-String)',
        'nki': os.path.join(HOME, 'Downloads/Native.Instruments Session Guitarist Strummed Acoustic.2.v1.1.0.KONTAKT/Session Guitarist - Strummed Acoustic 2 Library/Instruments/Strummed Acoustic 2 - 6-String.nki'),
        'plan': os.path.join(REPO, 'tools/harvest/plans/strummed-acoustic-6.json'),
        'test_notes': [40, 47, 52],
    },
    'jambass': {
        'name': 'NI Session Bassist — Jam Bass (Melody)',
        'nki': os.path.join(HOME, 'Downloads/Native.Instruments.Session.Bassist.Jam.Bass.v1.0.1.KONTAKT-HiDERA/Session Bassist - Jam Bass Library/Instruments/Jam Bass (Melody).nki'),
        'plan': os.path.join(REPO, 'tools/harvest/plans/jambass.json'),
        'test_notes': [40],
    },
    'storm-deluxe': {
        'name': 'NI Session Guitarist — Electric Storm Deluxe (Melody)',
        'nki': os.path.join(HOME, 'Downloads/Native.Instruments Session Guitarist Electric Storm Deluxe KONTAKT/Instruments/Electric Storm Deluxe (Melody).nki'),
        'plan': os.path.join(REPO, 'tools/harvest/plans/storm-deluxe.json'),
        'test_notes': [52],
    },
}


def test_plugin_audio(p, notes, warm_seconds=5.0):
    t_end = time.time() + warm_seconds
    while time.time() < t_end:
        p([], duration=0.25, sample_rate=44100, num_channels=2, reset=False)
        time.sleep(0.2)
    msgs = []
    for n in notes:
        msgs.append(Message('note_on', note=n, velocity=100, time=0.1))
        msgs.append(Message('note_off', note=n, velocity=0, time=1.0))
    y = p(msgs, duration=1.6, sample_rate=44100, num_channels=2, reset=False)
    return float(abs(y).max())


def cmd_capture(lib_id):
    info = LIBRARIES[lib_id]
    state_path = os.path.join(STATES, f'{lib_id}.state')
    os.makedirs(STATES, exist_ok=True)
    print(f'=== Loading Kontakt 8 for {lib_id} ({info["name"]}) ===', flush=True)
    p = load_plugin(KONTAKT_VST3)
    p([], duration=0.5, sample_rate=44100, num_channels=2, reset=False)

    # Reveal the exact .nki file in Finder only AFTER Kontakt 8 finishes loading
    if os.path.exists(info['nki']):
        subprocess.run(['open', '-R', info['nki']], check=False)

    stop = threading.Event()

    def feed():
        while not stop.is_set():
            try:
                p([], duration=0.1, sample_rate=44100, num_channels=2, reset=False)
            except Exception:
                pass
            stop.wait(0.1)

    threading.Thread(target=feed, daemon=True).start()
    try:
        from AppKit import NSApplication, NSApplicationActivationPolicyRegular
        app = NSApplication.sharedApplication()
        app.setActivationPolicy_(NSApplicationActivationPolicyRegular)
        app.activateIgnoringOtherApps_(True)
    except Exception as e:
        print(f'(AppKit front warning: {e})', flush=True)

    print(f'>>> Kontakt 8 window is open! Load "{os.path.basename(info["nki"])}", wait until its UI appears, then close the window.', flush=True)
    p.show_editor()
    stop.set()

    raw = p.raw_state
    with open(state_path, 'wb') as f:
        f.write(raw)
        f.flush()
    print(f'Saved {len(raw):,} bytes to {state_path}. Verifying audio output...', flush=True)

    peak = test_plugin_audio(p, info['test_notes'], warm_seconds=4.0)
    if peak > 0.001:
        print(f'VERIFIED {lib_id}.state: audio_peak = {peak:.5f} (READY TO RENDER)', flush=True)
        os._exit(0)
    else:
        print(f'WARNING {lib_id}.state produced silent audio (peak={peak:.6f}). Instrument may not have finished loading.', flush=True)
        os._exit(2)


def cmd_verify(lib_id):
    info = LIBRARIES[lib_id]
    state_path = os.path.join(STATES, f'{lib_id}.state')
    if not os.path.exists(state_path):
        print(f'MISSING {state_path}', flush=True)
        os._exit(1)
    p = load_plugin(KONTAKT_VST3)
    with open(state_path, 'rb') as f:
        p.raw_state = f.read()
    peak = test_plugin_audio(p, info['test_notes'], warm_seconds=5.0)
    print(f'VERIFY {lib_id}.state: bytes={os.path.getsize(state_path):,} audio_peak={peak:.5f}', flush=True)
    os._exit(0 if peak > 0.001 else 2)


def cmd_render(lib_id):
    info = LIBRARIES[lib_id]
    state_path = os.path.join(STATES, f'{lib_id}.state')
    if not os.path.exists(state_path):
        print(f'Skipping {lib_id}: {state_path} does not exist yet.', flush=True)
        return False
    render_py = os.path.join(REPO, 'tools/harvest/render.py')
    export_py = os.path.join(REPO, 'tools/harvest/export_pack.py')
    pack_dir = os.path.join(PACKS, lib_id)
    beat = os.path.join(pack_dir, '.heartbeat')

    # Watchdog loop (restarts render.py up to 5 times if Kontakt freezes for >240s)
    for attempt in range(1, 6):
        print(f'=== Rendering {lib_id} (attempt {attempt}/5) ===', flush=True)
        proc = subprocess.Popen([sys.executable, render_py, info['plan'], PACKS])
        frozen = False
        while proc.poll() is None:
            time.sleep(5)
            if os.path.exists(beat) and (time.time() - os.path.getmtime(beat)) > 240:
                print(f'render {lib_id}: heartbeat stalled >240s, restarting...', flush=True)
                proc.kill()
                proc.wait()
                frozen = True
                break
        if not frozen and proc.returncode == 0:
            break
    else:
        print(f'ERROR: {lib_id} render did not complete after 5 attempts.', flush=True)
        return False

    print(f'=== Exporting Studio & Pocket .kgpack for {lib_id} ===', flush=True)
    subprocess.run([sys.executable, export_py, pack_dir, os.path.join(PHONE, lib_id)], check=True)
    subprocess.run([sys.executable, export_py, '--tier', 'pocket', pack_dir, os.path.join(PHONE, f'{lib_id}-pocket')], check=True)
    print(f'DONE {lib_id}: {lib_id}.kgpack + {lib_id}-pocket.kgpack ready in {PHONE}', flush=True)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('action', choices=['capture', 'verify', 'render', 'render-all'])
    ap.add_argument('library', nargs='?', choices=list(LIBRARIES.keys()))
    a = ap.parse_args()

    if a.action in ('capture', 'verify', 'render') and not a.library:
        ap.error(f'{a.action} requires a library ID: {list(LIBRARIES.keys())}')

    if a.action == 'capture':
        cmd_capture(a.library)
    elif a.action == 'verify':
        cmd_verify(a.library)
    elif a.action == 'render':
        ok = cmd_render(a.library)
        sys.exit(0 if ok else 1)
    elif a.action == 'render-all':
        for lib_id in ['dracus', 'sunburst-deluxe', 'picked-acoustic', 'picked-nylon', 'strummed-12', 'strummed-6', 'jambass']:
            if os.path.exists(os.path.join(STATES, f'{lib_id}.state')):
                cmd_render(lib_id)


if __name__ == '__main__':
    main()
