const router = require('express').Router();
const CarwashController = require('../../controller/CarwashController');
const mw = require('../../utils/middleware');


// const fnbController = new FnbController(app);
router.post('/order', CarwashController.orderPost);
// router.delete('/order', mw.testAccess, CarwashController.orderDelete);
router.get('/order', CarwashController.orderGet)
router.put('/order', CarwashController.orderPut)
router.post('/order/report', CarwashController.orderReport)
router.post('/report', CarwashController.report)
module.exports = router;









