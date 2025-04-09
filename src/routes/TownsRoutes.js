const express = require('express');
const router = express.Router();
const { uploadFromBatch, getTowns } = require('../controllers/TownsController');

const multer = require('multer');
const upload = multer();

router.get('/', getTowns);

router.post('/batch', upload.single('csv-file'), uploadFromBatch);

module.exports = router;
