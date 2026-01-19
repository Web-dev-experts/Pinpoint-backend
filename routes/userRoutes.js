const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();

router.route('/signup').post(authController.signup);
router.route('/login').post(authController.login);
router.route('/logout').get(authController.protect, authController.logout);
router
  .route('/forgetPassword')
  .post(authController.protect, authController.forgetPassword);
router
  .route('/resetPassword/:token')
  .patch(authController.protect, authController.resetPassword);
router
  .route('/updateRole/:id')
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    authController.updateRole
  );

router.route('/getMe').get(authController.protect, userController.getMe);
router
  .route('/updateMe')
  .patch(authController.protect, userController.updateMe);
router
  .route('/deleteMe')
  .patch(authController.protect, userController.deleteMe);

module.exports = router;
