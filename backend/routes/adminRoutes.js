const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/feedback', adminController.getFeedback);
router.get('/insights', adminController.getInsights);

module.exports = router;
