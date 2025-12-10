const router = require('express').Router();
const ShiftController = require('../../controller/ShiftController');
const mw = require('../../utils/middleware');

// Siapapun yang boleh Transaksi (pos.order), harus boleh Buka/Tutup Shift
router.get('/status', mw.verifyToken, mw.can('pos.order'), ShiftController.checkStatus);
router.post('/open', mw.verifyToken, mw.can('pos.order'), ShiftController.open);
router.post('/close', mw.verifyToken, mw.can('pos.order'), ShiftController.close);

module.exports = router;