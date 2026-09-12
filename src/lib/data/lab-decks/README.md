# Lab decks

One markdown file per lab: `lab-01.md`, `lab-02.md`, … Edit the file, save,
and the deck at `/lab/<number>` updates (instantly in dev; on deploy in
production). A new lab is a new file — it appears on `/lab` and the week page
automatically.

## File shape

Front matter, then slides separated by `---` lines. Every slide starts with a
kind marker.

```
---
number: 2
title: Shoggoth with a Smiley Face
stance: Apparatus
blurb: One line shown on the lab index and the week page.
---

@title
eyebrow: Lab 02 · September 21
# Shoggoth with a Smiley Face

Optional subtitle paragraph.

---

@statement
One big sentence, set large.
note: Optional small line under it.

---

@prose
## Optional heading

A paragraph. Blank lines separate paragraphs; a single line break inside a
paragraph is just a wrap.

Another paragraph.

---

@list
## Optional heading

1. Numbered items render numbered.
- Dashed items render undashed. Use one style per slide.

---

@quote
> The quoted text.
— Who said it, where

---

@image
![alt text](/path/or/url.png)
caption: Optional caption.

---

@video
![what the clip shows](/path/to/clip.mp4)
caption: Optional caption. Plays muted, looping, with controls.

---

@demo
## Heading

Optional body paragraph above the button.

[Button label](/life)

1. Steps to do with the thing while it is open.
2. Another step.

---

@prompt
## Make this

Optional body paragraph.

- What they make, itemized.
deliverable: Optional closing line (how it is turned in).
```

## Interactivity

A `@demo` slide's link is the interactivity. Site pages (`/monty-hall`,
`/life`, `/loops`, `/voices`) open in the same tab and get a back link that
returns to the exact slide; external links (Golly, Wotja) open a new tab.
Don't add `?lab=…` yourself — the deck appends it.

## Gotchas

- Slides are plain text: markdown emphasis like `*this*` is NOT rendered.
- A line that is exactly `---` always starts a new slide.
- Lines starting with `## `, `> `, `— `, `- `, `1. `, `[label](url)`,
  `![alt](src)`, or `note:`/`eyebrow:`/`caption:`/`deliverable:` are
  structure; anything else is paragraph text.
