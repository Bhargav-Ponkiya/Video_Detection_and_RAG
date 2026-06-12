// /api/chat — answer a question with cited sources.

const express = require('express');
const rag = require('../services/rag');

const router = express.Router();

// POST /api/chat  { question, documentId?, topK? }
router.post('/', async (req, res, next) => {
  try {
    const { question, documentId, topK } = req.body || {};

    if (typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'A non-empty "question" is required' });
    }

    const result = await rag.answerQuestion({
      question: question.trim(),
      documentId: documentId || null,
      topK: topK == null ? 5 : topK,
    });

    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
