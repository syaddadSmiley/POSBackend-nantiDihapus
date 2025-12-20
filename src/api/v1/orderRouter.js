const router = require('express').Router();
const FnbController = require('../../controllers/FnbController');
const mw = require('../../utils/middleware');

// --- Transaksi (Butuh izin pos.order) ---
router.post('/order', mw.verifyToken, mw.can('pos.order'), FnbController.orderPost);
router.get('/order', mw.verifyToken, mw.can('pos.order'), FnbController.orderGet);
router.put('/order', mw.verifyToken, mw.can('pos.order'), FnbController.orderPut);
router.get('/order/:order_id', mw.verifyToken, mw.can('pos.order'), FnbController.orderGetById);
router.patch('/order/:order_id/pay', mw.verifyToken, mw.can('pos.order'), FnbController.orderPay);
router.post('/order/calculate', mw.verifyToken, mw.can('pos.order'), FnbController.orderCalculate);

// --- Void / Delete (Butuh izin KHUSUS: pos.refund) ---
// Kasir biasa mungkin bisa order, tapi tidak boleh delete sembarangan
router.delete('/order/:order_id', mw.verifyToken, mw.can('pos.refund'), FnbController.orderDelete);

// --- Laporan via Email (Butuh izin report.sales) ---
router.post('/order/report', mw.verifyToken, mw.can('report.sales'), FnbController.orderReport);
router.post('/report', mw.verifyToken, mw.can('report.sales'), FnbController.report);
router.delete('/order/:order_id/items/:order_item_id', mw.verifyToken, FnbController.orderVoidItem);

router.get('/vouchers', mw.verifyToken, mw.can('pos.promo'), FnbController.voucherGet);
router.post('/vouchers', mw.verifyToken, mw.can('pos.promo'), FnbController.voucherPost);
router.put('/vouchers/:id', mw.verifyToken, mw.can('pos.promo'), FnbController.voucherPut);
router.delete('/vouchers/:id', mw.verifyToken, mw.can('pos.promo'), FnbController.voucherDelete);

module.exports = router;