#!/usr/bin/env python3
"""Read the owner's PDF books into page text, for his private book pack (tools/make_book_pack.py).

The books and everything made from them stay OFF the repo (it's public): output goes to a folder you name, outside it.
Pages with a text layer use it; scanned pages (or ones with only a few words) are read with tesseract OCR.
Usage: python3 tools/book_text.py <out folder> <book.pdf> [...]
Writes <out>/<book id>/pages.json = {"title", "file", "pages": [{"n", "text", "ocr"}]}.
"""
import json, os, re, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor

def book_id(path):
    base = os.path.basename(path)
    base = re.sub(r'^[0-9a-f]{8}-', '', base)              # upload prefix
    base = re.sub(r'[_ ]*\(?(z-library|z-lib|1lib)[^.]*', '', base, flags=re.I)
    base = re.sub(r'\.pdf$', '', base, flags=re.I)
    return re.sub(r'[^a-z0-9]+', '-', base.lower()).strip('-')[:60]

def pages_of(pdf):
    out = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout
    m = re.search(r'^Pages:\s+(\d+)', out, re.M)
    return int(m.group(1)) if m else 0

def page_text(pdf, n):
    t = subprocess.run(['pdftotext', '-layout', '-f', str(n), '-l', str(n), pdf, '-'], capture_output=True, text=True).stdout
    words = re.findall(r'[A-Za-z]{3,}', t)
    # a real text layer: enough words and mostly dictionary-looking (OCR junk layers fail this)
    good = len(words) >= 25 and sum(1 for w in words if re.fullmatch(r'[A-Za-z][a-z]+', w)) / max(1, len(words)) > 0.75
    if good:
        return t, False
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(['pdftoppm', '-f', str(n), '-l', str(n), '-r', '200', '-gray', '-png', pdf, os.path.join(d, 'p')], check=True)
        png = [f for f in os.listdir(d) if f.endswith('.png')][0]
        o = subprocess.run(['tesseract', os.path.join(d, png), '-', '--psm', '3'], capture_output=True, text=True).stdout
    return (o if len(o.strip()) > len(t.strip()) * 0.8 else t), True

def main():
    out, pdfs = sys.argv[1], sys.argv[2:]
    for pdf in pdfs:
        bid = book_id(pdf)
        dest = os.path.join(out, bid)
        os.makedirs(dest, exist_ok=True)
        f = os.path.join(dest, 'pages.json')
        if os.path.exists(f):
            print('have', bid); continue
        n = pages_of(pdf)
        with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as ex:
            res = list(ex.map(lambda i: page_text(pdf, i), range(1, n + 1)))
        pages = [{'n': i + 1, 'text': t, 'ocr': o} for i, (t, o) in enumerate(res)]
        json.dump({'id': bid, 'file': os.path.basename(pdf), 'pages': pages}, open(f, 'w'))
        print(bid, n, 'pages', sum(p['ocr'] for p in pages), 'read by OCR', flush=True)

if __name__ == '__main__':
    main()


def vocab_from(out):
    """Words seen in the clean (text-layer, not OCR) pages of all books read so far: a home-made word list."""
    from collections import Counter
    c = Counter()
    for d in os.listdir(out):
        f = os.path.join(out, d, 'pages.json')
        if not os.path.exists(f):
            continue
        for p in json.load(open(f))['pages']:
            if not p['ocr']:
                c.update(w.lower() for w in re.findall(r'[A-Za-z]{4,}', p['text']))
    return {w for w, n in c.items() if n >= 3}


def junk_share(text, vocab):
    words = [w.lower() for w in re.findall(r'[A-Za-z]{4,}', text)]
    return 1.0 if not words else 1 - sum(w in vocab for w in words) / len(words)


def reocr_junk(out, pdf_dir_map, limit=0.45):
    """Pages whose text layer is mostly not words (a bad scan-OCR layer) are read again with tesseract."""
    vocab = vocab_from(out)
    for d in sorted(os.listdir(out)):
        f = os.path.join(out, d, 'pages.json')
        if not os.path.exists(f):
            continue
        book = json.load(open(f))
        pdf = pdf_dir_map.get(book['file'])
        if not pdf:
            continue
        bad = [p for p in book['pages'] if not p['ocr'] and len(re.findall(r'[A-Za-z]{4,}', p['text'])) >= 8 and junk_share(p['text'], vocab) > limit]
        if not bad:
            continue
        def again(p):
            with tempfile.TemporaryDirectory() as t:
                subprocess.run(['pdftoppm', '-f', str(p['n']), '-l', str(p['n']), '-r', '200', '-gray', '-png', pdf, os.path.join(t, 'p')], check=True)
                png = [x for x in os.listdir(t) if x.endswith('.png')][0]
                return subprocess.run(['tesseract', os.path.join(t, png), '-', '--psm', '3'], capture_output=True, text=True).stdout
        with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as ex:
            texts = list(ex.map(again, bad))
        for p, t in zip(bad, texts):
            if junk_share(t, vocab) < junk_share(p['text'], vocab):
                p['text'], p['ocr'] = t, True
        json.dump(book, open(f, 'w'))
        print(d, len(bad), 'garbled pages read again', flush=True)
