// Loads environment variables and exports a validated, typed config object.
// Reads everything from process.env once, applies sensible defaults, and
// normalizes a few values (e.g. CLIENT_ORIGIN -> array) so the rest of the
// app never has to parse env vars itself.

require("dotenv").config();

// Coerce a value to an integer, falling back to `fallback` when unset/NaN.
function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

// Resolve the node-postgres `ssl` option.
//   • Cloud Postgres (Supabase/Neon) REQUIRES SSL.
//   • Local Postgres (docker/localhost) usually has SSL OFF and will throw
//     "The server does not support SSL connections" if we force it.
// DATABASE_SSL overrides everything:
//   'require'/'true'/'on' → SSL on, 'disable'/'false'/'off' → SSL off,
//   'auto' (default)      → on for remote hosts, off for localhost.
// In 'auto' mode an explicit `?sslmode=` in the URL is honored.
function resolveDbSsl(databaseUrl, override) {
  const o = String(override || "auto").toLowerCase();
  if (["false", "disable", "off", "0", "no"].includes(o)) return false;
  if (["true", "require", "on", "1", "yes"].includes(o))
    return { rejectUnauthorized: false };

  if (!databaseUrl) return false;
  try {
    const u = new URL(databaseUrl);
    const sslmode = (u.searchParams.get("sslmode") || "").toLowerCase();
    if (sslmode === "disable") return false;
    if (sslmode) return { rejectUnauthorized: false };
    const host = u.hostname;
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local");
    return isLocal ? false : { rejectUnauthorized: false };
  } catch {
    // Unparseable URL — default to SSL on (safe for managed cloud DBs).
    return { rejectUnauthorized: false };
  }
}

const PORT = toInt(process.env.PORT, 3000);

// CLIENT_ORIGIN is a comma-separated CORS allowlist. Trim and drop empties.
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const config = {
  port: PORT,

  // Postgres connection string (Supabase/Neon pooled URL).
  databaseUrl: process.env.DATABASE_URL || "",

  // Postgres connection details, including the auto-resolved SSL option.
  db: {
    url: process.env.DATABASE_URL || "",
    ssl: resolveDbSsl(process.env.DATABASE_URL || "", process.env.DATABASE_SSL),
  },

  // Gemini REST API.
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    embedModel: process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001",
    chatModel: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash",
  },

  // CORS allowlist (array).
  clientOrigin: CLIENT_ORIGIN,

  // Embedding vector dimension (gemini-embedding-001 via outputDimensionality). Validation only.
  embedDim: 768,
};

// Non-fatal warnings so the server can still boot for /api/health checks,
// but the operator is told what's missing. We never log secret values.
if (!config.databaseUrl) {
  console.warn("[config] DATABASE_URL is not set — DB operations will fail.");
}
if (!config.gemini.apiKey) {
  console.warn(
    "[config] GEMINI_API_KEY is not set — embedding/chat will fail.",
  );
}

module.exports = config;
