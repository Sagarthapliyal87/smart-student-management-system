const router = require('express').Router();
const c = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
router.use(authenticate);
router.post('/', requireRole('TEACHER'), c.markAttendance);
router.get('/roster', requireRole('TEACHER'), c.getRoster);
router.get('/student/:studentId', requireRole('ADMIN', 'TEACHER', 'STUDENT', 'PARENT'), c.getStudentAttendance);
module.exports = router;
