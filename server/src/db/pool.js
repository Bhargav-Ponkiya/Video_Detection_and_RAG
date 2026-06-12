// Shared Postgres connection pool. Import this everywhere instead of creating
// new Pools, so connections are reused (important on free tiers with low limits).

const { Pool } = require('pg');
const config = require('../config');

// SSL is resolved in config: on for managed cloud DBs (Supabase/Neon), off for
// local Postgres (docker/localhost). rejectUnauthorized:false accepts the
// managed providers' certs, which aren't in Node's default trust store.
const pool = new Pool({
  connectionString: config.db.url,
  ssl: config.db.ssl,
});

// Surface unexpected idle-client errors instead of crashing the process.
pool.on('error', (err) => {
  console.error('[db] unexpected idle client error:', err.message);
});

// Lightweight liveness probe for /api/health. Returns true if a trivial query
// succeeds, false otherwise (never throws).
async function healthCheck() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    console.error('[db] healthCheck failed:', err.message);
    return false;
  }
}

module.exports = { pool, healthCheck };
