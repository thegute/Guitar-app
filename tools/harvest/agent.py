#!/usr/bin/env python3
"""KGuitar harvest agent: runs on the owner's Mac so Claude can drive the plugins without him pasting a command each time.

He starts it once in Terminal:
    ~/KGuitar-harvest/.venv/bin/python ~/KGuitar-harvest/tools/agent.py
and it watches ~/KGuitar-harvest/jobs/inbox for job files (JSON) that Claude writes. Each job runs ONE of the fixed
actions in agent_actions.py (nothing else: no shell commands), which read only plug-ins from the system plug-in folders
and write only inside ~/KGuitar-harvest. Results go to jobs/outbox/<id>.json, a running log to jobs/agent.log.
agent_actions.py is reloaded before every job, so updated actions work without restarting. Ctrl+C (or a "stop" job)
ends it.
"""
import importlib
import json
import os
import sys
import time
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import agent_actions as A  # noqa: E402


def main():
    for d in (A.INBOX, A.OUTBOX, A.RUNNING):
        os.makedirs(d, exist_ok=True)
    A.log(f'KGuitar harvest agent ready: watching {A.INBOX} (Ctrl+C to stop)')
    while True:
        jobs = sorted(f for f in os.listdir(A.INBOX) if f.endswith('.json'))
        if not jobs:
            time.sleep(0.5)
            continue
        name = jobs[0]
        src, run = os.path.join(A.INBOX, name), os.path.join(A.RUNNING, name)
        try:
            os.replace(src, run)
            job = json.load(open(run))
        except Exception as e:
            A.log(f'{name}: unreadable ({e})')
            continue
        kind = job.get('action')
        t0 = time.time()
        res = {'id': name[:-5], 'action': kind}
        if kind == 'stop':
            res['ok'] = True
            json.dump(res, open(os.path.join(A.OUTBOX, name), 'w'), indent=1)
            os.remove(run)
            A.log('stop: bye')
            return
        try:
            importlib.reload(A)
            if kind not in A.ACTIONS:
                raise ValueError(f'unknown action {kind}')
            A.log(f'{name}: {kind} …')
            res['result'] = A.ACTIONS[kind](job)
            res['ok'] = True
        except Exception as e:
            res['ok'] = False
            res['error'] = f'{type(e).__name__}: {e}'
            res['trace'] = traceback.format_exc()[-3000:]
        res['seconds'] = round(time.time() - t0, 2)
        json.dump(res, open(os.path.join(A.OUTBOX, name), 'w'), indent=1)
        os.remove(run)
        A.log(f'{name}: {"done" if res["ok"] else "FAILED " + res["error"]} in {res["seconds"]} s')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        A.log('stopped')
