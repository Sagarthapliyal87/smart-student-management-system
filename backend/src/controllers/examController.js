const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

/** GET /api/exams — upcoming exams relevant to the user (student's class, child's class, or all for staff) */
const listExams = asyncHandler(async (req, res) => {
  let classIds = null;
  if (req.user.role === 'STUDENT') {
    const s = await prisma.student.findUnique({ where: { userId: req.user.id } });
    classIds = s?.classId ? [s.classId] : [];
  } else if (req.user.role === 'PARENT') {
    const p = await prisma.parent.findUnique({ where: { userId: req.user.id }, include: { children: { include: { student: true } } } });
    classIds = (p?.children || []).map((c) => c.student.classId).filter(Boolean);
  }
  const exams = await prisma.exam.findMany({
    where: { examDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, ...(classIds ? { subject: { classId: { in: classIds } } } : {}) },
    include: { subject: { include: { class: { include: { course: true } } } } },
    orderBy: { examDate: 'asc' },
  });
  res.json(exams);
});

const createExam = asyncHandler(async (req, res) => {
  const { subjectId, title, examType, examDate, startTime, room } = req.body;
  if (!subjectId || !title || !examType || !examDate) return res.status(400).json({ error: 'subjectId, title, examType and examDate are required.' });
  const exam = await prisma.exam.create({
    data: { subjectId: Number(subjectId), title, examType, examDate: new Date(examDate), startTime, room },
    include: { subject: true },
  });
  // Notify students of that class (best-effort)
  try {
    const students = await prisma.student.findMany({ where: { classId: exam.subject.classId }, select: { userId: true } });
    if (students.length) {
      await prisma.notification.createMany({
        data: students.map((s) => ({ userId: s.userId, type: 'EXAM', message: `Exam scheduled: ${exam.subject.name} - ${title} on ${new Date(examDate).toLocaleDateString()}.` })),
      });
    }
  } catch (e) { console.error('Exam notification failed (non-fatal):', e.message); }
  res.status(201).json(exam);
});

const deleteExam = asyncHandler(async (req, res) => {
  await prisma.exam.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Exam removed.' });
});

module.exports = { listExams, createExam, deleteExam };
