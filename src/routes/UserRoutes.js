const express = require('express');
const router = express.Router();

const {getAllUsers, getUserbyId} = require('../controllers/UsersController');

router.get('/', getAllUsers);

router.get('/:id', getUserbyId);

module.exports = router;