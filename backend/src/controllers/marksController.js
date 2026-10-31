const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { computeSGPA, groupMarksBySubject } = require('../utils/helpers');
const { canViewStudent, teacherTeachesSubject } = require('../utils/access');

const EXAM_TYPES = ['INTERNAL', 'MID_SEM', 'END_SEM', 'PRACTICAL', 'ASSIGNMENT'];

/** POST /api/marks — only for subjects the teacher teaches, and students of that subject's class */
const enterMarks = asyncHandler(async (req, res) => {
  const { studentId, subjectId, examType, score, maxScore } = req.body;
  if (!studentId || !subjectId || !examType || score === undefined || score === '' || !maxScore) {
    return res.status(400).json({ error: 'studentId, subjectId, examType, score and maxScore are required.' });
  }
  if (!EXAM_TYPES.includes(examType)) return res.status(400).json({ error: 'Invalid exam type.' });
  if (Number(score) < 0 || Number(score) > Number(maxScore)) return res.status(400).json({ error: 'Score must be between 0 and the maximum score.' });

  const teacher = await teacherTeachesSubject(req.user.id, Number(subjectId));
  if (!teacher) return res.status(403).json({ error: 'You can only enter marks for subjects assigned to you.' });

  const subject = await prisma.subject.findUnique({ where: { id: Number(subjectId) } });
  const student = await prisma.student.findUnique({ where: { id: Number(studentId) } });
  if (!student || student.classId !== subject.classId) return res.status(400).json({ error: 'This student is not in the subject\'s class.' });

  const mark = await prisma.mark.create({
    data: { studentId: student.id, subjectId: subject.id, examType, score: Number(score), maxScore: Number(maxScore), enteredById: teacher.id },
    include: { subject: true },
  });
  await prisma.notification.create({
    data: { userId: student.userId, type: 'MARKS', message: `New marks posted for ${subject.name} (${examType.replace('_', ' ')}): ${score}/${maxScore}.` },
  });
  res.status(201).json(mark);
});

/** GET /api/marks/subject/:subjectId — teacher: marks entered for a subject */
const listBySubject = asyncHandler(async (req, res) => {
  const subjectId = Number(req.params.subjectId);
  if (!(await teacherTeachesSubject(req.user.id, subjectId))) return res.status(403).json({ error: 'This subject is not assigned to you.' });
  res.json(await prisma.mark.findMany({
    where: { subjectId }, include: { student: { include: { user: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 100,
  }));
});

/** PUT /api/marks/:id */
const updateMark = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.mark.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Mark not found.' });
  if (!(await teacherTeachesSubject(req.user.id, existing.subjectId))) return res.status(403).json({ error: 'You can only edit marks for your own subjects.' });
  const score = req.body.score !== undefined ? Number(req.body.score) : existing.score;
  const maxScore = req.body.maxScore !== undefined ? Number(req.body.maxScore) : existing.maxScore;
  if (score < 0 || score > maxScore) return res.status(400).json({ error: 'Score must be between 0 and the maximum score.' });
  res.json(await prisma.mark.update({ where: { id }, data: { score, maxScore } }));
});

/** GET /api/marks/student/:studentId */
const getStudentMarks = asyncHandler(async (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!(await canViewStudent(req.user, studentId))) return res.status(403).json({ error: 'You are not allowed to view these marks.' });
  const marks = await prisma.mark.findMany({ where: { studentId }, include: { subject: true }, orderBy: { createdAt: 'desc' } });
  const bySubject = groupMarksBySubject(marks);
  const overallPercentage = bySubject.length ? Math.round((bySubject.reduce((a, s) => a + s.percentage, 0) / bySubject.length) * 100) / 100 : 0;
  res.json({ marks, bySubject, overallPercentage, sgpa: computeSGPA(bySubject) });
});

/** GET /api/marks/target?studentId=&subjectId=&target=  — "marks needed in final exam" helper */
const targetCalculator = asyncHandler(async (req, res) => {
  const studentId = Number(req.query.studentId), subjectId = Number(req.query.subjectId), target = Number(req.query.target);
  if (!studentId || !subjectId || !target) return res.status(400).json({ error: 'studentId, subjectId and target (percentage) are required.' });
  if (!(await canViewStudent(req.user, studentId))) return res.status(403).json({ error: 'Not allowed.' });
  const marks = await prisma.mark.findMany({ where: { studentId, subjectId, examType: { not: 'END_SEM' } } });
  const finalMax = Number(req.query.finalMax || 100);
  const doneScore = marks.reduce((a, m) => a + m.score, 0), doneMax = marks.reduce((a, m) => a + m.maxScore, 0);
  const needed = Math.ceil((target / 100) * (doneMax + finalMax) - doneScore);
  res.json({
    doneScore, doneMax, finalMax, target, neededInFinal: Math.max(needed, 0), achievable: needed <= finalMax,
  });
});

module.exports = { enterMarks, listBySubject, updateMark, getStudentMarks, targetCalculator };
