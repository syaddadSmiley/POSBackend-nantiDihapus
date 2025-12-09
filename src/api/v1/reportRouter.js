// file: src/api/v1/reportRouter.js
const router = require('express').Router();
const ReportController = require('../../controller/ReportController');
const mw = require('../../utils/middleware');

router.get('/sales', mw.verifyToken, ReportController.getSales);

module.exports = router;