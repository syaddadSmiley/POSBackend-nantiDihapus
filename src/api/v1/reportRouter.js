const router = require('express').Router();
const ReportController = require('../../controller/ReportController');
const mw = require('../../utils/middleware');

// Hanya User yang punya izin 'report.sales' yang bisa lihat ini
router.get('/sales', mw.verifyToken, mw.can('report.sales'), ReportController.getSales);

module.exports = router;