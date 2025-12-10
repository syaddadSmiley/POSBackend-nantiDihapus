
const router = require('express').Router();
const fnbRouter = require('./fnbRouter');
const carwashRouter = require('./carwashRouter');
const authRouter = require('./authRouter');
const menuRouter = require('./menuRouter');
const membersRouter = require('./membersRouter')
const shiftRouter = require('./shiftRouter')
const dashboardRouter = require('./dashboardRouter')
const taxes = require('./taxRouter');
const reportRouter = require('./reportRouter');
const userRouter = require('./userRouter');

router.use('/fnb', fnbRouter);
router.use('/carwash', carwashRouter);
router.use('/auth', authRouter);
router.use('/menu', menuRouter);
router.use('/members', membersRouter);
router.use('/shift', shiftRouter);
router.use('/dashboard', dashboardRouter);
router.use('/taxes', taxes);
router.use('/reports', reportRouter);
router.use('/users', userRouter);

module.exports = router;
    