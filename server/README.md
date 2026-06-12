# camera-rag-server

Express API for the **Document RAG** feature: upload PDF/TXT/MD, embed with
Gemini `gemini-embedding-001`, store vectors in Postgres + `pgvector`, and answer
questions with cited sources via `gemini-2.5-flash`.

> The Camera Monitor feature is 100% client-side and does **not** use this server.

See [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for the full API contract.

## Requirements

- Node 18+ (global `fetch`)
- A Postgres database with the `vector` extension (local Docker, Supabase, or Neon)
- A Gemini API key

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# then edit .env and fill in DATABASE_URL and GEMINI_API_KEY

# 3. Create the schema via tracked migrations (idempotent — safe to re-run)
npm run db:migrate
```

### Environment variables (`.env`)

| Var                  | Default                 | Notes                                                |
| -------------------- | ----------------------- | ---------------------------------------------------- |
| `PORT`               | `3000`                  | HTTP port                                            |
| `DATABASE_URL`       | —                       | Postgres pooled connection string                    |
| `DATABASE_SSL`       | `auto`                  | `auto` (off localhost, on remote) / `true` / `false` |
| `GEMINI_API_KEY`     | —                       | Server-side only; never sent to client               |
| `GEMINI_EMBED_MODEL` | `gemini-embedding-001`  | 768-dim embeddings                                   |
| `GEMINI_CHAT_MODEL`  | `gemini-2.5-flash`      | Answer generation                                    |
| `CLIENT_ORIGIN`      | `http://localhost:5173` | CORS allowlist (comma-separated)                     |

## Run

```bash
npm run dev     # nodemon, auto-reload, on :3000
npm start       # production
```

## API (summary)

- `GET    /api/health` → `{ status, db, gemini }`
- `POST   /api/documents` (multipart, field `file`) → `{ id, filename, numChunks, mimeType }`
- `GET    /api/documents` → `{ documents: [...] }`
- `DELETE /api/documents/:id` → `{ deleted: true }`
- `POST   /api/chat` (JSON `{ question, documentId?, topK? }`) → `{ answer, sources: [...] }`

## Deploy (Render)

`render.yaml` defines a free web service (rootDir `server`, build `npm install`,
start `npm start`). Set `DATABASE_URL`, `GEMINI_API_KEY`, and `CLIENT_ORIGIN` as
secrets in the Render dashboard. Run the schema once against your DB
(`npm run db:migrate` or paste `src/db/migrations/0001_init.sql` into the SQL editor).
