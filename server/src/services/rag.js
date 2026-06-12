// RAG orchestration: ties together extract -> chunk -> embed -> store, and
// query -> embed -> vector search -> grounded generation. All SQL lives here.

const { pool } = require('../db/pool');
const { extractText } = require('./extract');
const { chunkText } = require('./chunker');
const { embedText, embedBatch, generateAnswer } = require('./gemini');

// Format a JS number[] as a pgvector literal: '[v1,v2,...]'. We always pass
// this as a parameter and cast `::vector` in SQL (never interpolate into SQL).
function toVectorLiteral(vec) {
  return `[${vec.join(',')}]`;
}

/**
 * Ingest a document end-to-end.
 * @param {{buffer: Buffer, filename: string, mimetype: string}} file
 * @returns {Promise<{id: string, filename: string, numChunks: number, mimeType: string}>}
 */
async function ingestDocument({ buffer, filename, mimetype }) {
  // 0. Guard total document count in the system to prevent database exhaustion (max 30)
  const countRes = await pool.query('SELECT COUNT(*)::int as count FROM documents');
  if (countRes.rows[0].count >= 30) {
    throw new Error('System storage limit reached (maximum 30 documents). Please delete some existing documents first.');
  }

  // 1. Extract text (throws on unsupported/empty).
  const text = await extractText(buffer, mimetype, filename);

  // 2. Chunk.
  const chunks = chunkText(text, { size: 1000, overlap: 150 });
  if (chunks.length === 0) {
    throw new Error('Document produced no chunks');
  }
  if (chunks.length > 200) {
    throw new Error('Document is too large. Maximum allowed size is 200 text chunks (approx. 200,000 characters) to prevent API rate-limit abuse.');
  }

  // 3. Embed all chunks (RETRIEVAL_DOCUMENT), bounded concurrency + backoff.
  const embeddings = await embedBatch(chunks, 'RETRIEVAL_DOCUMENT', 5);

  // 4. Persist documents row + chunks rows in a single transaction.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const docRes = await client.query(
      `INSERT INTO documents (filename, mime_type, num_chunks)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [filename, mimetype || null, chunks.length]
    );
    const documentId = docRes.rows[0].id;

    // Bulk insert chunks in batches. 4 params/row, so a batch of 500 uses 2000
    // params — well under Postgres' 65535-parameter ceiling for a single query.
    // All batches run inside the same transaction opened above.
    const BATCH_SIZE = 500;
    for (let start = 0; start < chunks.length; start += BATCH_SIZE) {
      const slice = chunks.slice(start, start + BATCH_SIZE);
      const values = [];
      const params = [];
      let p = 1;
      for (let j = 0; j < slice.length; j += 1) {
        const i = start + j; // preserve global chunk_index
        values.push(`($${p++}, $${p++}, $${p++}, $${p++}::vector)`);
        params.push(documentId, i, slice[j], toVectorLiteral(embeddings[i]));
      }
      await client.query(
        `INSERT INTO chunks (document_id, chunk_index, content, embedding)
         VALUES ${values.join(', ')}`,
        params
      );
    }

    await client.query('COMMIT');

    return {
      id: documentId,
      filename,
      numChunks: chunks.length,
      mimeType: mimetype || null,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Build the grounded prompt: a strict system instruction + retrieved context
// + the user's question. The model is told to answer ONLY from context.
function buildPrompt(question, rows) {
  const context = rows
    .map(
      (r, idx) =>
        `[${idx + 1}] (source: ${r.filename}, chunk ${r.chunk_index})\n${r.content}`
    )
    .join('\n\n---\n\n');

  return [
    'You are a precise question-answering assistant.',
    'Answer the user\'s question using ONLY the context provided below.',
    'Cite the sources you used by their bracket number, e.g. [1], [2].',
    'If the answer is not contained in the context, say clearly that you',
    'could not find relevant information in the provided documents. Do not',
    'use outside knowledge and do not make anything up.',
    '',
    '=== CONTEXT ===',
    context,
    '=== END CONTEXT ===',
    '',
    `Question: ${question}`,
    'Answer:',
  ].join('\n');
}

/**
 * Answer a question against stored chunks.
 * @param {{question: string, documentId?: string|null, topK?: number}} args
 * @returns {Promise<{answer: string, sources: Array}>}
 */
async function answerQuestion({ question, documentId = null, topK = 5 }) {
  const k = Math.max(1, Math.min(parseInt(topK, 10) || 5, 20));

  // 1. Embed the question (RETRIEVAL_QUERY).
  const queryEmbedding = await embedText(question, 'RETRIEVAL_QUERY');
  const queryVec = toVectorLiteral(queryEmbedding);

  // 2. Vector search by cosine distance (<=>). score = 1 - distance.
  //    Optionally scope to a single document.
  const params = [queryVec];
  let where = '';
  if (documentId) {
    params.push(documentId);
    where = `WHERE c.document_id = $${params.length}`;
  }
  params.push(k);
  const limitIdx = params.length;

  const sql = `
    SELECT c.content,
           c.chunk_index,
           c.document_id,
           d.filename,
           1 - (c.embedding <=> $1::vector) AS score
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    ${where}
    ORDER BY c.embedding <=> $1::vector
    LIMIT $${limitIdx}
  `;

  const { rows } = await pool.query(sql, params);

  // 3. No context retrieved -> polite empty answer.
  if (rows.length === 0) {
    return {
      answer:
        'I could not find any relevant context in the uploaded documents to answer that question.',
      sources: [],
    };
  }

  // 4. Build grounded prompt and generate.
  const prompt = buildPrompt(question, rows);
  const answer = await generateAnswer(prompt);

  // 5. Shape sources (snippet = first ~200 chars).
  const sources = rows.map((r) => ({
    documentId: r.document_id,
    filename: r.filename,
    chunkIndex: r.chunk_index,
    snippet: r.content.slice(0, 200),
    score: typeof r.score === 'number' ? r.score : Number(r.score),
  }));

  return { answer, sources };
}

/**
 * List all documents (newest first).
 * @returns {Promise<Array<{id,filename,numChunks,createdAt}>>}
 */
async function listDocuments() {
  const { rows } = await pool.query(
    `SELECT id, filename, num_chunks, created_at
     FROM documents
     ORDER BY created_at DESC`
  );
  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    numChunks: r.num_chunks,
    createdAt: r.created_at,
  }));
}

/**
 * Delete a document (chunks cascade via FK).
 * @param {string} id
 * @returns {Promise<boolean>} true if a row was deleted
 */
async function deleteDocument(id) {
  const { rowCount } = await pool.query(
    'DELETE FROM documents WHERE id = $1',
    [id]
  );
  return rowCount > 0;
}

module.exports = {
  ingestDocument,
  answerQuestion,
  listDocuments,
  deleteDocument,
};
