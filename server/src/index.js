// Express app entrypoint. Wires CORS, JSON parsing, routes, health, and a
// central error handler, then starts listening.

const express = require('express');
const cors = require('cors');

const config = require('./config');
const { healthCheck } = require('./db/pool');
const { geminiHealth } = require('./services/gemini');
const documentsRouter = require('./routes/documents');
const chatRouter = require('./routes/chat');

const app = express();

// CORS: allow configured origins; also allow requests with no Origin header
// (curl, server-to-server, health checks).
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (config.clientOrigin.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
  })
);

app.use(express.json({ limit: '1mb' }));

// Health check — always 200, with boolean sub-checks so clients can show
// degraded status without treating the endpoint itself as failed.
app.get('/api/health', async (req, res) => {
  const db = await healthCheck();
  res.status(200).json({
    status: 'ok',
    db,
    gemini: geminiHealth(),
  });
});

// Feature routes.
app.use('/api/documents', documentsRouter);
app.use('/api/chat', chatRouter);

// 404 for unknown routes.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler. Never leak stack traces or secrets to clients.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const rawMsg = err && err.message ? err.message : String(err);
  console.error('[error]', rawMsg);
  
  if (res.headersSent) return next(err);
  
  let status = err && err.status ? err.status : 500;
  let clientMsg = 'Internal server error';

  if (rawMsg.includes('429')) {
    status = 429;
    clientMsg = 'AI quota or rate limit exceeded. The free-tier Gemini API allows up to 15-20 requests per minute. Please wait a moment and try your question again.';
  } else if (rawMsg.includes('503') || rawMsg.includes('overloaded')) {
    status = 503;
    clientMsg = 'The AI service is currently busy or overloaded. Please try again in a few seconds.';
  } else if (rawMsg.includes('API_KEY')) {
    status = 500;
    clientMsg = 'The AI service is not configured correctly on the server. Please check the server environment variables.';
  } else if (rawMsg.includes('Gemini')) {
    status = 502;
    clientMsg = 'The AI provider returned an error. Please try rephrasing your question or try again shortly.';
  } else if (err && err.message) {
    // If it's a validation error or known local error, pass it through
    clientMsg = err.message;
  }

  res.status(status).json({ error: clientMsg });
});

const { runMigrations } = require('./db/migrate');

async function startServer() {
  try {
    console.log('[db:migrate] Checking and applying database migrations...');
    await runMigrations();
    console.log('[db:migrate] Database is up to date.');
  } catch (err) {
    console.error('[db:migrate] Startup migration failed:', err.message);
    console.warn('[db:migrate] Continuing boot process. Database states may be degraded.');
  }

  app.listen(config.port, () => {
    console.log(`[server] listening on http://localhost:${config.port}`);
    console.log(`[server] CORS allowlist: ${config.clientOrigin.join(', ')}`);
  });
}

startServer();

module.exports = app;
