// file: src/api/v1/userRouter.js
const router = require('express').Router();
const UserController = require('../../controllers/UserController');
const mw = require('../../utils/middleware');

// --- 1. ROUTES STATIS & KHUSUS (Taruh Paling Atas) ---

// List Permissions (Kamus)
router.get('/permissions', mw.verifyToken, UserController.permissionList);

// Role CRUD
router.get('/roles', mw.verifyToken, UserController.roleList); // Alias standar REST
router.get('/list-roles', mw.verifyToken, UserController.roleList); // Alias legacy (jika frontend masih pakai)
router.post('/roles', mw.verifyToken, mw.can('user.create'), UserController.roleCreate); // Izin sementara ikut user.create
router.put('/roles/:id', mw.verifyToken, mw.can('user.edit'), UserController.roleUpdate);
router.delete('/roles/:id', mw.verifyToken, mw.can('user.delete'), UserController.roleRemove);


// --- 2. USER CRUD (Umum) ---
router.get('/', mw.verifyToken, mw.can('user.view'), UserController.list);
router.post('/', mw.verifyToken, mw.can('user.create'), UserController.create);

// --- 3. ROUTES DINAMIS USER (Taruh Paling Bawah) ---
// Hati-hati: /:id akan menangkap string apapun setelah /users/
router.put('/:id', mw.verifyToken, mw.can('user.edit'), UserController.update);
router.delete('/:id', mw.verifyToken, mw.can('user.delete'), UserController.remove);

module.exports = router;