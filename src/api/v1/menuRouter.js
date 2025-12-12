const router = require('express').Router();
const MenuController = require('../../controllers/MenuController');
const mw = require('../../utils/middleware');

// --- Kategori ---
router.get('/', mw.verifyToken, mw.can('product.view'), MenuController.menuGet);
router.post('/', mw.verifyToken, mw.can('product.create'), MenuController.menuPost);
router.put('/:id', mw.verifyToken, mw.can('product.edit'), MenuController.menuPut);
router.delete('/:id', mw.verifyToken, mw.can('product.delete'), MenuController.menuDelete);

// --- Cache Management ---
router.post('/clear-cache', mw.verifyToken, mw.can('product.edit'), MenuController.clearCache);

// --- Items / Produk ---
router.get('/categories', mw.verifyToken, mw.can('product.view'), MenuController.categoriesGet);
router.get('/items', mw.verifyToken, mw.can('product.view'), MenuController.itemsGet);

router.post('/item', mw.verifyToken, mw.can('product.create'), MenuController.itemCreate);
router.get('/item/:id', mw.verifyToken, mw.can('product.view'), MenuController.itemDetail);
router.put('/item/:id', mw.verifyToken, mw.can('product.edit'), MenuController.itemUpdate);
router.delete('/item/:id', mw.verifyToken, mw.can('product.delete'), MenuController.itemDelete);

// --- Modifiers ---
router.get('/modifier-lists', mw.verifyToken, mw.can('product.view'), MenuController.modifierListsGet);
// TAMBAHKAN INI:
router.post('/modifier-lists', mw.verifyToken, mw.can('product.create'), MenuController.modifierListCreate);
router.put('/modifier-lists/:id', mw.verifyToken, mw.can('product.edit'), MenuController.modifierListUpdate);
router.delete('/modifier-lists/:id', mw.verifyToken, mw.can('product.delete'), MenuController.modifierListDelete);

module.exports = router;