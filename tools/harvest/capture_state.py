"""KGuitar harvest: set up a plugin once, by hand, and save its full state for headless renders.

Opens the plugin's own window (Kontakt, Ample, Neural DSP …). The owner loads the instrument / preset and sets it up
(for guitars: one note per string and "channel-based strings" if the instrument has it, so MIDI channel 1–6 picks the
string; reverb and doubling OFF, we add our own). Closing the window saves the state to <name>.state, which render.py
loads so every later render is hands-free.

  python tools/harvest/capture_state.py "/Library/Audio/Plug-Ins/VST3/Kontakt 8.vst3" ~/KGuitar-harvest/states/otree-acoustic
  python tools/harvest/capture_state.py "/Library/Audio/Plug-Ins/VST3/Kontakt 8.vst3" ~/KGuitar-harvest/states/playbox --name "Kontakt 8"
"""
import argparse
import os
import sys

from pedalboard import load_plugin


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('plugin', help='path to a .vst3 or .component')
    ap.add_argument('out', help='where to save the state (".state" is added)')
    ap.add_argument('--name', help='plugin name inside a bundle with several (e.g. "Kontakt 8")')
    ap.add_argument('--start', help='a saved .state to open with (e.g. the instrument already loaded) instead of a blank plug-in')
    ap.add_argument('--warm', type=float, default=0.5, help='seconds of audio to run through it before the window opens')
    a = ap.parse_args()
    if not a.start and os.path.exists(a.out + '.state'):
        # set up again from where it was saved last time (e.g. the instrument is already loaded), warmed up first
        a.start = a.out + '.state'
        a.warm = max(a.warm, 8.0)
    p = load_plugin(a.plugin, plugin_name=a.name) if a.name else load_plugin(a.plugin)
    if a.start:
        with open(os.path.expanduser(a.start), 'rb') as f:
            p.raw_state = f.read()
    print(f'Loaded {p.name if hasattr(p, "name") else a.plugin}. Set it up in its window, then close the window to save.')
    # samplers like Kontakt only finish starting up once a host has run audio through them ("initialization
    # incomplete … assigned to an audio output"): process a moment of silence first, and keep it processing while the
    # window is open (a background thread feeding empty blocks)
    import threading
    try:
        import time as _t
        if getattr(p, 'is_instrument', False) and a.warm > 0.5:
            # let the instrument finish starting up (Kontakt scripts wait for audio to run), in real time
            end = _t.time() + a.warm
            while _t.time() < end:
                p([], duration=0.25, sample_rate=48000, num_channels=2, reset=False)
                _t.sleep(0.2)
        p([], duration=0.5, sample_rate=48000, num_channels=2, reset=False) if getattr(p, 'is_instrument', False) else p(__import__('numpy').zeros((2, 4800), dtype='float32'), 48000)
    except Exception as e:
        print(f'(warm-up: {e})')
    stop = threading.Event()
    def feed():
        while not stop.is_set():
            try:
                if getattr(p, 'is_instrument', False):
                    p([], duration=0.1, sample_rate=48000, num_channels=2, reset=False)
            except Exception:
                pass
            stop.wait(0.1)
    threading.Thread(target=feed, daemon=True).start()
    try:
        # a plain python process is a background app on macOS: its windows open hidden unless it asks to be a regular,
        # active app first (needs pyobjc-framework-Cocoa in the venv; without it the window may stay hidden)
        from AppKit import NSApplication, NSApplicationActivationPolicyRegular
        app = NSApplication.sharedApplication()
        app.setActivationPolicy_(NSApplicationActivationPolicyRegular)
        app.activateIgnoringOtherApps_(True)
    except Exception as e:
        print(f'(could not bring the window to the front: {e})')
    p.show_editor()
    stop.set()
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out + '.state', 'wb') as f:
        f.write(p.raw_state)
    print(f'Saved {len(p.raw_state)} bytes of state to {a.out}.state')


if __name__ == '__main__':
    sys.exit(main())
