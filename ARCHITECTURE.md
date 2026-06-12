# Architecture

This document is the **single source of truth** for the contract between the
client and the server. Both apps are implemented against it.

## 1. Overview

A single monorepo delivers two features that share one React app and one Express API:

| #   | Feature                                                                      | Where the work happens                             |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | **Camera Monitor** — 4-camera surveillance wall with real-time threat alerts | 100% client-side (browser). No server, no API key. |
| 2   | **Document RAG** — upload documents, ask questions, get cited answers        | Client UI + Express API + Gemini + pgvector        |

```
                         ┌─────────────────────────────────────────┐
                         │              CLIENT (Vercel)             │
                         │  React + Vite + Tailwind                 │
                         │                                          │
   ┌─────────────┐       │  /monitor  ── TensorFlow.js (COCO-SSD)   │
   │  Browser /  │◀──────┤             runs in-browser on <video>   │
   │   Webcam    │       │             → person/animal → alerts     │
   └─────────────┘       │                                          │
                         │  /rag      ── upload + chat UI ──────────┼──┐
                         └─────────────────────────────────────────┘  │
                                                                       │ HTTPS / JSON
                         ┌─────────────────────────────────────────┐  │
                         │              SERVER (Render)             │◀─┘
                         │  Node + Express                          │
                         │   • POST /api/documents  (ingest)        │
                         │   • POST /api/chat        (RAG answer)   │
                         │                                          │
                         │   ┌─────────────┐   ┌──────────────────┐ │
                         │   │ Gemini REST │   │ Postgres+pgvector│ │
                         │   │  embed+chat │   │  (Supabase/Neon) │ │
                         │   └─────────────┘   └──────────────────┘ │
                         └─────────────────────────────────────────┘
```

**Design principle:** the Camera Monitor never touches the server, so it works even
if the API is asleep (free tiers sleep on idle). The RAG feature is the only thing
that needs the backend.

## 2. Tech stack

| Layer            | Choice                                                    | Why this one (free tier)                                   |
| ---------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| Client framework | React 18 + Vite                                           | Fast, standard, deploys free on Vercel                     |
| Styling          | Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first `@theme`) | Rapid, consistent, "beautiful UI" requirement              |
| Detection        | `@tensorflow-models/coco-ssd` + `@tensorflow/tfjs`        | Real ML in the browser, **no API/key/cost**, no rate limit |
| Routing          | `react-router-dom`                                        | Two pages: monitor + rag                                   |
| Server           | Node 18+ + Express                                        | Simplest free deploy on Render                             |
| LLM + embeddings | Gemini REST API (`fetch`)                                 | Free tier; REST avoids SDK version churn                   |
| Vector store     | Postgres + `pgvector`                                     | Free on Supabase / Neon                                    |
| PDF parsing      | `pdf-parse`                                               | Pure JS, no native deps                                    |
| Uploads          | `multer` (memory storage)                                 | Simple, no disk needed                                     |

## 3. Repository layout

```
Camera_RAG/
├── CLAUDE.md            # guidance for AI assistants working in this repo
├── ARCHITECTURE.md      # this file — the contract
├── INSTRUCTION.md       # setup, run, deploy, demo-recording steps
├── README.md            # short project intro
├── .gitignore
├── docker-compose.yml   # local Postgres + pgvector for dev/testing
├── client/              # React app (deploy: Vercel)
└── server/              # Express API (deploy: Render)
```

See each app's section below for its internal file tree.

## 4. Detection logic (client-side, Feature 1)

COCO-SSD returns predictions: `[{ class: string, score: number, bbox: [x,y,w,h] }]`.

Alert severity is derived from the highest-priority class detected above the score
threshold (default `0.6`):

```
PERSON_CLASSES = ["person"]
ANIMAL_CLASSES = ["bird","cat","dog","horse","sheep","cow",
                  "elephant","bear","zebra","giraffe"]

if any prediction.class in PERSON_CLASSES  → severity = "RED"     (Human detected)
else if any prediction.class in ANIMAL_CLASSES → severity = "YELLOW" (Animal/bird detected)
else                                        → severity = "GREEN"   (All clear)
```

- **RED** = 🔴 Human detected → red border, pulsing badge, sound/log entry.
- **YELLOW** = 🟡 Animal/bird detected → amber border, badge.
- **GREEN** = ✅ Normal → subtle green/neutral border.

**Simulation buttons** (always available, for the demo and as a fallback if the model
can't load): three buttons — "Simulate Human", "Simulate Animal", "Normal" — that
force a camera card into the matching severity for a few seconds. They drive the exact
same alert UI/log path as real detection.

**Camera sources:** 4 camera tiles. By default each plays a looping local video from
`client/public/cameras/` (placeholders committed). One tile can optionally bind to the
real webcam (`getUserMedia`) so detection can be demoed live. The model runs a
detection pass on each playing tile on an interval (~600ms) via `requestAnimationFrame`-
throttled loop.

## 5. RAG pipeline (Feature 2)

**Ingest** (`POST /api/documents`):

1. Receive file (multer memory storage). Accept `.pdf`, `.txt`, `.md`.
2. Extract text (`pdf-parse` for PDF, UTF-8 read otherwise).
3. Chunk: ~1000 chars with ~150 char overlap, split on paragraph/sentence bounds.
4. Embed each chunk with Gemini `gemini-embedding-001`, `taskType=RETRIEVAL_DOCUMENT`.
5. Insert `documents` row + one `chunks` row per chunk (with `vector(768)` embedding).

**Query** (`POST /api/chat`):

1. Embed the question with `gemini-embedding-001`, `taskType=RETRIEVAL_QUERY`.
2. Vector search: top-K (default 5) chunks by cosine distance (`<=>`), optionally
   filtered by `documentId`.
3. Build a grounded prompt: system instruction + retrieved context + question.
4. Call `gemini-2.5-flash` `generateContent`.
5. Return the answer plus the source chunks used.

## 6. API contract

Base URL = `${VITE_API_URL}` on the client. All responses are JSON. Errors use
`{ "error": "message" }` with an appropriate HTTP status.

### `GET /api/health`

→ `200 { "status": "ok", "db": true, "gemini": true }`

### `POST /api/documents` (multipart/form-data)

Field: `file` (single).
→ `201 { "id": "uuid", "filename": "report.pdf", "numChunks": 12, "mimeType": "application/pdf" }`
Errors: `400` unsupported type / empty, `500` ingest failure.

### `GET /api/documents`

→ `200 { "documents": [ { "id","filename","numChunks","createdAt" } ] }`

### `DELETE /api/documents/:id`

→ `200 { "deleted": true }` (cascades to chunks). `404` if missing.

### `POST /api/chat` (application/json)

Body: `{ "question": "string", "documentId": "uuid|null", "topK": 5 }`
→ `200`

```json
{
  "answer": "string",
  "sources": [
    {
      "documentId": "uuid",
      "filename": "report.pdf",
      "chunkIndex": 3,
      "snippet": "first ~200 chars…",
      "score": 0.82
    }
  ]
}
```

`score` is similarity in `[0,1]` (= `1 - cosine_distance`).
Errors: `400` empty question, `500` model/db failure.
If retrieval returns nothing, `answer` politely says no relevant context was found.

## 7. Data model (Postgres + pgvector)

Created by the migration runner — `server/src/db/migrations/0001_init.sql`, applied
via `npm run db:migrate` and tracked in a `schema_migrations` table (idempotent):

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename   TEXT NOT NULL,
  mime_type  TEXT,
  num_chunks INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT  NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(768),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);
```

> `gemini-embedding-001` defaults to 3072 dims; we request **768** (`outputDimensionality: 768`)
> so embeddings match the `vector(768)` column. Cosine search is magnitude-invariant, so no
> re-normalization is needed.

## 8. Gemini REST usage

Auth via API key in query string. Node 18+ global `fetch`.

- **Embed** (per chunk / query):
  `POST .../v1beta/models/gemini-embedding-001:embedContent?key=KEY`
  `{ "model":"models/gemini-embedding-001", "content":{"parts":[{"text":"..."}]}, "taskType":"RETRIEVAL_DOCUMENT|RETRIEVAL_QUERY", "outputDimensionality":768 }`
  → `{ "embedding": { "values": [768 floats] } }`
- **Generate**:
  `POST .../v1beta/models/gemini-2.5-flash:generateContent?key=KEY`
  `{ "contents":[{"parts":[{"text": PROMPT }]}], "generationConfig": { "temperature": 0.2 } }`
  → `candidates[0].content.parts[0].text`

Embedding is done one request per chunk with a small concurrency limit (≤5) and retry
with backoff on `429`, to respect free-tier rate limits.

## 9. Environment variables

**server/.env**

```
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db   # Supabase/Neon URL, or local docker
DATABASE_SSL=auto                                  # auto (off localhost, on remote) | true | false
GEMINI_API_KEY=your_key_here
GEMINI_EMBED_MODEL=gemini-embedding-001
GEMINI_CHAT_MODEL=gemini-2.5-flash
CLIENT_ORIGIN=http://localhost:5173                # CORS allowlist (comma-sep)
```

**client/.env**

```
VITE_API_URL=http://localhost:3000
```

## 10. Deployment

- **Client → Vercel.** Root = `client/`. Build `npm run build`, output `dist`. Set `VITE_API_URL` to the Render URL. SPA rewrite in `vercel.json`.
- **Server → Render.** Root = `server/`. Build `npm install`, start `npm start`. Set all server env vars. `render.yaml` provided.
- **DB → Supabase or Neon** (or local Docker for dev). Create the project, copy the connection string into `DATABASE_URL`, then run `npm run db:migrate` to create the `vector` extension + schema (or paste `migrations/0001_init.sql` into the SQL editor).

> Free-tier note: Render web services and Supabase/Neon DBs sleep when idle; the first
> request after idle is slow (cold start). The Camera Monitor is unaffected because it
> is fully client-side.
