const router = require('express').Router();
const FnbController = require('../../controller/FnbController');
const mw = require('../../utils/middleware');

router.post('/order', mw.verifyToken, FnbController.orderPost);
router.delete('/order', mw.testAccess, FnbController.orderDelete);
router.get('/order', FnbController.orderGet)
router.put('/order', FnbController.orderPut)
router.post('/order/report', FnbController.orderReport)
router.post('/report', FnbController.report)
router.patch('/order/:order_id/pay', mw.verifyToken, FnbController.orderPay);
router.get('/order/:order_id', mw.verifyToken, FnbController.orderGetById);

module.exports = router;
