"""How fast this Mac trains tab_crnn: the network alone (random pictures), and the picture drawing alone."""
import time

import torch

from data import Mixed
from model import TabCRNN

if __name__ == '__main__':
    dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
    for arch, amp in (('dense', False), ('dense', True), ('dw', False)):
        m = TabCRNN(arch=arch).to(dev)
        opt = torch.optim.AdamW(m.parameters(), 1e-3)
        x = torch.rand(32, 1, 160, 512, device=dev)
        for i in range(25):
            if i == 5:
                if dev == 'mps':
                    torch.mps.synchronize()
                t = time.time()
            with torch.autocast(device_type=dev, dtype=torch.float16, enabled=amp and dev != 'cpu'):
                o = m(x)
            loss = sum(v.float().mean() for v in o.values())
            opt.zero_grad()
            loss.backward()
            opt.step()
        if dev == 'mps':
            torch.mps.synchronize()
        print(f'network {arch} on {dev} (half precision {amp}): {20 / (time.time() - t):.2f} steps/s', flush=True)
    for w in (6,):
        dl = torch.utils.data.DataLoader(Mixed('strips/train'), batch_size=32, num_workers=w)
        it = iter(dl)
        next(it)
        t = time.time()
        for _ in range(10):
            next(it)
        print(f'pictures with {w} helpers: {10 / (time.time() - t):.2f} batches/s', flush=True)
        del it, dl
