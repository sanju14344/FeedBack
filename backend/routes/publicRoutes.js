const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const sessionController = require('../controllers/sessionController');

router.get('/departments', publicController.getDepartments);
router.get('/subjects/:dept_id', publicController.getSubjects);
router.get('/staff/:dept_id', publicController.getStaff);
router.get('/departments-by-year/:year', publicController.getDepartmentsByYear);
router.post('/submit-feedback', publicController.submitFeedback);
router.get('/submitted-subjects', publicController.getSubmittedSubjects);

// Public: students check if a session is active for their department
router.get('/session-status', sessionController.getSessionStatus);

module.exports = router;
