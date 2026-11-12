#!/usr/bin/env python3
"""Make the owner's PRIVATE book pack: one JSON file with the text of every page of his own PDF books, each book's
contents (from the PDF's bookmarks, or chapter headings found in the text), title, author and kind.

The pack is personal (his own books, for his own phone): it is written OUTSIDE the repo and never committed. KGuitar
imports it in Learn → My books, matches pages to topics ("In your books"), shows the pages, and lets the helper quote them
when it teaches him. The PDFs themselves can be added in the app too, to see the real pages and read tabs into Play.

  python3 tools/make_book_pack.py --work <dir of book_text.py output> --meta meta.json --pdfs <dir> [--pdfs <dir>] --out pack.json

--work: folders made by tools/book_text.py (<id>/pages.json with OCR'd text per page)
--meta: {"<id>": {"title" (the main title as printed on the cover, no author), "kind": theory|fretboard|technique|improvising|style|licks|songs, "main"?}}
--pdfs: where the PDFs are, to read their bookmarks (matched by the file name recorded in pages.json)
"""
import argparse, json, os, re, sys, time

HEAD = re.compile(r'^(?:CHAPTER|Chapter|PART|Part|LESSON|Lesson|UNIT|Unit|Step|STEP|Section|SECTION)\s+[0-9IVXLC]+\b.{0,70}$')


def outline(pdf_path):
    """The PDF's bookmarks as [{title, page}] (1-based pages), or []."""
    try:
        import pypdf
        r = pypdf.PdfReader(pdf_path)
        out = []

        def walk(items, depth):
            for it in items:
                if isinstance(it, list):
                    if depth < 2: walk(it, depth + 1)
                    continue
                try:
                    p = r.get_destination_page_number(it) + 1
                except Exception:
                    continue
                t = ' '.join(str(it.title or '').split())
                if t and len(t) < 120: out.append({'title': t, 'page': p, 'depth': depth})
        walk(r.outline, 0)
        return out
    except Exception:
        return []


def headings(pages):
    """Chapter headings found in the text, first time each one appears."""
    seen, out = set(), []
    for pg in pages:
        for line in pg['text'].split('\n')[:12]:
            l = ' '.join(line.split())
            if HEAD.match(l) and not re.search(r'\.{4,}', l):
                key = re.sub(r'\W+', ' ', l.lower())[:40]
                if key in seen: continue
                seen.add(key)
                out.append({'title': l, 'page': pg['n'], 'depth': 0})
    return out


def clean(t):
    t = t.replace('\r', '')
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\n{3,}', '\n\n', t)
    return t.strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--work', required=True)
    ap.add_argument('--meta', required=True)
    ap.add_argument('--pdfs', action='append', default=[])
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    if os.path.abspath(a.out).startswith(os.path.abspath(os.path.dirname(os.path.dirname(__file__)))):
        sys.exit('The book pack is private: write it outside the repo.')
    meta = json.load(open(a.meta))
    files = {}
    for d in a.pdfs:
        for f in os.listdir(d):
            if f.lower().endswith('.pdf'): files[f] = os.path.join(d, f)
    books = []
    for bid in sorted(os.listdir(a.work)):
        pj = os.path.join(a.work, bid, 'pages.json')
        if not os.path.exists(pj): continue
        m = meta.get(bid)
        if not m:
            print('  (no meta, skipped)', bid); continue
        d = json.load(open(pj))
        pages = [{'n': p['n'], 'text': clean(p['text'])} for p in d['pages']]
        pdf = files.get(d['file'])
        toc = outline(pdf) if pdf else []
        src = 'bookmarks' if toc else 'headings'
        if not toc: toc = headings(pages)
        books.append({'id': bid, 'title': m['title'], 'kind': m['kind'], 'main': bool(m.get('main')),
                      'file': d['file'], 'pages': len(pages), 'toc': toc, 'text': [p['text'] for p in pages]})
        print(f"  {m['title'][:56]:56s} {len(pages):4d} pages, contents {len(toc):3d} ({src})")
    pack = {'format': 'kguitar-books', 'version': 1, 'made': time.strftime('%Y-%m-%d'), 'books': books}
    with open(a.out, 'w') as f: json.dump(pack, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(books)} books, {os.path.getsize(a.out) // 1024} KB → {a.out}')


if __name__ == '__main__':
    main()
