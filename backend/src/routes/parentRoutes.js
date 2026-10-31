const router = require('express').Router();
const c = require('../controllers/parentController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
router.use(authenticate, requireRole('ADMIN'));
router.get('/', c.listParents);
router.post('/', c.createParent);
router.delete('/:id', c.deactivateParent);
module.exports = router;
