// /api/documents — ingest, list, delete.

const express = require('express');
const multer = require('multer');
const rag = require('../services/rag');

const router = express.Router();

// Accept these MIME types / extensions. Browsers are inconsistent with .md,
// so we also allow by extension in the filter and rely on extract.js as the
// final authority.
const ALLOWED_MIME = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/octet-stream',
]);
const ALLOWED_EXT = /\.(pdf|txt|md|markdown)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: (req, file, cb) => {
    const okMime = ALLOWED_MIME.has((file.mimetype || '').toLowerCase());
    const okExt = ALLOWED_EXT.test(file.originalname || '');
    if (okMime || okExt) return cb(null, true);
    // Reject with a typed error we can map to 400 in the route handler.
    const err = new Error('Unsupported file type. Allowed: .pdf, .txt, .md');
    err.status = 400;
    return cb(err);
  },
});

// POST /api/documents — multipart, field "file".
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      // multer size-limit and our fileFilter errors -> 400.
      const status = err.code === 'LIMIT_FILE_SIZE' ? 400 : err.status || 400;
      return res
        .status(status)
        .json({ error: err.message || 'Upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded (field "file")' });
    }

    try {
      const result = await rag.ingestDocument({
        buffer: req.file.buffer,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      return res.status(201).json(result);
    } catch (e) {
      // Extraction/validation problems are client errors; everything else 500.
      const msg = e && e.message ? e.message : 'Ingest failed';
      if (/unsupported|no extractable text|empty|produced no chunks/i.test(msg)) {
        return res.status(400).json({ error: msg });
      }
      return next(e);
    }
  });
});

// GET /api/documents
router.get('/', async (req, res, next) => {
  try {
    const documents = await rag.listDocuments();
    res.status(200).json({ documents });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/documents/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await rag.deleteDocument(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.status(200).json({ deleted: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
