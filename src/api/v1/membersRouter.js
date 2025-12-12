const router = require('express').Router();
const MembersController = require('../../controllers/MembersController');
const mw = require('../../utils/middleware');

router.get('/:plat', MembersController.membersGet)
router.post('/', MembersController.membersPost)

module.exports = router;