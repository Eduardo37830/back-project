const express = require('express');
const router = express.Router();
const authRoutes = require('./AuthRoutes');
const userRoutes = require('./UserRoutes');
const townsRoutes = require('./TownsRoutes');

router.use('/auth', authRoutes);

router.use('/users', userRoutes);

router.use('/towns', townsRoutes);

module.exports = router;

//Enrutador global
