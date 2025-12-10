const router = require('express').Router();
const DashboardController = require('../../controller/DashboardController');
const mw = require('../../utils/middleware');

// Statistik Dashboard biasanya berisi data penjualan sensitif
router.get('/stats', mw.verifyToken, mw.can('report.sales'), DashboardController.getStats);

module.exports = router;