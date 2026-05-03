# Pandaemonium Architecture 6.0

Course site for *Pandaemonium Architecture 6.0* (ATEK-639/439, Fall 2025) — a reading-driven seminar on AI, machine learning, cybernetics, and their intersection with art and society.

The site hosts the syllabus, week-by-week schedule, and a reader for the course's primary and supplementary texts. Authenticated students get persistent notes, highlights, scroll-position bookmarks, and a Claude-powered chat assistant scoped to the reading they're in.

## Stack

- **SvelteKit 2** + **Svelte 5** (runes) on the **Cloudflare Workers** adapter (`@sveltejs/adapter-cloudflare`)
- **Cloudflare D1** for users, sessions, notes, highlights, bookmarks, and chat history
- **Cloudflare R2** for PDF storage (bucket: `pandaemonium-pdfs`)
- **Tailwind CSS 4** for styling
- **Anthropic API** (`claude-sonnet-4-20250514`) for the in-reader chat assistant
- **`marked`** to render assistant responses

## Layout

```
markdown/                                    Reading texts (one .md per reading)
  additional_reading_primary_documents/      Primary-source supplementary texts
PDFs/                                        Source PDFs uploaded to R2 via scripts/upload-pdfs.sh
migrations/                                  D1 schema migrations (0001–0004)
scripts/
  generate-readings.js                       Bundles markdown/ into src/lib/data/reading-content.ts at build
  upload-pdfs.sh                             Pushes PDFs/ to R2 (bucket: pandaemonium-pdfs)
src/
  hooks.server.ts                            Resolves session cookie -> event.locals.user
  lib/data/
    syllabus.ts                              Course info, weeks, readings (typed)
    readings.ts                              Reading metadata helpers
    reading-content.ts                       Auto-generated from markdown/ (do not edit)
  lib/server/auth.ts                         PBKDF2 password hashing + session-id generation
  lib/utils/slug.ts                          Filename -> slug (matches generate-readings.js)
  routes/api/
    auth/                                    POST {action: signup|login|logout, email, password}
    notes/                                   CRUD personal notes per reading slug
    highlights/                              CRUD text highlights per reading slug
    bookmarks/                               Scroll-position bookmark per reading slug
    chat/                                    Claude-backed chat scoped to a reading
  routes/reading/[slug]/                     The reader UI (notes, highlights, bookmarks, chat panel)
  routes/readings/                           Reading index
  routes/week/[num]/                         Per-week views of the syllabus
  routes/login/                              Auth page
lab-planning/                                TA-only planning notes for the lab portion (not user-facing)
wrangler.toml                                Worker config + D1 binding (DB) + custom domain route
```

`lab-planning/` is internal planning by the TA — reading digests, lab arc, conceptual frame. It's not served by the site and is not part of the course-facing material yet. See `lab-planning/README.md`.

## Database schema (D1)

Migrations live in `migrations/` and are applied in order (`0001_init` → `0004_conversations`):

| Table | Purpose |
| --- | --- |
| `users` | `id`, `email` (unique), `password_hash` (PBKDF2-SHA256, 100k iters, 16-byte salt) |
| `sessions` | `id` (32-byte hex), `user_id`, `expires_at` — 30-day cookie sessions |
| `notes` | One row per note: `(user_id, reading_slug, content)` |
| `highlights` | Per-reading text highlights, keyed by `(user_id, reading_slug)` |
| `bookmarks` | Scroll-position bookmark per `(user_id, reading_slug)` |
| `conversations` + `messages` | Chat history; conversations scoped to `(user_id, reading_slug)` with cascading message rows |

Auth is handled in `hooks.server.ts`: a session cookie is exchanged for `event.locals.user = { id, email }` on every request. API routes return 401 if `locals.user` is unset.

## Development

```sh
npm install
npm run dev
```

`npm run build` first runs `scripts/generate-readings.js` (which inlines `markdown/` into `src/lib/data/reading-content.ts`), then builds the Cloudflare Worker bundle.

### Local D1 + secrets

`@sveltejs/adapter-cloudflare` v7 wires `wrangler.toml` bindings into Vite dev via `getPlatformProxy`, so `npm run dev` exposes `platform.env.DB` against the local D1 emulator without `wrangler pages dev`.

For the chat endpoint, put the API key in `.dev.vars` at the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

For deployed Workers, set the secret via wrangler:

```sh
npx wrangler secret put ANTHROPIC_API_KEY
```

### Migrations

```sh
# Local emulator
npx wrangler d1 migrations apply pandaemonium-db

# Remote (production)
npx wrangler d1 migrations apply pandaemonium-db --remote
```

### PDFs

Place source PDFs in `PDFs/` (subdirectories are preserved as object keys) and upload to R2:

```sh
./scripts/upload-pdfs.sh
```

The site references PDFs by their R2 object key; the bucket is `pandaemonium-pdfs`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server (with D1 emulator wired via the Cloudflare adapter) |
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
