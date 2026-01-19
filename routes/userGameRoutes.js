const express = require('express');
const router = express.Router();

const userGameController = require('../controllers/userGameController');
const authController = require('../controllers/authController');

router.route('/play').post(authController.protect, userGameController.play);
router.route('/guess').post(authController.protect, userGameController.guess);

module.exports = router;
