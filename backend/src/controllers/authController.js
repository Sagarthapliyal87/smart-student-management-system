const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

/** POST /api/auth/login */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

/** GET /api/auth/me — full profile incl. student/teacher/parent record. Never returns passwordHash. */
const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, name: true, email: true, role: true, phone: true, profilePhoto: true, createdAt: true,
      student: { include: { class: { include: { course: true } } } },
      teacher: true,
      parent: true,
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json(user);
});

module.exports = { login, getMe };
