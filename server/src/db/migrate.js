// Migration runner. Applies every *.sql file in ./migrations (in filename
// order) that hasn't been applied yet, tracking applied versions in a
// `schema_migrations` table. Each migration runs in its own transaction, so a
// failure rolls back cleanly and leaves earlier migrations intact.
//
// Usage:  npm run db:migrate   (idempotent — safe to run repeatedly)
//
// Works against any DATABASE_URL (local docker, Supabase, Neon); SSL is
// auto-resolved in config.js.

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function main() {
  if (!config.db.url) {
    console.error('[db:migrate] DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: config.db.url, ssl: config.db.ssl });

  try {
    // Ledger of applied migrations.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // lexical order → 0001_, 0002_, …

    if (files.length === 0) {
      console.log('[db:migrate] no migration files found.');
      return;
    }

    const { rows } = await pool.query('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.version));

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  • skip    ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✓ applied ${file}`);
        count += 1;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`migration ${file} failed: ${err.message}`);
      } finally {
        client.release();
      }
    }

    console.log(
      count > 0
        ? `[db:migrate] done — applied ${count} migration(s).`
        : '[db:migrate] done — database already up to date.'
    );
  } catch (err) {
    console.error('[db:migrate]', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
