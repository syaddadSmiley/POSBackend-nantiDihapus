const router = require('express').Router();
const AuthController = require('../../controller/AuthController');
const mw = require('../../utils/middleware');

router.post('/login', AuthController.login)
router.get('/verify', mw.verifyToken, (req, res) => {
        res.status(200).json(req.decoded.payloadToken); 
    });

module.exports = router;