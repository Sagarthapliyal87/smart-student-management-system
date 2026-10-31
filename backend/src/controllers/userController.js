const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

/** PUT /api/users/me — update own name/phone/password */
const updateMe = asyncHandler(async (req, res) => {
  const { name, phone, currentPassword, newPassword } = req.body;
  const data = {};
  if (name) data.name = name;
  if (phone !== undefined) data.phone = phone;

  if (newPassword) {
    if (!currentPassword) return res.status(400).json({ error: 'Current password is required to set a new password.' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  const updated = await prisma.user.update({
    where: { id: req.user.id }, data,
    select: { id: true, name: true, email: true, role: true, phone: true, profilePhoto: true },
  });
  res.json(updated);
});

/** POST /api/users/me/photo */
const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { profilePhoto: `/uploads/profiles/${req.file.filename}` },
    select: { id: true, profilePhoto: true },
  });
  res.json(updated);
});

module.exports = { updateMe, uploadPhoto };
