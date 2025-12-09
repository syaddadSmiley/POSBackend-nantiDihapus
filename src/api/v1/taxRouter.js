
const router = require('express').Router();
const TaxController = require('../../controller/TaxController');
const mw = require('../../utils/middleware');

// Endpoint: GET /api/v1/taxes
router.get('/', mw.verifyToken, TaxController.getTaxes);

module.exports = router;