const router = require('express').Router();
const c = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);
router.get('/', c.getMyNotifications);
router.put('/read-all', c.markAllAsRead);
router.put('/:id/read', c.markAsRead);
module.exports = router;
