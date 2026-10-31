const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const userSelect = { id: true, name: true, email: true, phone: true, isActive: true };

const listParents = asyncHandler(async (req, res) => {
  const parents = await prisma.parent.findMany({
    include: { user: { select: userSelect }, children: { include: { student: { include: { user: { select: { name: true } } } } } } },
    orderBy: { id: 'asc' },
  });
  res.json(parents);
});

const createParent = asyncHandler(async (req, res) => {
  const { name, email, password, phone, occupation } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const parent = await prisma.parent.create({
    data: {
      occupation,
      user: { create: { name, email: email.trim().toLowerCase(), phone, passwordHash: await bcrypt.hash(password, 10), role: 'PARENT' } },
    },
    include: { user: { select: userSelect } },
  });
  res.status(201).json(parent);
});

const deactivateParent = asyncHandler(async (req, res) => {
  const parent = await prisma.parent.findUnique({ where: { id: Number(req.params.id) } });
  if (!parent) return res.status(404).json({ error: 'Parent not found.' });
  await prisma.user.update({ where: { id: parent.userId }, data: { isActive: false } });
  res.json({ message: 'Parent account deactivated.' });
});

module.exports = { listParents, createParent, deactivateParent };
