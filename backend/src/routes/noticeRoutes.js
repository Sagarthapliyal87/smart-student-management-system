const router = require('express').Router();
const c = require('../controllers/noticeController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
router.use(authenticate);
router.get('/', c.listNotices);
router.post('/', requireRole('ADMIN', 'TEACHER'), c.createNotice);
router.delete('/:id', requireRole('ADMIN', 'TEACHER'), c.deleteNotice);
module.exports = router;
