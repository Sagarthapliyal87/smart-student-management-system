const router = require('express').Router();
const c = require('../controllers/examController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
router.use(authenticate);
router.get('/', c.listExams);
router.post('/', requireRole('ADMIN'), c.createExam);
router.delete('/:id', requireRole('ADMIN'), c.deleteExam);
module.exports = router;
