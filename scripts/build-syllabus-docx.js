#!/usr/bin/env node
// Generates a printable/editable .docx of the syllabus straight from
// src/lib/data/syllabus.ts, so the document can't drift from the site.
//
// The Lab line for each week is deliberately set apart (shaded, labelled) —
// that's the field that gets edited by hand each term.
//
// Usage: node scripts/build-syllabus-docx.js [outPath]

import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
	Document,
	Packer,
	Paragraph,
	TextRun,
	HeadingLevel,
	AlignmentType,
	BorderStyle,
	ShadingType,
	PageBreak,
	convertInchesToTwip
} from 'docx';
import { courseInfo, introductoryReadings, weeks } from '../src/lib/data/syllabus.ts';

const SERIF = 'Georgia';
const SANS = 'Calibri';
const INK = '1A1A1A';
const MUTED = '5A5A5A';
const RULE = 'BBBBBB';
const LAB_FILL = 'F2F2F2';

// A label like "TOPICS" — small, spaced capitals, sans.
function label(text) {
	return new Paragraph({
		spacing: { before: 220, after: 60 },
		children: [
			new TextRun({
				text: text.toUpperCase(),
				font: SANS,
				size: 16, // half-points → 8pt
				bold: true,
				characterSpacing: 30,
				color: MUTED
			})
		]
	});
}

function body(text, opts = {}) {
	return new Paragraph({
		spacing: { after: opts.after ?? 120, line: 276 },
		indent: opts.indent ? { left: convertInchesToTwip(0.25) } : undefined,
		children: [
			new TextRun({
				text,
				font: opts.font ?? SERIF,
				size: opts.size ?? 21, // 10.5pt
				italics: opts.italics ?? false,
				color: opts.color ?? INK
			})
		]
	});
}

function rule(before = 0, after = 0) {
	return new Paragraph({
		spacing: { before, after },
		border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 1 } },
		children: []
	});
}

// "Author, Title" with the title italicised.
function readingLine(r) {
	return new Paragraph({
		spacing: { after: 80, line: 264 },
		indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.25) },
		children: [
			new TextRun({ text: `${r.author}, `, font: SERIF, size: 21, color: INK }),
			new TextRun({ text: r.title, font: SERIF, size: 21, italics: true, color: INK })
		]
	});
}

// The lab is drafted by hand each term, so this is a writing area rather than
// a caption: label on its own line, the current text below it, then blank
// ruled lines to type into. Consecutive paragraphs carrying identical borders
// and shading render as one continuous box in Word, which is what gives the
// block its height.
const LAB_EDGES = {
	top: { style: BorderStyle.SINGLE, size: 2, color: RULE, space: 10 },
	bottom: { style: BorderStyle.SINGLE, size: 2, color: RULE, space: 10 },
	left: { style: BorderStyle.SINGLE, size: 2, color: RULE, space: 12 },
	right: { style: BorderStyle.SINGLE, size: 2, color: RULE, space: 12 }
};
const LAB_SHADE = { type: ShadingType.CLEAR, fill: LAB_FILL, color: 'auto' };

// Blank lines to write into. Four lines ≈ 1in of usable space per week.
const LAB_BLANK_LINES = 4;

function labBlock(text) {
	const paras = [
		new Paragraph({
			spacing: { before: 140, after: 100, line: 264 },
			shading: LAB_SHADE,
			border: LAB_EDGES,
			children: [
				new TextRun({
					text: 'LAB',
					font: SANS,
					size: 16,
					bold: true,
					characterSpacing: 30,
					color: MUTED
				})
			]
		}),
		new Paragraph({
			spacing: { after: 120, line: 300 },
			shading: LAB_SHADE,
			border: LAB_EDGES,
			children: [new TextRun({ text, font: SERIF, size: 21, color: INK })]
		})
	];

	for (let i = 0; i < LAB_BLANK_LINES; i++) {
		paras.push(
			new Paragraph({
				spacing: { after: i === LAB_BLANK_LINES - 1 ? 160 : 40, line: 300 },
				shading: LAB_SHADE,
				border: LAB_EDGES,
				children: [new TextRun({ text: '', font: SERIF, size: 21 })]
			})
		);
	}

	return paras;
}

const children = [];

// ---- Cover ----------------------------------------------------------------
children.push(
	new Paragraph({
		spacing: { after: 60 },
		children: [
			new TextRun({
				text: courseInfo.title,
				font: SERIF,
				size: 40, // 20pt
				bold: true,
				color: INK
			})
		]
	}),
	new Paragraph({
		spacing: { after: 240 },
		children: [
			new TextRun({
				text: `${courseInfo.code}  ·  ${courseInfo.semester}`,
				font: SANS,
				size: 20,
				characterSpacing: 20,
				color: MUTED
			})
		]
	}),
	body(courseInfo.instructor, { font: SANS, size: 21, after: 20 }),
	body(`Labs: ${courseInfo.labs}`, { font: SANS, size: 21, after: 20 }),
	body(courseInfo.schedule, { font: SANS, size: 21, after: 240 }),
	rule(0, 240)
);

for (const e of courseInfo.epigraphs) {
	children.push(
		body(`“${e.text}”`, { italics: true, indent: true, after: 40 }),
		body(`— ${e.source}`, { font: SANS, size: 18, color: MUTED, indent: true, after: 200 })
	);
}

children.push(rule(120, 240), label('Course Description'), body(courseInfo.description));

children.push(label('Introductory Reading'));
for (const r of introductoryReadings) children.push(readingLine(r));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ---- Weeks ----------------------------------------------------------------
for (const w of weeks) {
	children.push(
		new Paragraph({
			heading: HeadingLevel.HEADING_1,
			spacing: { before: 320, after: 60 },
			children: [
				new TextRun({
					text: `${String(w.number).padStart(2, '0')}   ${w.date}`,
					font: SANS,
					size: 18,
					bold: true,
					characterSpacing: 30,
					color: MUTED
				})
			]
		}),
		new Paragraph({
			spacing: { after: 100 },
			children: [
				new TextRun({ text: w.title, font: SERIF, size: 30, bold: true, color: INK })
			]
		})
	);

	if (w.epigraph) {
		children.push(
			body(`“${w.epigraph.text}”`, { italics: true, indent: true, after: 40 }),
			body(`— ${w.epigraph.source}`, {
				font: SANS,
				size: 18,
				color: MUTED,
				indent: true,
				after: 140
			})
		);
	}

	children.push(label('Topics'), body(w.topics));

	if (w.readings.length) {
		children.push(label('Readings'));
		for (const r of w.readings) children.push(readingLine(r));
	}

	if (w.additionalReadings.length) {
		children.push(label('Additional Reading / Primary Documents'));
		for (const r of w.additionalReadings) children.push(readingLine(r));
	}

	children.push(...labBlock(w.lab));

	// The term's one holiday falls between the week 4 and week 5 meetings.
	if (w.number === 4) {
		children.push(
			body('October 12 — No class (Indigenous People’s Day)', {
				font: SANS,
				size: 20,
				italics: true,
				color: MUTED,
				after: 200
			})
		);
	}
}

const doc = new Document({
	creator: courseInfo.instructor,
	title: `${courseInfo.title} — ${courseInfo.code} — ${courseInfo.semester}`,
	description: 'Course syllabus',
	styles: {
		default: {
			document: { run: { font: SERIF, size: 21, color: INK } }
		}
	},
	sections: [
		{
			properties: {
				page: {
					size: { width: 12240, height: 15840 }, // US Letter, DXA
					margin: {
						top: convertInchesToTwip(0.9),
						bottom: convertInchesToTwip(0.9),
						left: convertInchesToTwip(1),
						right: convertInchesToTwip(1)
					}
				}
			},
			children
		}
	]
});

const args = process.argv.slice(2);
const out =
	args.find((a) => !a.startsWith('--')) ??
	join(process.cwd(), 'lab-planning', `Pandaemonium-Architecture-6.0-Syllabus-Fall-2026.docx`);

// This document gets hand-edited (the Lab lines are drafted in Word), so a
// re-run must not silently destroy that work. Overwriting is opt-in.
if (existsSync(out) && !args.includes('--force')) {
	console.error(`Refusing to overwrite an existing file:\n  ${out}`);
	console.error(
		'\nIf you have hand-edited it, move it aside first — regenerating discards those edits.'
	);
	console.error('Otherwise re-run with --force.');
	process.exit(1);
}

const buf = await Packer.toBuffer(doc);
writeFileSync(out, buf);
console.log(`Wrote ${out} (${(buf.length / 1024).toFixed(0)} KB, ${weeks.length} weeks)`);
