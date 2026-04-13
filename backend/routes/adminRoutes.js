const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/feedback', adminController.getFeedback);
router.get('/insights', adminController.getInsights);

router.get('/crs', adminController.getCRs);
router.post('/cr/approve', adminController.approveCR);
router.post('/cr/reject', adminController.rejectCR);

module.exports = router;
