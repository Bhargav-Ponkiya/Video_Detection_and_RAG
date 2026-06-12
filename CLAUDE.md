# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this project is

A single monorepo with **two independent features**, built as an interview project:

1. **Camera Monitor** (`client/src/features/camera`) — a 4-camera surveillance wall.
   Real object detection runs **in the browser** via TensorFlow.js COCO-SSD:
   `person` → 🔴 red alert, animals/birds → 🟡 yellow alert, otherwise ✅ green.
   Three "Simulate" buttons force alert states for the demo and as a fallback.
   **This feature does not call the backend.**

2. **Document RAG** (`client/src/features/rag` + the whole `server/`) — upload
   PDF/TXT/MD, the server chunks + embeds with Gemini, stores vectors in Postgres
   (`pgvector`), and answers questions with cited sources.

`ARCHITECTURE.md` is the contract between client and server. **Read it before
changing any API, schema, or detection logic, and keep it in sync with code.**

## Layout

- `client/` — React + Vite + Tailwind. Deploys to Vercel.
- `server/` — Node + Express. Deploys to Render.
- DB — Postgres + pgvector: local Docker (`docker compose up -d`) for dev; Supabase or Neon (free tier) for deploy.

## Commands

```bash
# database (local dev) — from repo root
docker compose up -d                          # Postgres + pgvector on :5433

# server
cd server && npm install && npm run dev       # nodemon on :8081
cd server && npm start                        # production
cd server && npm run db:migrate               # apply tracked migrations to $DATABASE_URL

# client
cd client && npm install && npm run dev       # vite on :5173
cd client && npm run build                    # production build → dist/
```

## Conventions & constraints

- **Free tier only.** No paid services. No API keys baked into the client. The only
  secret is `GEMINI_API_KEY`, server-side. Detection is free/local by design.
- **Keep the camera feature server-independent** so it always works in the demo.
- **Gemini via REST `fetch`**, not an SDK — avoids SDK version churn. See
  `server/src/services/gemini.js`.
- Embedding dimension is **768** — `gemini-embedding-001` requested with `outputDimensionality: 768`.
  If you change the embed model/dim, update `vector(768)` in `server/src/db/migrations/0001_init.sql` to match.
- Schema changes go in a **new** `server/src/db/migrations/NNNN_*.sql` file (applied in
  order by `npm run db:migrate`, tracked in the `schema_migrations` table) — never edit
  an already-applied migration.
- Respect free-tier rate limits: embed with bounded concurrency + 429 backoff.
- Styling is Tailwind utility classes; prefer composing small components over CSS files.
- Secrets live in `.env` (git-ignored). `*.env.example` files document required vars.

## Gotchas

- Free DB/web tiers **sleep when idle** → first RAG request after a pause is slow. This
  is expected; the camera page is unaffected.
- `gemini-embedding-001` is requested at 768 dims (`outputDimensionality`); a mismatched `vector(N)` errors on insert.
- Free-tier model quotas vary by API key: `gemini-2.0-flash` may return 429 `limit: 0`. The chat model is
  configurable via `GEMINI_CHAT_MODEL` (default `gemini-2.5-flash`); list available models at `/v1beta/models`.
- COCO-SSD's first inference is slow (model download + warmup). Show a "loading model"
  state on each camera tile.
- CORS: server allows origins from `CLIENT_ORIGIN` (comma-separated).
- DB SSL is auto-resolved in `config.js`: off for localhost, on (`rejectUnauthorized:false`)
  for remote hosts. Override with `DATABASE_SSL=true|false`. Forcing SSL on local
  Postgres throws "does not support SSL connections".
