const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const userSelect = { id: true, name: true, email: true, phone: true, profilePhoto: true, isActive: true };

/** GET /api/students?classId=&search= */
const listStudents = asyncHandler(async (req, res) => {
  const { classId, search } = req.query;
  const where = {};
  if (classId) where.classId = Number(classId);
  if (search) where.OR = [{ rollNumber: { contains: search } }, { user: { name: { contains: search } } }];
  const students = await prisma.student.findMany({
    where,
    include: { user: { select: userSelect }, class: { include: { course: true } } },
    orderBy: { rollNumber: 'asc' },
  });
  res.json(students);
});

/** GET /api/students/:id */
const getStudent = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (req.user.role === 'STUDENT') {
    const own = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!own || own.id !== id) return res.status(403).json({ error: 'You can only view your own profile.' });
  }
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: { select: userSelect },
      class: { include: { course: true } },
      parents: { include: { parent: { include: { user: { select: { id: true, name: true, email: true } } } } } },
    },
  });
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  res.json(student);
});

/** POST /api/students (Admin) */
const createStudent = asyncHandler(async (req, res) => {
  const { name, email, password, phone, rollNumber, classId, admissionDate, address } = req.body;
  if (!name || !email || !password || !rollNumber) {
    return res.status(400).json({ error: 'name, email, password and rollNumber are required.' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const student = await prisma.student.create({
    data: {
      rollNumber, address,
      classId: classId ? Number(classId) : null,
      admissionDate: admissionDate ? new Date(admissionDate) : null,
      user: { create: { name, email: email.trim().toLowerCase(), phone, passwordHash: await bcrypt.hash(password, 10), role: 'STUDENT' } },
    },
    include: { user: { select: userSelect }, class: true },
  });
  res.status(201).json(student);
});

/** PUT /api/students/:id (Admin) */
const updateStudent = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { classId, address, rollNumber, name, phone } = req.body;
  const student = await prisma.student.update({
    where: { id },
    data: {
      classId: classId === '' || classId === null ? null : classId !== undefined ? Number(classId) : undefined,
      address, rollNumber,
      user: name || phone !== undefined ? { update: { name, phone } } : undefined,
    },
    include: { user: { select: userSelect }, class: true },
  });
  res.json(student);
});

/** DELETE /api/students/:id — soft delete (deactivate) */
const deactivateStudent = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { id: Number(req.params.id) } });
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  await prisma.user.update({ where: { id: student.userId }, data: { isActive: false } });
  res.json({ message: 'Student account deactivated.' });
});

/** POST /api/students/:id/parents */
const linkParent = asyncHandler(async (req, res) => {
  const { parentId, relation } = req.body;
  if (!parentId || !relation) return res.status(400).json({ error: 'parentId and relation are required.' });
  const link = await prisma.studentParent.create({
    data: { studentId: Number(req.params.id), parentId: Number(parentId), relation },
  });
  res.status(201).json(link);
});

module.exports = { listStudents, getStudent, createStudent, updateStudent, deactivateStudent, linkParent };
