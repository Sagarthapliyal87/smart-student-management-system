const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const userSelect = { id: true, name: true, email: true, phone: true, isActive: true };

const listTeachers = asyncHandler(async (req, res) => {
  const teachers = await prisma.teacher.findMany({
    include: { user: { select: userSelect }, subjects: { include: { subject: { include: { class: { include: { course: true } } } } } } },
    orderBy: { id: 'asc' },
  });
  res.json(teachers);
});

const createTeacher = asyncHandler(async (req, res) => {
  const { name, email, password, phone, department, designation } = req.body;
  if (!name || !email || !password || !department) {
    return res.status(400).json({ error: 'name, email, password and department are required.' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const teacher = await prisma.teacher.create({
    data: {
      department, designation,
      user: { create: { name, email: email.trim().toLowerCase(), phone, passwordHash: await bcrypt.hash(password, 10), role: 'TEACHER' } },
    },
    include: { user: { select: userSelect } },
  });
  res.status(201).json(teacher);
});

const updateTeacher = asyncHandler(async (req, res) => {
  const { department, designation, name, phone } = req.body;
  const teacher = await prisma.teacher.update({
    where: { id: Number(req.params.id) },
    data: { department, designation, user: name || phone !== undefined ? { update: { name, phone } } : undefined },
    include: { user: { select: userSelect } },
  });
  res.json(teacher);
});

const deactivateTeacher = asyncHandler(async (req, res) => {
  const teacher = await prisma.teacher.findUnique({ where: { id: Number(req.params.id) } });
  if (!teacher) return res.status(404).json({ error: 'Teacher not found.' });
  await prisma.user.update({ where: { id: teacher.userId }, data: { isActive: false } });
  res.json({ message: 'Teacher account deactivated.' });
});

const assignSubject = asyncHandler(async (req, res) => {
  const { subjectId } = req.body;
  if (!subjectId) return res.status(400).json({ error: 'subjectId is required.' });
  const link = await prisma.teacherSubject.create({
    data: { teacherId: Number(req.params.id), subjectId: Number(subjectId) },
  });
  res.status(201).json(link);
});

const unassignSubject = asyncHandler(async (req, res) => {
  await prisma.teacherSubject.delete({
    where: { teacherId_subjectId: { teacherId: Number(req.params.id), subjectId: Number(req.params.subjectId) } },
  });
  res.json({ message: 'Subject unassigned.' });
});

/** GET /api/teachers/me/subjects — the logged-in teacher's assigned subjects (with class and students) */
const mySubjects = asyncHandler(async (req, res) => {
  const teacher = await prisma.teacher.findUnique({
    where: { userId: req.user.id },
    include: { subjects: { include: { subject: { include: { class: { include: { course: true } } } } } } },
  });
  if (!teacher) return res.status(403).json({ error: 'No teacher profile linked to this account.' });
  res.json(teacher.subjects.map((ts) => ts.subject));
});

module.exports = { listTeachers, createTeacher, updateTeacher, deactivateTeacher, assignSubject, unassignSubject, mySubjects };
