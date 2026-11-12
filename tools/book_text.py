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
