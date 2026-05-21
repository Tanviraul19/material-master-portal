const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const duplicateController = require('../controllers/duplicateController');
const { verifyToken, isSuperAdmin } = require('../middleware/auth');

// Multer: store uploads in OS temp dir, accept xlsx/csv only
const upload = multer({
  dest: require('os').tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) cb(null, true);
    else cb(new Error('Only .xlsx, .xls, and .csv files are allowed'));
  },
});

// Real-time duplicate check (called while user types)
router.get('/check', verifyToken, duplicateController.checkDuplicate);

// Live suggestion list — substring search, view-only
router.get('/suggest', verifyToken, duplicateController.suggestDescriptions);

// Bulk import from Excel/CSV (Super Admin only)
router.post('/import', verifyToken, isSuperAdmin, upload.single('file'), duplicateController.importDescriptions);

// Stats about imported descriptions
router.get('/stats', verifyToken, isSuperAdmin, duplicateController.getStats);

module.exports = router;
