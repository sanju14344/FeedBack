const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/departments', publicController.getDepartments);
router.get('/subjects/:dept_id', publicController.getSubjects);
router.get('/staff/:dept_id', publicController.getStaff);
router.get('/departments-by-year/:year', publicController.getDepartmentsByYear);
router.post('/submit-feedback', publicController.submitFeedback);

module.exports = router;
