// file: src/api/v1/reportRouter.js
const router = require('express').Router();
const ReportController = require('../../controllers/ReportController');
const mw = require('../../utils/middleware');

// --- 1. DASHBOARD STATS (Real-time Hari Ini) ---
// URL Baru: /api/v1/reports/dashboard
// (Memanggil fungsi getDashboardStats di Controller yang sudah kita gabung)
router.get('/dashboard', mw.verifyToken, mw.can('report.sales'), ReportController.getDashboardStats);

// --- 2. SALES REPORT (Historis Range Tanggal) ---
// URL: /api/v1/reports/sales
router.get('/sales', mw.verifyToken, mw.can('report.sales'), ReportController.getSales);

module.exports = router;