# INSTRUCTION.md

Step-by-step setup, run, deploy, and demo-recording guide.

---

## 0. Prerequisites

- Node.js 18+ and npm
- A free **Gemini API key** → https://aistudio.google.com/app/apikey
- A Postgres + pgvector database — **any one of**: local **Docker** (easiest, no
  account), a free **Supabase** project (https://supabase.com), or a free **Neon**
  project (https://neon.tech)

---

## 1. Get a Postgres + pgvector database (≈3 min)

Pick **one** option. Each ends with a `DATABASE_URL` for `server/.env`. The schema is
created in step 2 by `npm run db:migrate` (no manual SQL needed).

### Option A — Local Docker (fastest, no account)

Requires Docker. From the repo root:

```bash
docker compose up -d        # Postgres + pgvector on localhost:5432
```

Then use this in `server/.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/camera_rag
```

Stop later with `docker compose down` (add `-v` to also wipe the data).

### Option B — Supabase (recommended for deployment)

1. Create a project, choose a region, save the DB password.
2. **Project Settings → Database → Connection string → URI** → use the
   _Connection pooler_ ("Transaction") URI as your `DATABASE_URL`.

### Option C — Neon

1. Create a project. Copy the connection string (it includes `?sslmode=require`).

> Remote hosts (Supabase/Neon) get SSL automatically; localhost does not. Override
> with `DATABASE_SSL=true|false` if needed. As an alternative to `db:migrate`, you can
> paste `server/src/db/migrations/0001_init.sql` into the provider's SQL editor.

---

## 2. Run the server locally

```bash
cd server
cp .env.example .env
# edit .env: set DATABASE_URL and GEMINI_API_KEY
npm install
npm run db:migrate   # creates the schema via tracked migrations (idempotent)
npm run dev          # http://localhost:8081
```

Sanity check: open http://localhost:8081/api/health → `{"status":"ok","db":true,"gemini":true}`.

---

## 3. Run the client locally

```bash
cd client
cp .env.example .env          # VITE_API_URL defaults to http://localhost:8081
npm install
npm run dev                   # http://localhost:5173
```

Open http://localhost:5173:

- **/monitor** — camera wall. Wait for "model ready", then use Simulate buttons or
  point a webcam tile at a person/pet to see real alerts.
- **/rag** — upload a PDF/TXT/MD, wait for ingest, then ask questions. Ready-made
  samples live in `server/sample-docs/` — e.g. upload `acme-remote-work-policy.md` and
  ask _"What is the equipment stipend?"_ or _"How many remote days are allowed?"_

### Camera videos

Four looping sample videos live in `client/public/cameras/` as
`cam1.mp4 … cam4.mp4`. Replace them with your own footage if you like (keep the
names, or edit `client/src/features/camera/cameras.config.js`). One tile can use the
live webcam via the "Use webcam" toggle.

---

## 4. Deploy (all free tier)

### 4a. Database

Already created in step 1 — nothing more to do.

### 4b. Server → Render

1. Push the repo to GitHub.
2. Render → **New → Web Service** → pick the repo → **Root Directory = `server`**.
3. Build command `npm install`, start command `npm start`.
4. Add environment variables (from `server/.env.example`):
   `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_EMBED_MODEL`, `GEMINI_CHAT_MODEL`,
   `CLIENT_ORIGIN` (set to your Vercel URL once you have it).
5. Deploy. Note the service URL, e.g. `https://camera-rag-api.onrender.com`.
   (A `render.yaml` is included if you prefer Blueprint deploys.)

### 4c. Client → Vercel

1. Vercel → **Add New → Project** → import the repo → **Root Directory = `client`**.
2. Framework preset = Vite (build `npm run build`, output `dist`).
3. Add env var `VITE_API_URL` = the Render URL from 4b.
4. Deploy. Copy the Vercel URL and set it as `CLIENT_ORIGIN` on Render (redeploy server).

> First RAG request after idle may take ~30–60s (free tiers cold-start). The camera
> page is instant because it is fully client-side.

---

## 5. Recording the demo video

Suggested ~3–4 min script:

1. **Intro (15s):** "One project, two features — a camera monitor and a document RAG
   assistant. Both run entirely on free tiers."
2. **Camera Monitor (90s):**
   - Show the 4-camera wall, point out the live clock / status.
   - Click **Simulate Human** → red alert + alert-log entry. Explain it’s wired to the
     same path as real detection.
   - Click **Simulate Animal** → yellow alert.
   - Toggle **Use webcam** on one tile, step into frame → real 🔴 human detection from
     TensorFlow.js COCO-SSD running in the browser (no server, no cost).
3. **Document RAG (90s):**
   - Upload a PDF. Show the chunk count after ingest.
   - Ask 2–3 questions. Show the answer + the cited source chunks.
   - Ask something not in the document → it declines gracefully.
4. **Wrap (20s):** mention the stack (React/Tailwind, Node/Express, Gemini
   `gemini-embedding-001` + `gemini-2.5-flash`, Postgres/pgvector) and that everything
   is free-tier and deployable to Vercel + Render + Supabase.

Recording tools: OBS Studio, Loom, or the built-in OS screen recorder.

---

## 6. Troubleshooting

| Symptom                                           | Fix                                                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/api/health` shows `db:false`                    | `DATABASE_URL` wrong, or migrations not applied. Run `npm run db:migrate`.                               |
| DB error: "does not support SSL" / "SSL required" | Set `DATABASE_SSL=false` (local) or `true` (cloud) in `server/.env` — default `auto` handles most cases. |
| Ingest 500, "dimension mismatch"                  | Embed model isn't 768-dim. Match `vector(N)` in `migrations/0001_init.sql`.                              |
| 429 from Gemini                                   | Free-tier rate limit; ingest retries with backoff. Upload smaller docs or wait.                          |
| Camera tile stuck on "loading model"              | First load downloads the model; check network/console. Simulate buttons still work.                      |
| CORS error in browser                             | Add the client origin to `CLIENT_ORIGIN` on the server and redeploy.                                     |
| Webcam tile black                                 | Grant camera permission; only one tab can hold the webcam at a time.                                     |
