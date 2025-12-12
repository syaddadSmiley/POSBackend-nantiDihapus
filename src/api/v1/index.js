
const router = require('express').Router();
const fnbRouter = require('./orderRouter');
const authRouter = require('./authRouter');
const menuRouter = require('./menuRouter');
const membersRouter = require('./membersRouter')
const shiftRouter = require('./shiftRouter')
const taxes = require('./taxRouter');
const reportRouter = require('./reportRouter');
const userRouter = require('./userRouter');
const inventoryRouter = require('./inventoryRouter');

router.use('/fnb', fnbRouter);
router.use('/auth', authRouter);
router.use('/menu', menuRouter);
router.use('/members', membersRouter);
router.use('/shift', shiftRouter);
router.use('/taxes', taxes);
router.use('/reports', reportRouter);
router.use('/users', userRouter);
router.use('/inventory', inventoryRouter);

module.exports = router;
    