// file: src/api/v1/dashboardRouter.js
const router = require('express').Router();
const DashboardController = require('../../controller/DashboardController');
const mw = require('../../utils/middleware');


router.get('/stats', mw.verifyToken, DashboardController.getStats);

module.exports = router;









