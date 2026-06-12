// Splits a document's text into overlapping chunks suitable for embedding.
// Strategy: normalize whitespace, then greedily pack text into ~`size`-char
// windows, preferring to break on paragraph -> sentence -> word boundaries so
// chunks stay semantically coherent. Consecutive chunks overlap by ~`overlap`
// chars to preserve context across boundaries.

// Collapse runs of whitespace while keeping paragraph breaks meaningful.
// We normalize CRLF, collapse 3+ newlines to 2 (paragraph), and trim trailing
// spaces on each line.
function normalize(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// Find the best break point at or before `hardEnd` within `text`, but not
// before `minEnd` (so we don't make a chunk that's far too small). Prefers a
// paragraph break, then sentence end, then a word boundary. Returns an index
// to slice up to (exclusive), or hardEnd if no good boundary is found.
function findBreak(text, minEnd, hardEnd) {
  const window = text.slice(minEnd, hardEnd);

  // Paragraph break (blank line).
  const para = window.lastIndexOf('\n\n');
  if (para !== -1) return minEnd + para + 2;

  // Sentence end followed by whitespace.
  const sentenceRe = /[.!?]["')\]]?\s/g;
  let lastSentence = -1;
  let m;
  while ((m = sentenceRe.exec(window)) !== null) {
    lastSentence = m.index + m[0].length;
  }
  if (lastSentence !== -1) return minEnd + lastSentence;

  // Word boundary (last whitespace).
  const ws = window.lastIndexOf(' ');
  if (ws !== -1) return minEnd + ws + 1;

  // No boundary at all (e.g. one giant token) — hard cut.
  return hardEnd;
}

/**
 * @param {string} text
 * @param {{size?: number, overlap?: number}} [opts]
 * @returns {string[]} non-empty chunks in document order
 */
function chunkText(text, opts = {}) {
  const size = Math.max(1, opts.size || 1000);
  // Overlap must be smaller than size to guarantee forward progress.
  let overlap = opts.overlap == null ? 150 : opts.overlap;
  overlap = Math.max(0, Math.min(overlap, Math.floor(size / 2)));

  const normalized = normalize(text);
  if (!normalized) return [];

  // Small input: a single chunk.
  if (normalized.length <= size) return [normalized];

  const chunks = [];
  let start = 0;
  const len = normalized.length;
  // Don't let a "good boundary" produce a chunk smaller than ~40% of size.
  const minChunk = Math.floor(size * 0.4);

  while (start < len) {
    const hardEnd = Math.min(start + size, len);

    let end;
    if (hardEnd >= len) {
      end = len; // last chunk: take the remainder
    } else {
      end = findBreak(normalized, start + minChunk, hardEnd);
      // Safety: ensure we always advance past `start`.
      if (end <= start) end = hardEnd;
    }

    const piece = normalized.slice(start, end).trim();
    if (piece) chunks.push(piece);

    if (end >= len) break;

    // Advance the window, stepping back by `overlap` for context continuity.
    const nextStart = end - overlap;
    // Guarantee forward progress even with large overlaps / tiny chunks.
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}

module.exports = { chunkText };
