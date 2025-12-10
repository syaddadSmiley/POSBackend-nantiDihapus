const router = require('express').Router();
const UserController = require('../../controller/UserController');
const mw = require('../../utils/middleware');

router.post('/login', UserController.login)
router.get('/verify', mw.verifyToken, (req, res) => {
        res.status(200).json(req.decoded.payloadToken); 
    });

module.exports = router;