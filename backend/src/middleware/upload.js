const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const ALLOWED_MIME = {
  profiles: ['image/jpeg', 'image/png', 'image/webp'],
  documents: ['image/jpeg', 'image/png', 'application/pdf'],
  assignments: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  notes: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function makeUploader(category) {
  const dir = path.join(UPLOAD_ROOT, category);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, dir),
      filename: (req, file, cb) =>
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
    }),
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_MIME[category].includes(file.mimetype)) {
        const err = new Error(`Invalid file type for ${category}.`);
        err.status = 400;
        return cb(err);
      }
      cb(null, true);
    },
    limits: { fileSize: MAX_SIZE_BYTES },
  });
}

module.exports = {
  uploadProfile: makeUploader('profiles'),
  uploadDocument: makeUploader('documents'),
  uploadAssignment: makeUploader('assignments'),
  uploadNote: makeUploader('notes'),
};
