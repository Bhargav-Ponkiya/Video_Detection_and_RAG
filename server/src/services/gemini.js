// Gemini REST client using Node 18+ global `fetch` (no SDK, to avoid version churn).
// Provides embeddings (single + batched with concurrency/backoff) and chat
// generation. All functions throw clear errors (status + body) on non-OK
// responses, except the health/answer helpers which degrade gracefully.

const config = require('../config');

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Build a models endpoint URL. The API key is passed as a query param per the
// Gemini REST spec. We never log the full URL (it contains the key).
function endpoint(model, method) {
  return `${BASE}/models/${model}:${method}?key=${config.gemini.apiKey}`;
}

// Sleep helper for backoff.
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Read a Response body as text without throwing.
async function safeBodyText(res) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

/**
 * Embed a single piece of text.
 * @param {string} text
 * @param {string} taskType - e.g. 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'
 * @returns {Promise<number[]>} 768-dim embedding vector
 */
async function embedText(text, taskType) {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = config.gemini.embedModel;
  const res = await fetch(endpoint(model, 'embedContent'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: config.embedDim,
    }),
  });

  if (!res.ok) {
    const body = await safeBodyText(res);
    throw new Error(`Gemini embedContent failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  const values = json && json.embedding && json.embedding.values;
  if (!Array.isArray(values)) {
    throw new Error('Gemini embedContent returned no embedding values');
  }
  return values;
}

// Internal: embed one text with retry + exponential backoff on transient
// errors (HTTP 429 rate limit, 503 overloaded). Throws on other failures or
// when retries are exhausted.
async function embedTextWithRetry(text, taskType, maxRetries = 4) {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = config.gemini.embedModel;
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await fetch(endpoint(model, 'embedContent'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: config.embedDim,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      const values = json && json.embedding && json.embedding.values;
      if (!Array.isArray(values)) {
        throw new Error('Gemini embedContent returned no embedding values');
      }
      return values;
    }

    // Retry only on transient throttling/overload statuses.
    const retryable = res.status === 429 || res.status === 503;
    if (!retryable || attempt >= maxRetries) {
      const body = await safeBodyText(res);
      throw new Error(`Gemini embedContent failed (${res.status}): ${body}`);
    }

    // Exponential backoff with jitter: ~0.5s, 1s, 2s, 4s (+ up to 250ms).
    const delay = 500 * 2 ** attempt + Math.floor(Math.random() * 250);
    console.warn(
      `[gemini] embed got ${res.status}, retrying in ${delay}ms ` +
        `(attempt ${attempt + 1}/${maxRetries})`
    );
    await sleep(delay);
    attempt += 1;
  }
}

/**
 * Embed many texts with bounded concurrency. Preserves input order.
 * Retries each request with exponential backoff on 429/503.
 * @param {string[]} texts
 * @param {string} taskType
 * @param {number} concurrency - max in-flight requests (free-tier friendly)
 * @returns {Promise<number[][]>}
 */
async function embedBatch(texts, taskType, concurrency = 5) {
  const results = new Array(texts.length);
  let next = 0;

  // Worker pulls indices off a shared cursor until the list is exhausted.
  async function worker() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const i = next;
      next += 1;
      if (i >= texts.length) return;
      results[i] = await embedTextWithRetry(texts[i], taskType);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, texts.length || 1));
  const workers = [];
  for (let w = 0; w < workerCount; w += 1) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

/**
 * Generate an answer from a prompt with the chat model.
 * Returns the model's text, or a graceful fallback string if the response was
 * empty/blocked. Throws on transport/HTTP errors.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function generateAnswer(prompt) {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = config.gemini.chatModel;
  const res = await fetch(endpoint(model, 'generateContent'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  if (!res.ok) {
    const body = await safeBodyText(res);
    throw new Error(`Gemini generateContent failed (${res.status}): ${body}`);
  }

  const json = await res.json();

  // Happy path: candidates[0].content.parts[*].text
  const candidate = json && json.candidates && json.candidates[0];
  const parts =
    candidate && candidate.content && Array.isArray(candidate.content.parts)
      ? candidate.content.parts
      : null;
  const text = parts
    ? parts
        .map((p) => (p && typeof p.text === 'string' ? p.text : ''))
        .join('')
        .trim()
    : '';

  if (text) return text;

  // Blocked or empty: surface a safe, human-readable fallback rather than
  // throwing, so the API still returns a 200 with a usable message.
  const blockReason =
    (json && json.promptFeedback && json.promptFeedback.blockReason) ||
    (candidate && candidate.finishReason) ||
    'unknown';
  return `I couldn't generate an answer (reason: ${blockReason}). Please try rephrasing your question.`;
}

/**
 * Cheap health signal for /api/health. We do NOT ping the API (that would burn
 * free-tier quota); we only report whether a key is configured.
 * @returns {boolean}
 */
function geminiHealth() {
  return Boolean(config.gemini.apiKey);
}

module.exports = {
  embedText,
  embedBatch,
  generateAnswer,
  geminiHealth,
};
