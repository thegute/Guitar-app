#!/usr/bin/env python3
"""A made-up printed tab for the own tab-picture reader's tests (tests/tabread-logic.test.ts): two staves of 6 lines,
4/4 bars of quarter and eighth notes, two-digit frets, a tied note in brackets "(12)", a dead note X, a pickup bar and a
quarter rest symbol drawn in the staff. Written out as zlib-packed grey pixels (8-byte header w, h, then 1 byte a pixel).
The notes are written beside it as JSON (staves → bars → steps) so the test knows the answer.

  python3 tests/fixtures/make-tab-picture.py   →   tests/fixtures/tab-picture.gray.z + tab-picture.json
"""
import json, os, struct, zlib
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(__file__)
FONT = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
W, GAP, LEFT, RIGHT = 1800, 24, 60, 1760
font = ImageFont.truetype(FONT, 22)
big = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 40)

# bars: list of steps (dur in beats, [(string 0 = low E, fret or 'x', bracket?)])
STAFF1 = [
    [(1, [(3, 0)]), (1, [(3, 2)])],                                            # pickup: 2 beats
    [(1, [(0, 3), (4, 0)]), (1, [(2, 0)]), (0.5, [(3, 0)]), (0.5, [(3, 2)]), (1, [(4, 1)])],
    [(1, [(1, 5)]), (1, [(2, 7)]), (1, [(3, 9)]), (1, [(4, 10)])],
    [(0.5, [(5, 12)]), (0.5, [(5, 10)]), (1, [(4, 12)]), (2, [(4, 12, True)])],
]
STAFF2 = [
    [(1, [(0, 'x'), (1, 'x')]), (1, [(1, 3)]), (1, [(2, 5)]), (1, 'rest')],
    [(1, [(0, 0), (1, 2), (2, 2), (3, 1), (4, 0), (5, 0)]), (1, [(2, 14)]), (2, [(3, 15)])],
    [(0.5, [(5, 3)]), (0.5, [(5, 2)]), (0.5, [(4, 3)]), (0.5, [(4, 1)]), (1, [(3, 2)]), (1, [(2, 0)])],
]


def end_of(bars):
    x = LEFT + 110
    for bar in bars:
        for dur, _ in bar:
            x += 92 * dur ** 0.65
        x = x - 92 * 0.5 ** 0.65 * 0.45 + 34
    return x - 34


def staff(d, top, bars):
    lines = [top + i * GAP for i in range(6)]  # top line = high e
    right = end_of(bars)
    for y in lines:
        d.line([(LEFT, y), (right, y)], fill=0, width=2)
    for x in (LEFT, right):
        d.line([(x, lines[0]), (x, lines[-1])], fill=0, width=2)
    for k, ch in enumerate('TAB'):
        d.text((LEFT + 12, lines[1] - 12 + k * 30), ch, font=big if False else ImageFont.truetype(FONT, 30), fill=0)
    x = LEFT + 110
    unit = 92  # room for one beat: engravers give longer notes less than double room
    width = lambda dur: unit * dur ** 0.65
    answer = []
    for bi, bar in enumerate(bars):
        answer.append([])
        for dur, notes in bar:
            if notes == 'rest':
                # a quarter rest: a bold zig-zag in the middle of the staff
                y = lines[2]
                d.line([(x - 4, y - 14), (x + 5, y - 2), (x - 3, y + 6), (x + 6, y + 18)], fill=0, width=5)
                answer[-1].append({'dur': dur, 'notes': []})
            else:
                step = []
                for n in notes:
                    s, f = n[0], n[1]
                    y = lines[5 - s]
                    t = 'X' if f == 'x' else str(f)
                    if len(n) > 2:
                        t = f'({t})'
                    bb = d.textbbox((0, 0), t, font=font)
                    tw, th = bb[2] - bb[0], bb[3] - bb[1]
                    # paper behind the number (the staff line breaks round it, the way tab is printed)
                    d.rectangle([x - tw / 2 - 2, y - th / 2 - 1, x + tw / 2 + 2, y + th / 2 + 1], fill=255)
                    d.text((x - tw / 2 - bb[0], y - th / 2 - bb[1]), t, font=font, fill=0)
                    step.append({'string': s, 'fret': f if f != 'x' else 0, **({'dead': True} if f == 'x' else {})})
                answer[-1].append({'dur': dur, 'notes': step})
            x += width(dur)
        # bar line, a little before the next slot
        bx = x - width(0.5) * 0.45
        d.line([(bx, lines[0]), (bx, lines[-1])], fill=0, width=2)
        x = bx + 34
    return answer


def main():
    im = Image.new('L', (W, 520), 255)
    d = ImageDraw.Draw(im)
    a1 = staff(d, 70, STAFF1)
    a2 = staff(d, 330, STAFF2)
    im = im.crop((0, 0, max(W, 0), 520))
    w, h = im.size
    with open(os.path.join(HERE, 'tab-picture.gray.z'), 'wb') as f:
        f.write(zlib.compress(struct.pack('<II', w, h) + im.tobytes(), 9))
    with open(os.path.join(HERE, 'tab-picture.json'), 'w') as f:
        json.dump({'staves': [a1, a2]}, f)
    im.save('/tmp/tab-picture.png') if os.environ.get('SAVE') else None


if __name__ == '__main__':
    main()
