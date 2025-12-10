const router = require('express').Router();
const FnbController = require('../../controller/FnbController');
const mw = require('../../utils/middleware');

// --- Transaksi (Butuh izin pos.order) ---
router.post('/order', mw.verifyToken, mw.can('pos.order'), FnbController.orderPost);
router.get('/order', mw.verifyToken, mw.can('pos.order'), FnbController.orderGet);
router.put('/order', mw.verifyToken, mw.can('pos.order'), FnbController.orderPut);
router.get('/order/:order_id', mw.verifyToken, mw.can('pos.order'), FnbController.orderGetById);
router.patch('/order/:order_id/pay', mw.verifyToken, mw.can('pos.order'), FnbController.orderPay);

// --- Void / Delete (Butuh izin KHUSUS: pos.refund) ---
// Kasir biasa mungkin bisa order, tapi tidak boleh delete sembarangan
router.delete('/order', mw.verifyToken, mw.can('pos.refund'), FnbController.orderDelete);

// --- Laporan via Email (Butuh izin report.sales) ---
router.post('/order/report', mw.verifyToken, mw.can('report.sales'), FnbController.orderReport);
router.post('/report', mw.verifyToken, mw.can('report.sales'), FnbController.report);

module.exports = router;