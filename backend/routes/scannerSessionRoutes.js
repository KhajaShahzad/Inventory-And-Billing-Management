const express = require('express');
const {
  createScannerSession,
  getScannerBootstrap,
  getScannerSession,
  addScannerSessionScan,
  closeScannerSession,
} = require('../controllers/scannerSessionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/bootstrap', getScannerBootstrap);
router.post('/', protect, createScannerSession);
router.get('/:sessionId', getScannerSession);
router.post('/:sessionId/scans', addScannerSessionScan);
router.delete('/:sessionId', protect, closeScannerSession);

module.exports = router;
