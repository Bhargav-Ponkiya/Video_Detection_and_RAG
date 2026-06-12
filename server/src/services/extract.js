// Extracts plain text from an uploaded file buffer. Supports PDF (via
// pdf-parse) and plain-text formats (.txt/.md) decoded as UTF-8. Throws a
// clear error for anything else, and validates that the result is non-empty.

const pdfParse = require('pdf-parse');

function hasExt(filename, ext) {
  return typeof filename === 'string' && filename.toLowerCase().endsWith(ext);
}

/**
 * @param {Buffer} buffer - raw file bytes
 * @param {string} mimetype - reported MIME type (may be unreliable)
 * @param {string} filename - original filename (used as a fallback signal)
 * @returns {Promise<string>} extracted, trimmed text
 */
async function extractText(buffer, mimetype, filename) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Empty or invalid file buffer');
  }

  const mime = (mimetype || '').toLowerCase();
  const isPdf = mime === 'application/pdf' || hasExt(filename, '.pdf');
  const isText =
    mime.startsWith('text/') ||
    mime === 'application/octet-stream' || // browsers sometimes send this for .md
    hasExt(filename, '.txt') ||
    hasExt(filename, '.md') ||
    hasExt(filename, '.markdown');

  let text;
  if (isPdf) {
    const data = await pdfParse(buffer);
    text = data && data.text ? data.text : '';
  } else if (isText) {
    text = buffer.toString('utf8');
  } else {
    throw new Error(
      `Unsupported file type: "${mimetype || 'unknown'}". ` +
        'Supported: PDF (.pdf), plain text (.txt), Markdown (.md).'
    );
  }

  // Remove null bytes (\x00) which PostgreSQL cannot store in text fields
  text = (text || '').replace(/\0/g, '').trim();
  if (!text) {
    throw new Error('No extractable text found in the document');
  }
  return text;
}

module.exports = { extractText };
