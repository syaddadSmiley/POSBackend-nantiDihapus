const router = require('express').Router();
const InventoryController = require('../../controllers/InventoryController');
const mw = require('../../utils/middleware');

// History: User.view atau Inventory.view
router.get('/history', mw.verifyToken, mw.can('inventory.view'), InventoryController.history);

// Update Stok: Butuh izin khusus 'inventory.manage'
router.post('/update', mw.verifyToken, mw.can('inventory.manage'), InventoryController.update);

module.exports = router;