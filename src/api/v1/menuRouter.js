const router = require('express').Router();
const MenuController = require('../../controller/MenuController');
const mw = require('../../utils/middleware');


router.get('/', MenuController.menuGet);
router.delete('/:id', mw.verifyToken, MenuController.menuDelete);
router.put('/:id', mw.verifyToken, MenuController.menuPut);
router.post('/', mw.verifyToken, MenuController.menuPost);

router.post('/clear-cache', MenuController.clearCache);

router.get('/categories', MenuController.categoriesGet);

router.get('/items', MenuController.itemsGet);
router.post('/item', mw.verifyToken, MenuController.itemCreate);
router.get('/item/:id', mw.verifyToken, MenuController.itemDetail);
router.put('/item/:id', mw.verifyToken, MenuController.itemUpdate);
router.delete('/item/:id', mw.verifyToken, MenuController.itemDelete);

router.get('/modifier-lists', mw.verifyToken, MenuController.modifierListsGet);

module.exports = router;
