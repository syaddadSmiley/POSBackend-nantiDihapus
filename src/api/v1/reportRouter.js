// file: src/api/v1/reportRouter.js
const router = require('express').Router();
const DashboardController = require('../../controllers/DashboardController'); // Pakai Controller Baru
const ReportController = require('../../controllers/ReportController'); // Untuk Sales Report biasa
const mw = require('../../utils/middleware');

// --- DASHBOARD STATS (ENTERPRISE) ---
// Gunakan DashboardController yang sudah support filter tanggal & fitur lengkap
router.get('/dashboard/stats', mw.verifyToken, mw.can('report.sales'), DashboardController.getStats);

// --- SALES REPORT (TABEL) ---
router.get('/sales', mw.verifyToken, mw.can('report.sales'), ReportController.getSales);

module.exports = router;