# Camera Monitor + Document RAG

One monorepo, two features, **all on free tiers**:

1. **🎥 Camera Monitor** — a 4-camera surveillance wall with **real in-browser object
   detection** (TensorFlow.js COCO-SSD). Detects a `person` → 🔴 red alert, an
   animal/bird → 🟡 yellow alert, otherwise ✅ all-clear. Plus Simulate buttons for the
   demo. No backend, no API key, no cost.
2. **📄 Document RAG** — upload PDF/TXT/MD, ask questions, get answers grounded in your
   documents with cited sources. Powered by Gemini (`gemini-embedding-001` +
   `gemini-2.5-flash`) and Postgres + `pgvector`.

## Deployed Environments
* **Frontend SPA (Vercel):** https://video-detection-and-rag-bhargavp.vercel.app
* **Backend API (Render):** https://camera-rag-server.onrender.com

## Stack

React · Vite · Tailwind · TensorFlow.js — Node · Express · Gemini REST · pgvector (Supabase/Neon).

## Quick start

```bash
# database — optional local Postgres + pgvector
docker compose up -d

# server
cd server && cp .env.example .env   # add DATABASE_URL + GEMINI_API_KEY
npm install && npm run dev          # runs on http://localhost:8081 (database auto-migrates on startup)

# client (new terminal)
cd client && cp .env.example .env
npm install && npm run dev          # runs on http://localhost:5173
```

Open http://localhost:5173. See **[INSTRUCTION.md](INSTRUCTION.md)** for full setup,
deployment, and demo-recording steps, and **[ARCHITECTURE.md](ARCHITECTURE.md)** for
the design and API contract.

## Project Safeguards
* **File Ingestion Limit:** Upload size restricted to **3MB** max.
* **Processing Guard:** Documents capped at **200 chunks** max (~200,000 characters) to prevent API timeouts and free-tier throttling.
* **Storage Protection:** Database capped at **30 documents** total.
* **Auto-Migrations:** Automatically verifies and applies database migrations on backend boot.

