#!/usr/bin/env python3
"""Pull a Google Slides deck apart into plain JSON, so a lab deck can be
written from it.

Ariel specs lab presentations in Google Slides; the site renders lab decks
from markdown (src/lib/data/lab-decks/lab-NN.md). This script does only the
mechanical half of that trip: it reads a .pptx export and writes, per slide,
the title, body paragraphs (with bullet level), links, images, videos, tables,
font sizes and speaker notes. Deciding which slide kind each one becomes, and
writing the markdown, is done by hand or by Claude following
.claude/skills/import-slides/SKILL.md. Keeping the two apart means the
extraction is the same every time and only the judgement varies.

Standard library only: a .pptx is a zip of XML, and python-pptx is not
installed here.

    python3 scripts/import-slides.py <share link or file.pptx> --name lab-03
    python3 scripts/import-slides.py lab-03.pptx --name lab-03 \
        --against lab-planning/slides/lab-03.deck.json      # what changed?

A share link works when the deck is set to "anyone with the link can view":
Google serves an export at /presentation/d/<id>/export/pptx with no login.
For a private deck, use File > Download > Microsoft PowerPoint instead.

Writes work/slides/<name>/deck.json and work/slides/<name>/media/ (work/ is
gitignored). Copy the snapshot to lab-planning/slides/<name>.deck.json once a
deck has been imported, so the next run can report what changed.
"""

import argparse
import difflib
import hashlib
import json
import posixpath
import re
import sys
import urllib.request
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
NS = {'a': A, 'p': P, 'r': R}

# Hosts that mean "a page on the course site", so a link to one reads as a
# demo rather than a citation.
SITE_HOSTS = ('atek639.calarts.app', 'a211h.yaytso.art', 'localhost')

UA = 'Mozilla/5.0 (pandaemonium import-slides)'


def fetch(source: str, dest: Path) -> Path:
    """Return a local .pptx path, downloading a Google Slides export if needed."""
    if not re.match(r'https?://', source):
        path = Path(source).expanduser()
        if not path.exists():
            sys.exit(f'no such file: {path}')
        return path
    m = re.search(r'/presentation/d/([A-Za-z0-9_-]+)', source)
    if not m:
        sys.exit('that does not look like a Google Slides link (…/presentation/d/<id>/…)')
    url = f'https://docs.google.com/presentation/d/{m.group(1)}/export/pptx'
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            data = res.read()
    except Exception as err:  # noqa: BLE001 - report whatever went wrong
        sys.exit(f'could not download the deck: {err}')
    # A private deck answers with a sign-in page, not a zip.
    if not data.startswith(b'PK'):
        sys.exit(
            'Google returned a web page instead of the deck. Set sharing to\n'
            '"anyone with the link can view", or use File > Download > Microsoft\n'
            'PowerPoint and pass the file instead.'
        )
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return dest


def rels_for(zf: zipfile.ZipFile, part: str) -> dict:
    """rId -> {target, type, external} for one part, targets made absolute."""
    folder, name = posixpath.split(part)
    path = f'{folder}/_rels/{name}.rels'
    if path not in zf.namelist():
        return {}
    out = {}
    for rel in ET.fromstring(zf.read(path)).findall(f'{{{REL}}}Relationship'):
        external = rel.get('TargetMode') == 'External'
        target = rel.get('Target', '')
        if not external:
            target = posixpath.normpath(posixpath.join(folder, target)).lstrip('/')
        out[rel.get('Id')] = {
            'target': target,
            'type': rel.get('Type', '').rsplit('/', 1)[-1],
            'external': external,
        }
    return out


def paragraphs(tx_body, rels: dict) -> list:
    """Every non-empty paragraph in a text body, with what is needed to tell a
    bullet from a sentence and a heading from a caption."""
    out = []
    if tx_body is None:
        return out
    for para in tx_body.findall('a:p', NS):
        ppr = para.find('a:pPr', NS)
        level = int(ppr.get('lvl', 0)) if ppr is not None else 0
        bullet = None
        if ppr is not None:
            if ppr.find('a:buNone', NS) is not None:
                bullet = 'none'
            elif ppr.find('a:buAutoNum', NS) is not None:
                bullet = 'number'
            elif ppr.find('a:buChar', NS) is not None or ppr.find('a:buBlip', NS) is not None:
                bullet = 'char'
        text, links, sizes, bold = '', [], [], False
        for node in para:
            tag = node.tag.rsplit('}', 1)[-1]
            if tag == 'br':
                text += '\n'
            elif tag in ('r', 'fld'):
                t = node.find('a:t', NS)
                run = (t.text or '') if t is not None else ''
                text += run
                rpr = node.find('a:rPr', NS)
                if rpr is not None:
                    if rpr.get('sz'):
                        sizes.append(int(rpr.get('sz')) / 100)
                    bold = bold or rpr.get('b') == '1'
                    click = rpr.find('a:hlinkClick', NS)
                    if click is not None:
                        rel = rels.get(click.get(f'{{{R}}}id'))
                        if rel and rel['external'] and run.strip():
                            links.append({'text': run.strip(), 'url': rel['target']})
        if not text.strip():
            continue
        entry = {'text': text.strip(), 'level': level}
        if bullet:
            entry['bullet'] = bullet
        if links:
            entry['links'] = links
        if sizes:
            entry['size'] = max(sizes)
        if bold:
            entry['bold'] = True
        out.append(entry)
    return out


def box(node):
    """Position and size in EMU, when the shape states them."""
    xfrm = node.find('.//a:xfrm', NS)
    if xfrm is None:
        return None
    off, ext = xfrm.find('a:off', NS), xfrm.find('a:ext', NS)
    if off is None or ext is None:
        return None
    return {k: int(v) for k, v in (('x', off.get('x')), ('y', off.get('y')), ('w', ext.get('cx')), ('h', ext.get('cy')))}


def walk(tree, rels, zf, slide_no, media_dir, area, state):
    """Collect shapes in document order, descending into groups."""
    for node in tree:
        tag = node.tag.rsplit('}', 1)[-1]
        if tag == 'grpSp':
            walk(node, rels, zf, slide_no, media_dir, area, state)
        elif tag == 'sp':
            ph = node.find('p:nvSpPr/p:nvPr/p:ph', NS)
            role = ph.get('type', 'body') if ph is not None else 'textbox'
            paras = paragraphs(node.find('p:txBody', NS), rels)
            if not paras:
                continue
            if role in ('title', 'ctrTitle'):
                state['title'] = ' '.join(p['text'] for p in paras)
                state['title_links'] = [l for p in paras for l in p.get('links', [])]
            elif role in ('sldNum', 'dt', 'ftr'):
                continue
            else:
                state['blocks'].append({'role': role, 'paragraphs': paras})
        elif tag == 'pic':
            blip = node.find('.//a:blip', NS)
            rel = rels.get(blip.get(f'{{{R}}}embed')) if blip is not None else None
            c_nv = node.find('p:nvPicPr/p:cNvPr', NS)
            entry = {'alt': (c_nv.get('descr') or c_nv.get('title') or '') if c_nv is not None else ''}
            click = c_nv.find('a:hlinkClick', NS) if c_nv is not None else None
            if click is not None:
                link = rels.get(click.get(f'{{{R}}}id'))
                if link and link['external']:
                    entry['link'] = link['target']
            b = box(node)
            if b and area:
                entry['area'] = round(b['w'] * b['h'] / area, 3)
            video = node.find('.//a:videoFile', NS)
            if video is not None:
                link = rels.get(video.get(f'{{{R}}}link'))
                entry['video'] = link['target'] if link else True
            if rel and not rel['external'] and rel['target'] in zf.namelist():
                data = zf.read(rel['target'])
                ext = posixpath.splitext(rel['target'])[1].lower() or '.bin'
                name = f"slide{slide_no:02d}-{len(state['images']) + 1}{ext}"
                media_dir.mkdir(parents=True, exist_ok=True)
                (media_dir / name).write_bytes(data)
                entry['file'] = f'media/{name}'
                entry['sha1'] = hashlib.sha1(data).hexdigest()[:12]
            state['images'].append(entry)
        elif tag == 'graphicFrame':
            tbl = node.find('.//a:tbl', NS)
            if tbl is not None:
                rows = [
                    [' '.join(p['text'] for p in paragraphs(cell.find('a:txBody', NS), rels)) for cell in row.findall('a:tc', NS)]
                    for row in tbl.findall('a:tr', NS)
                ]
                state['tables'].append(rows)


def suggest(index: int, slide: dict) -> str:
    """A first guess at the lab-deck slide kind. Only a starting point: the
    skill tells the writer to overrule it whenever the slide reads otherwise."""
    paras = [p for b in slide['blocks'] for p in b['paragraphs']]
    words = sum(len(p['text'].split()) for p in paras)
    if index == 0:
        return 'title'
    if any(i.get('video') for i in slide['images']):
        return 'video'
    if any(i.get('area', 0) >= 0.4 for i in slide['images']) and words < 30:
        return 'image'
    quoted = any(p['text'].lstrip()[:1] in '“"‘' for p in paras)
    sourced = any(re.match(r'^[—–-]\s*\S', p['text']) for p in paras)
    if quoted and sourced:
        return 'quote'
    if slide['links'] and slide.get('title'):
        return 'demo'
    if not slide.get('title') and 0 < words <= 35 and len(paras) <= 2:
        return 'statement'
    bullets = [p for p in paras if p.get('bullet') in ('char', 'number')]
    if len(bullets) >= 2 or (len(paras) >= 3 and words / max(len(paras), 1) < 14):
        return 'list'
    return 'prose'


def read_deck(path: Path, media_dir: Path) -> dict:
    with zipfile.ZipFile(path) as zf:
        pres = ET.fromstring(zf.read('ppt/presentation.xml'))
        size = pres.find('p:sldSz', NS)
        area = int(size.get('cx')) * int(size.get('cy')) if size is not None else 0
        pres_rels = rels_for(zf, 'ppt/presentation.xml')
        slides = []
        for index, sld_id in enumerate(pres.findall('p:sldIdLst/p:sldId', NS)):
            part = pres_rels[sld_id.get(f'{{{R}}}id')]['target']
            root = ET.fromstring(zf.read(part))
            rels = rels_for(zf, part)
            state = {'title': None, 'title_links': [], 'blocks': [], 'images': [], 'tables': []}
            walk(root.find('p:cSld/p:spTree', NS), rels, zf, index + 1, media_dir, area, state)

            layout = next((r['target'] for r in rels.values() if r['type'] == 'slideLayout'), None)
            layout_name = None
            if layout and layout in zf.namelist():
                c_sld = ET.fromstring(zf.read(layout)).find('p:cSld', NS)
                layout_name = c_sld.get('name') if c_sld is not None else None

            notes = ''
            notes_part = next((r['target'] for r in rels.values() if r['type'] == 'notesSlide'), None)
            if notes_part and notes_part in zf.namelist():
                notes_root = ET.fromstring(zf.read(notes_part))
                for sp in notes_root.iter(f'{{{P}}}sp'):
                    ph = sp.find('p:nvSpPr/p:nvPr/p:ph', NS)
                    if ph is not None and ph.get('type') == 'body':
                        notes = '\n'.join(p['text'] for p in paragraphs(sp.find('p:txBody', NS), {}))

            links = list(state['title_links'])
            for block in state['blocks']:
                for para in block['paragraphs']:
                    links.extend(para.get('links', []))
            links.extend({'text': i['alt'] or 'image', 'url': i['link']} for i in state['images'] if i.get('link'))
            for link in links:
                host = re.sub(r'^https?://([^/]+).*$', r'\1', link['url'])
                if host in SITE_HOSTS or link['url'].startswith('/'):
                    link['site_path'] = re.sub(r'^https?://[^/]+', '', link['url']) or '/'

            slide = {
                'number': index + 1,
                'layout': layout_name,
                'title': state['title'],
                'blocks': state['blocks'],
                'links': links,
                'images': state['images'],
                'tables': state['tables'],
                'notes': notes,
            }
            if root.get('show') == '0':
                slide['hidden'] = True
            sizes = [p['size'] for b in state['blocks'] for p in b['paragraphs'] if 'size' in p]
            if sizes:
                slide['max_font'] = max(sizes)
            slide['suggested_kind'] = suggest(index, slide)
            # What "this slide changed" means: its words, links and pictures.
            # Layout and font size are left out so restyling is not a change.
            basis = json.dumps(
                [slide['title'], [[p['text'], p['level']] for b in slide['blocks'] for p in b['paragraphs']],
                 sorted(l['url'] for l in links), [i.get('sha1') for i in slide['images']], slide['tables'], notes],
                ensure_ascii=False,
            )
            slide['fingerprint'] = hashlib.sha1(basis.encode()).hexdigest()[:12]
            slides.append(slide)
    return {'source': str(path), 'slide_count': len(slides), 'slides': slides}


def label(slide: dict) -> str:
    text = slide.get('title') or next((p['text'] for b in slide['blocks'] for p in b['paragraphs']), '(no text)')
    return f"{slide['number']:>2}. {text[:60]}"


def report_changes(old: dict, new: dict) -> None:
    """Slide-level diff against the last import, so a re-import can be applied
    a slide at a time instead of overwriting edits made in the markdown."""
    a = [s['fingerprint'] for s in old['slides']]
    b = [s['fingerprint'] for s in new['slides']]
    changed = False
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if op == 'equal':
            continue
        changed = True
        if op in ('replace', 'delete'):
            for s in old['slides'][i1:i2]:
                print(f"  - was   {label(s)}")
        if op in ('replace', 'insert'):
            for s in new['slides'][j1:j2]:
                print(f"  + now   {label(s)}")
    if not changed:
        print('  no slides changed since the last import')
        return
    if len(a) != len(b) or any(x != y for x, y in zip(a, b)):
        print('\n  Slide numbers may have shifted. The Nekhen links and the')
        print('  Experiences menu point at slide numbers, so check them.')


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('source', help='Google Slides share link, or a .pptx file')
    ap.add_argument('--name', help='output folder name under work/slides/, e.g. lab-03')
    ap.add_argument('--against', help='a previous deck.json to diff against')
    args = ap.parse_args()

    name = args.name or re.sub(r'[^a-z0-9]+', '-', Path(args.source).stem.lower()).strip('-') or 'deck'
    out = Path('work/slides') / name
    pptx = fetch(args.source, out / f'{name}.pptx')
    media = out / 'media'
    if media.exists():
        for f in media.iterdir():
            f.unlink()
    deck = read_deck(pptx, media)
    out.mkdir(parents=True, exist_ok=True)
    (out / 'deck.json').write_text(json.dumps(deck, indent=2, ensure_ascii=False))

    print(f"{deck['slide_count']} slides -> {out / 'deck.json'}")
    for s in deck['slides']:
        extras = []
        if s['images']:
            extras.append(f"{len(s['images'])} img")
        if s['links']:
            extras.append(f"{len(s['links'])} link")
        if s['notes']:
            extras.append('notes')
        if s.get('hidden'):
            extras.append('HIDDEN')
        print(f"  {label(s):<66} {s['suggested_kind']:<10} {', '.join(extras)}")
    if args.against:
        print(f'\nchanges since {args.against}:')
        report_changes(json.loads(Path(args.against).read_text()), deck)


if __name__ == '__main__':
    main()
