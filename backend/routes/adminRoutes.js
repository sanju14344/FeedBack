const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/feedback', adminController.getFeedback);
router.get('/insights', adminController.getInsights);

router.get('/crs', adminController.getCRs);
router.post('/cr/approve', adminController.approveCR);
router.post('/cr/reject', adminController.rejectCR);

// Staff & Subject Management
router.post('/staff', adminController.createStaff);
router.put('/staff/:id', adminController.updateStaff);
router.delete('/staff/:id', adminController.deleteStaff);
router.post('/subjects', adminController.createSubject);
router.put('/subjects/:id', adminController.updateSubject);
router.delete('/subjects/:id', adminController.deleteSubject);

module.exports = router;
