const router = require('express').Router();
const ShiftController = require('../../controller/ShiftController');
const mw = require('../../utils/middleware');

router.get('/status', mw.verifyToken, ShiftController.checkStatus);
router.post('/open', mw.verifyToken, ShiftController.open);
router.post('/close', mw.verifyToken, ShiftController.close);

module.exports = router;