# Lab decks from Google Slides

Spec a lab in Google Slides, then run `/import-slides lab-NN <link>` in Claude
Code. The steps Claude follows are in `.claude/skills/import-slides/SKILL.md`;
the extraction is `scripts/import-slides.py`.

**Sharing.** Set the deck to "anyone with the link can view" and paste the link.
For a private deck, use File > Download > Microsoft PowerPoint and pass the file.

**What helps the import, none of it required:**

| To get | Do this in Slides |
|---|---|
| Title card | Make it the first slide |
| A big single sentence | A text box with no title |
| Reading-voice slide | Title plus sentences |
| Bullets or steps | Title plus a bulleted or numbered list |
| Demo slide | Link some text to the page (`https://atek639.calarts.app/denoise`) and list the steps under it |
| Quotation | The quote in quotation marks, then a line starting with a dash and the source |
| Picture slide | Make the picture large; any text becomes the caption. Add alt text (right click > Alt text) |
| Student task | Title it "Your turn" or similar |
| Notes for yourself | Speaker notes. They go to `lab-NN-notes.md`, never to students |
| Leave a slide out | Skip it (right click > Skip slide) |

**Changing the deck later.** Run the import again. Claude compares against the
`*.deck.json` snapshot in this folder and shows only the slides that changed, so
edits made in the markdown are not overwritten.
