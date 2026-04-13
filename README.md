# Pandaemonium Architecture 6.0

Course site for *Pandaemonium Architecture 6.0* — a reading-driven seminar on AI, machine learning, cybernetics, and their intersection with art and society.

The site hosts the syllabus, week-by-week schedule, and a reader for the course's primary and supplementary texts. Authenticated students get persistent notes, highlights, scroll-position bookmarks, and a Claude-powered chat assistant scoped to the reading they're in.

## Stack

- **SvelteKit 2** + **Svelte 5** (runes) on the **Cloudflare Workers** adapter
- **Cloudflare D1** for users, sessions, notes, highlights, bookmarks, and chat history
- **Cloudflare R2** for PDF storage (bucket: `pandaemonium-pdfs`)
- **Tailwind CSS 4** for styling
- **Anthropic API** (Claude Sonnet) for the in-reader chat assistant
- **`marked`** to render assistant responses

## Layout

```
markdown/                 Reading texts (one .md per reading; subfolder for primary docs)
PDFs/                     Source PDFs uploaded to R2 via scripts/upload-pdfs.sh
migrations/               D1 schema migrations (0001–0004)
scripts/
  generate-readings.js    Bundles markdown/ into src/lib/data/reading-content.ts at build
  upload-pdfs.sh          Pushes PDFs/ to R2
src/
  lib/data/               Syllabus, reading metadata, and generated reading content
  lib/server/auth.ts      Session-cookie auth against the D1 users/sessions tables
  routes/api/             auth, notes, highlights, bookmarks, chat
  routes/reading/[slug]/  The reader UI (notes, highlights, bookmarks, chat panel)
  routes/week/            Per-week views of the syllabus
wrangler.toml             Cloudflare Worker config + D1 binding
```

## Development

```sh
npm install
npm run dev
```

`npm run build` first runs `scripts/generate-readings.js` to inline `markdown/` into `src/lib/data/reading-content.ts`, then builds the Cloudflare Worker bundle.

### Required bindings

`wrangler.toml` declares the D1 binding (`DB`). The chat endpoint also needs an `ANTHROPIC_API_KEY` secret on the deployed Worker:

```sh
npx wrangler secret put ANTHROPIC_API_KEY
```

For local dev against a real D1 instance, run with `wrangler pages dev` or the Cloudflare adapter's local mode and provide the key via `.dev.vars`.

### Migrations

Apply migrations against the configured D1 database:

```sh
npx wrangler d1 migrations apply pandaemonium-db --remote
```

Drop `--remote` to target the local D1 emulator.

### PDFs

Place source PDFs in `PDFs/` and upload to R2:

```sh
./scripts/upload-pdfs.sh
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Generate reading content + build for Cloudflare |
| `npm run preview` | Preview the production build |
| `npm run check` | `svelte-check` against `tsconfig.json` |
| `npm run format` | Prettier write |
| `npm run lint` | Prettier check |

## Deployment

The site deploys as a Cloudflare Worker (custom domain `a211h.yaytso.art`). After `npm run build`:

```sh
npx wrangler deploy
```
