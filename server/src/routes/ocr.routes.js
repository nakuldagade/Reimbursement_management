const express = require('express');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { parseReceipt } = require('../utils/ocr');
const path = require('path');

const router = express.Router();

// POST /api/ocr/parse — upload and parse receipt
router.post('/parse', authenticate, upload.single('receipt'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No receipt file uploaded.' });
    }

    const filePath = path.join(__dirname, '../../uploads', req.file.filename);
    const result = await parseReceipt(filePath);

    res.json({
      success: true,
      data: result,
      filePath: `/uploads/${req.file.filename}`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
