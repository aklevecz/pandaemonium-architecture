#!/usr/bin/env python3
"""Checks scripts/import-slides.py against a small hand-built .pptx shaped
like a Google Slides export: placeholders, bullets, a linked demo, a bare
statement, a quotation, a full-bleed picture, speaker notes, a hidden slide.

    python3 scripts/test_import_slides.py
"""

import base64
import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location('import_slides', Path(__file__).with_name('import-slides.py'))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

NSDECL = (
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
)
RELNS = 'http://schemas.openxmlformats.org/package/2006/relationships'
OFFICE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PNG = base64.b64decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
)
W, H = 9144000, 5143500


def para(text, bullet=None, lvl=0, link=None, size=None):
    ppr = f'<a:pPr lvl="{lvl}">' + {None: '', 'char': '<a:buChar char="●"/>', 'number': '<a:buAutoNum type="arabicPeriod"/>', 'none': '<a:buNone/>'}[bullet] + '</a:pPr>'
    rpr = '<a:rPr lang="en"' + (f' sz="{size * 100}"' if size else '') + '>' + (f'<a:hlinkClick r:id="{link}"/>' if link else '') + '</a:rPr>'
    return f'<a:p>{ppr}<a:r>{rpr}<a:t>{text}</a:t></a:r></a:p>'


def shape(ph, paras, idx=1):
    nv = f'<p:nvPr><p:ph type="{ph}" idx="{idx}"/></p:nvPr>' if ph else '<p:nvPr/>'
    return f'<p:sp><p:nvSpPr><p:cNvPr id="{idx + 1}" name="s"/><p:cNvSpPr/>{nv}</p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/>{"".join(paras)}</p:txBody></p:sp>'


def picture(rid, w, h, alt):
    return (
        f'<p:pic><p:nvPicPr><p:cNvPr id="9" name="pic" descr="{alt}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>'
        f'<p:blipFill><a:blip r:embed="{rid}"/></p:blipFill>'
        f'<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{w}" cy="{h}"/></a:xfrm></p:spPr></p:pic>'
    )


def slide_xml(shapes, hidden=False):
    show = ' show="0"' if hidden else ''
    return f'<p:sld {NSDECL}{show}><p:cSld><p:spTree>{"".join(shapes)}</p:spTree></p:cSld></p:sld>'


def rels_xml(entries):
    body = ''.join(
        f'<Relationship Id="{rid}" Type="{OFFICE}/{kind}" Target="{target}"' + (' TargetMode="External"' if ext else '') + '/>'
        for rid, kind, target, ext in entries
    )
    return f'<Relationships xmlns="{RELNS}">{body}</Relationships>'


def build(path, slides):
    """slides: list of (shapes, extra_rels, notes_text, hidden)."""
    with zipfile.ZipFile(path, 'w') as zf:
        ids = ''.join(f'<p:sldId id="{256 + i}" r:id="rId{i + 1}"/>' for i in range(len(slides)))
        zf.writestr('ppt/presentation.xml', f'<p:presentation {NSDECL}><p:sldIdLst>{ids}</p:sldIdLst><p:sldSz cx="{W}" cy="{H}"/></p:presentation>')
        zf.writestr('ppt/_rels/presentation.xml.rels', rels_xml([(f'rId{i + 1}', 'slide', f'slides/slide{i + 1}.xml', False) for i in range(len(slides))]))
        zf.writestr('ppt/slideLayouts/slideLayout1.xml', f'<p:sldLayout {NSDECL}><p:cSld name="TITLE_AND_BODY"><p:spTree/></p:cSld></p:sldLayout>')
        zf.writestr('ppt/media/image1.png', PNG)
        for i, (shapes, extra, notes, hidden) in enumerate(slides, 1):
            zf.writestr(f'ppt/slides/slide{i}.xml', slide_xml(shapes, hidden))
            entries = [('rIdL', 'slideLayout', '../slideLayouts/slideLayout1.xml', False)] + extra
            if notes:
                entries.append(('rIdN', 'notesSlide', f'../notesSlides/notesSlide{i}.xml', False))
                zf.writestr(f'ppt/notesSlides/notesSlide{i}.xml', f'<p:notes {NSDECL}><p:cSld><p:spTree>{shape("body", [para(notes)])}</p:spTree></p:cSld></p:notes>')
            zf.writestr(f'ppt/slides/_rels/slide{i}.xml.rels', rels_xml(entries))


def fixture(second_bullet='Style as a statistical fingerprint', extra_slide=False):
    slides = [
        ([shape('ctrTitle', [para('Fitting frequencies')]), shape('subTitle', [para('Color, style, LoRAs')], 2)], [], 'Open with the Iman Malik piece.', False),
        ([shape('title', [para('What a model sees')]), shape('body', [para('Pixels as numbers', 'char'), para(second_bullet, 'char'), para('Texture before shape', 'char', lvl=1)], 2)], [], '', False),
        ([shape('title', [para('Denoise')]), shape('body', [para('Open the board', link='rIdH'), para('Move the slider right', 'number'), para('Press Generate', 'number')], 2)],
         [('rIdH', 'hyperlink', 'https://atek639.calarts.app/denoise?lab=3', True)], '', False),
        ([shape(None, [para('A style is a distribution you can sample from.', size=40)])], [], '', False),
        ([shape('body', [para('“The medium is the message.”'), para('— Marshall McLuhan, Understanding Media')], 2)], [], '', False),
        ([picture('rIdP', W, int(H * 0.8), 'A LoRA training curve'), shape(None, [para('Loss over 2,000 steps')])], [('rIdP', 'image', '../media/image1.png', False)], '', False),
        ([shape('title', [para('Cut for time')]), shape('body', [para('Not shown in the room.')], 2)], [], '', True),
    ]
    if extra_slide:
        slides.insert(2, ([shape('title', [para('A new slide')]), shape('body', [para('Added after the first import, in plain sentences that run on a little.')], 2)], [], '', False))
    return slides


class ImportSlides(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.pptx = self.tmp / 'lab-03.pptx'
        build(self.pptx, fixture())
        self.deck = mod.read_deck(self.pptx, self.tmp / 'media')

    def test_kinds(self):
        kinds = [s['suggested_kind'] for s in self.deck['slides']]
        self.assertEqual(kinds, ['title', 'list', 'demo', 'statement', 'quote', 'image', 'prose'])

    def test_title_notes_layout(self):
        first = self.deck['slides'][0]
        self.assertEqual(first['title'], 'Fitting frequencies')
        self.assertEqual(first['blocks'][0]['role'], 'subTitle')
        self.assertEqual(first['notes'], 'Open with the Iman Malik piece.')
        self.assertEqual(first['layout'], 'TITLE_AND_BODY')

    def test_bullets_and_levels(self):
        paras = self.deck['slides'][1]['blocks'][0]['paragraphs']
        self.assertEqual([p['bullet'] for p in paras], ['char', 'char', 'char'])
        self.assertEqual(paras[2]['level'], 1)

    def test_site_link_becomes_a_path(self):
        link = self.deck['slides'][2]['links'][0]
        self.assertEqual(link['text'], 'Open the board')
        self.assertEqual(link['site_path'], '/denoise?lab=3')
        steps = [p for p in self.deck['slides'][2]['blocks'][0]['paragraphs'] if p.get('bullet') == 'number']
        self.assertEqual(len(steps), 2)

    def test_image_is_saved_and_measured(self):
        image = self.deck['slides'][5]['images'][0]
        self.assertEqual(image['alt'], 'A LoRA training curve')
        self.assertAlmostEqual(image['area'], 0.8, places=2)
        self.assertTrue((self.tmp / image['file']).exists())

    def test_hidden_slide_is_flagged(self):
        self.assertTrue(self.deck['slides'][6].get('hidden'))
        self.assertNotIn('hidden', self.deck['slides'][0])

    def test_reimport_reports_only_what_changed(self):
        again = self.tmp / 'again.pptx'
        build(again, fixture(second_bullet='Style as a fingerprint', extra_slide=True))
        new = mod.read_deck(again, self.tmp / 'media2')
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            mod.report_changes(self.deck, new)
        text = out.getvalue()
        self.assertIn('What a model sees', text)
        self.assertIn('A new slide', text)
        self.assertNotIn('Denoise', text)
        self.assertIn('Slide numbers may have shifted', text)
        same = io.StringIO()
        with contextlib.redirect_stdout(same):
            mod.report_changes(self.deck, json.loads(json.dumps(self.deck)))
        self.assertIn('no slides changed', same.getvalue())


if __name__ == '__main__':
    unittest.main(verbosity=1)
