# Pandaemonium Architecture 6.0

Lab 01 and its demos have an **Experiences** menu connecting the slides, local experiments, and Nekhen classroom. Navigation preserves the originating slide and classroom ID. Local previews link ports 5180 and 3010; published links use the configured course domains and `nekhen.toolofna.ai`. `src/lib/experience-links.ts` is mirrored in Nekhen’s independently built `src/lib/next-word/experience-links.ts`; keep both copies in sync. Run `npm run test:experiences` to check cross-app navigation and URL validation.

Course site for *Pandaemonium Architecture 6.0* (ATEK-639/439, Fall 2026) — a reading-driven seminar on AI, machine learning, cybernetics, and their intersection with art and society.

The site hosts the syllabus, week-by-week schedule, and a reader for the course's primary and supplementary texts. Authenticated students get persistent notes, highlights, scroll-position bookmarks, and a Claude-powered chat assistant scoped to the reading they're in.

Signed-in students can open **Notebook** (`/notebook`) to search their notes,
highlights, vocabulary, and full conversations across readings. Filters by type
and reading are preserved in the URL. Markdown exports contain all matching
entries (including complete conversations and source links), not just the visible
batch. The notebook uses existing tables and requires no database migration.

Signed-in students also have the **Commons** (`/commons`): a class-wide feed of
highlights students chose to share, grouped by week, with replies under each
one. Sharing is per highlight and opt-in (tap a highlight in the reader and
choose Share); the first share asks for a display name. Each week page shows
that week's latest shares. Explain requests stay private and count-only on the
instructor's Activity page. Run `npm run test:commons` to check the privacy
boundary, share toggle, comment rules, and page load.

Run `npm run test:notebook-chat` on Node 22.13+ to check notebook isolation,
search/export, chat ownership, and safe Markdown rendering. The tests use an
in-memory SQLite database with synthetic accounts and a mocked model response;
they do not call external services.

## Stack

- **SvelteKit 2** + **Svelte 5** (runes) on the **Cloudflare Workers** adapter (`@sveltejs/adapter-cloudflare`)
- **Cloudflare D1** for users, sessions, notes, highlights, bookmarks, and chat history
- **Cloudflare R2** for PDF storage (bucket: `pandaemonium-pdfs`)
- **Tailwind CSS 4** for styling
- **Anthropic API** (`claude-sonnet-4-6`) for the in-reader chat assistant
- **`marked`** to render assistant responses

## Layout

```
markdown/                                    Reading texts (one .md per reading)
  additional_reading_primary_documents/      Primary-source supplementary texts
PDFs/                                        Source PDFs uploaded to R2 via scripts/upload-pdfs.sh
migrations/                                  D1 schema migrations (0001–0013)
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
    highlights/                              CRUD text highlights per reading slug (+ share toggle)
    comments/                                Replies under shared highlights
    profile/                                 Display name shown in the Commons
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

The site deploys as a Cloudflare Worker, served on two custom domains —
`atek639.calarts.app` (course-facing) and `a211h.yaytso.art` (original). Both
point at the same Worker; session cookies are host-scoped, so a login on one
doesn't carry to the other. After `npm run build`:

```sh
npx wrangler deploy
```
