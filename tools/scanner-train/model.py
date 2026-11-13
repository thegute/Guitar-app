"""tab_crnn: KGuitar's picture reader for tab staves (row-pooled, column-wise; no CTC, no RNN, all ops run on Apple MPS
and export to ONNX).

Input: a straightened staff strip, 1 × 160 × W, white = 1, ink = 0, string lines at y = 42 + 15·s (s = 0 top / highest).
Output per column step (every 4 px across):
  heat   [3, T]  sigmoid peaks: a note column, a bar line, a rest / held step
  off    [1, T]  where the column sits inside its 4 px step (−0.5 … 0.5)
  frets  [6, 27, T] per string slot: 0 empty, 1 + fret (0–24), 26 dead note (x)
  dur    [7, T]  whole, half, quarter, eighth, 16th, 32nd, 6 = no rhythm printed
  dots   [3, T], tup [5, T] (none, 3, 5, 6, 7), grace [2, T], stroke [3, T] (none, ⊓ down, V up)
"""
import torch
import torch.nn as nn
import torch.nn.functional as F

H, GAP, TOP, SLOTS = 160, 15, 42, 6
NFRET = 27
TUPS = [0, 3, 5, 6, 7]


class DW(nn.Module):
    """depthwise-separable conv block with a skip"""

    def __init__(self, cin, cout, stride=1, dil=1):
        super().__init__()
        self.dw = nn.Conv2d(cin, cin, 3, stride, padding=dil, dilation=dil, groups=cin, bias=False)
        self.b1 = nn.BatchNorm2d(cin)
        self.pw = nn.Conv2d(cin, cout, 1, bias=False)
        self.b2 = nn.BatchNorm2d(cout)
        self.skip = None if (cin == cout and stride == 1) else nn.Sequential(nn.Conv2d(cin, cout, 1, stride, bias=False), nn.BatchNorm2d(cout))

    def forward(self, x):
        y = F.gelu(self.b1(self.dw(x)))
        y = self.b2(self.pw(y))
        return F.gelu(y + (x if self.skip is None else self.skip(x)))


class TCN(nn.Module):
    def __init__(self, d, dil):
        super().__init__()
        self.dw = nn.Conv1d(d, d, 5, padding=2 * dil, dilation=dil, groups=d)
        self.n = nn.BatchNorm1d(d)
        self.pw1 = nn.Conv1d(d, d * 2, 1)
        self.pw2 = nn.Conv1d(d * 2, d, 1)

    def forward(self, x):
        y = self.n(self.dw(x))
        return x + self.pw2(F.gelu(self.pw1(y)))


class TabCRNN(nn.Module):
    def __init__(self, c=(32, 64, 96, 144), d=192):
        super().__init__()
        self.stem = nn.Sequential(nn.Conv2d(1, c[0], 3, 1, 1, bias=False), nn.BatchNorm2d(c[0]), nn.GELU())
        self.s1 = nn.Sequential(DW(c[0], c[1], 2), DW(c[1], c[1]))          # 80 × W/2
        self.s2 = nn.Sequential(DW(c[1], c[2], 2), DW(c[2], c[2]), DW(c[2], c[2], dil=2))  # 40 × W/4
        self.s3 = nn.Sequential(DW(c[2], c[3]), DW(c[3], c[3], dil=2), DW(c[3], c[3]))
        C = c[3]
        self.C = C
        # string rows in the 40-row feature map: (42 + 15 s) / 4
        self.rows = [((TOP + GAP * s) / 4) for s in range(SLOTS)]
        self.mix = nn.Conv1d(C * (SLOTS + 2), d, 1)
        self.tcn = nn.Sequential(*[TCN(d, k) for k in (1, 2, 4, 8, 1, 2)])
        self.emb = nn.Parameter(torch.zeros(SLOTS, 16))
        nn.init.normal_(self.emb, std=0.5)
        self.fret1 = nn.Conv1d(C + d + 16, d, 1)
        self.fret2 = nn.Conv1d(d, NFRET, 1)
        self.heads = nn.Conv1d(d, d, 1)
        self.heat = nn.Conv1d(d, 3, 1)
        self.off = nn.Conv1d(d, 1, 1)
        self.dur = nn.Conv1d(d, 7, 1)
        self.dots = nn.Conv1d(d, 3, 1)
        self.tup = nn.Conv1d(d, len(TUPS), 1)
        self.grace = nn.Conv1d(d, 2, 1)
        self.stroke = nn.Conv1d(d, 3, 1)
        nn.init.constant_(self.heat.bias, -2.2)

    def forward(self, x):
        f = self.s3(self.s2(self.s1(self.stem(x))))  # B, C, 40, T
        lanes = []
        for r in self.rows:
            a = int(r) - 1
            lanes.append(f[:, :, a:a + 3].mean(2))  # 3 rows round the line
        up = f[:, :, 0:9].amax(2)                    # above the staff: strokes, words
        lo = f[:, :, 31:40].amax(2)                  # below: stems, beams, flags, dots, 3s
        ctx = self.tcn(self.mix(torch.cat(lanes + [up, lo], 1)))  # B, d, T
        B, _, T = ctx.shape
        frets = []
        for s, ln in enumerate(lanes):
            e = self.emb[s].view(1, -1, 1).expand(B, -1, T)
            frets.append(self.fret2(F.gelu(self.fret1(torch.cat([ln, ctx, e], 1)))))
        h = F.gelu(self.heads(ctx))
        return {
            'heat': self.heat(h), 'off': self.off(h).squeeze(1), 'frets': torch.stack(frets, 1),
            'dur': self.dur(h), 'dots': self.dots(h), 'tup': self.tup(h), 'grace': self.grace(h), 'stroke': self.stroke(h),
        }


if __name__ == '__main__':
    m = TabCRNN()
    n = sum(p.numel() for p in m.parameters())
    y = m(torch.zeros(2, 1, 160, 512))
    print(f'{n / 1e6:.2f} M parameters', {k: tuple(v.shape) for k, v in y.items()})
