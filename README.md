# Camera Monitor + Document RAG

One monorepo, two features, **all on free tiers**:

1. **🎥 Camera Monitor** — a 4-camera surveillance wall with **real in-browser object
   detection** (TensorFlow.js COCO-SSD). Detects a `person` → 🔴 red alert, an
   animal/bird → 🟡 yellow alert, otherwise ✅ all-clear. Plus Simulate buttons for the
   demo. No backend, no API key, no cost.
2. **📄 Document RAG** — upload PDF/TXT/MD, ask questions, get answers grounded in your
   documents with cited sources. Powered by Gemini (`gemini-embedding-001` +
   `gemini-2.5-flash`) and Postgres + `pgvector`.

## Stack

React · Vite · Tailwind · TensorFlow.js — Node · Express · Gemini REST · pgvector
(Supabase/Neon). Client → Vercel, Server → Render.

## Quick start

```bash
# database — optional local Postgres + pgvector (or use Supabase/Neon)
docker compose up -d

# server
cd server && cp .env.example .env   # add DATABASE_URL + GEMINI_API_KEY
npm install && npm run db:migrate && npm run dev

# client (new terminal)
cd client && cp .env.example .env
npm install && npm run dev
```

Open http://localhost:5173. See **[INSTRUCTION.md](INSTRUCTION.md)** for full setup,
deployment, and demo-recording steps, and **[ARCHITECTURE.md](ARCHITECTURE.md)** for
the design and API contract.
