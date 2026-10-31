const router = require('express').Router();
const { updateMe, uploadPhoto } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { uploadProfile } = require('../middleware/upload');
router.use(authenticate);
router.put('/me', updateMe);
router.post('/me/photo', uploadProfile.single('photo'), uploadPhoto);
module.exports = router;
