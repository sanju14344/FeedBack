const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/check-cr', authController.checkCr);
router.post('/cr-signup', authController.crSignup);
router.post('/cr-login', authController.crLogin);
router.get('/cr-profile', authController.getCrProfile);
router.post('/admin-login', authController.adminLogin);
router.get('/admin-check', authController.adminCheck);

module.exports = router;
