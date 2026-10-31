const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { teacherTeachesSubject } = require('../utils/access');

/** POST /api/assignments — teacher (for own subject); creates PENDING submissions for the class */
const createAssignment = asyncHandler(async (req, res) => {
  const { subjectId, title, description, deadline, maxMarks } = req.body;
  if (!subjectId || !title || !description || !deadline || !maxMarks) {
    return res.status(400).json({ error: 'subjectId, title, description, deadline and maxMarks are required.' });
  }
  const teacher = await teacherTeachesSubject(req.user.id, Number(subjectId));
  if (!teacher) return res.status(403).json({ error: 'You can only create assignments for subjects assigned to you.' });
  const subject = await prisma.subject.findUnique({ where: { id: Number(subjectId) } });
  const students = await prisma.student.findMany({ where: { classId: subject.classId } });

  const assignment = await prisma.assignment.create({
    data: {
      subjectId: subject.id, teacherId: teacher.id, title, description,
      attachmentPath: req.file ? `/uploads/assignments/${req.file.filename}` : null,
      deadline: new Date(deadline), maxMarks: Number(maxMarks),
      submissions: { create: students.map((s) => ({ studentId: s.id, status: 'PENDING' })) },
    },
    include: { subject: true },
  });
  if (students.length) {
    await prisma.notification.createMany({
      data: students.map((s) => ({ userId: s.userId, type: 'ASSIGNMENT', message: `New assignment in ${subject.name}: ${title}` })),
    });
  }
  res.status(201).json(assignment);
});

/** GET /api/assignments/mine — teacher's own assignments with submission counts */
const listMine = asyncHandler(async (req, res) => {
  const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
  if (!teacher) return res.status(403).json({ error: 'No teacher profile linked.' });
  res.json(await prisma.assignment.findMany({
    where: { teacherId: teacher.id }, include: { subject: true, submissions: { select: { status: true } } }, orderBy: { deadline: 'desc' },
  }));
});

/** GET /api/assignments/my — student's assignments with own submission status */
const getMyAssignments = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
  if (!student) return res.status(403).json({ error: 'Only students have assignment lists.' });
  const submissions = await prisma.submission.findMany({
    where: { studentId: student.id },
    include: { assignment: { include: { subject: true, teacher: { include: { user: { select: { name: true } } } } } } },
    orderBy: { assignment: { deadline: 'asc' } },
  });
  const now = new Date();
  res.json(submissions.map((s) => ({ ...s, status: s.status === 'PENDING' && new Date(s.assignment.deadline) < now ? 'LATE' : s.status })));
});

/** POST /api/assignments/:id/submit — student uploads their work */
const submitAssignment = asyncHandler(async (req, res) => {
  const assignmentId = Number(req.params.id);
  if (!req.file) return res.status(400).json({ error: 'A file upload is required to submit.' });
  const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
  if (!student) return res.status(403).json({ error: 'Only students can submit assignments.' });
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId }, include: { subject: true } });
  if (!assignment || assignment.subject.classId !== student.classId) return res.status(404).json({ error: 'Assignment not found for your class.' });

  const existing = await prisma.submission.findUnique({ where: { assignmentId_studentId: { assignmentId, studentId: student.id } } });
  if (existing?.status === 'CHECKED') return res.status(400).json({ error: 'This submission has already been graded.' });

  const status = new Date() > new Date(assignment.deadline) ? 'LATE' : 'SUBMITTED';
  const filePath = `/uploads/assignments/${req.file.filename}`;
  const submission = await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
    update: { filePath, submittedAt: new Date(), status },
    create: { assignmentId, studentId: student.id, filePath, submittedAt: new Date(), status },
  });
  res.json(submission);
});

/** GET /api/assignments/:id/submissions — teacher of that assignment */
const listSubmissions = asyncHandler(async (req, res) => {
  const assignment = await prisma.assignment.findUnique({ where: { id: Number(req.params.id) } });
  if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });
  if (req.user.role === 'TEACHER' && !(await teacherTeachesSubject(req.user.id, assignment.subjectId))) {
    return res.status(403).json({ error: 'This assignment is not yours.' });
  }
  res.json(await prisma.submission.findMany({
    where: { assignmentId: assignment.id },
    include: { student: { include: { user: { select: { name: true } } } } },
    orderBy: { student: { rollNumber: 'asc' } },
  }));
});

/** PUT /api/assignments/submissions/:id/grade */
const gradeSubmission = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const marksAwarded = Number(req.body.marksAwarded);
  if (req.body.marksAwarded === undefined || req.body.marksAwarded === '' || Number.isNaN(marksAwarded)) {
    return res.status(400).json({ error: 'marksAwarded is required.' });
  }
  const sub = await prisma.submission.findUnique({ where: { id }, include: { assignment: true, student: true } });
  if (!sub) return res.status(404).json({ error: 'Submission not found.' });
  const teacher = await teacherTeachesSubject(req.user.id, sub.assignment.subjectId);
  if (!teacher) return res.status(403).json({ error: 'You can only grade your own assignments.' });
  if (!sub.filePath) return res.status(400).json({ error: 'This student has not submitted anything yet.' });
  if (marksAwarded < 0 || marksAwarded > sub.assignment.maxMarks) return res.status(400).json({ error: `Marks must be between 0 and ${sub.assignment.maxMarks}.` });

  const updated = await prisma.submission.update({ where: { id }, data: { marksAwarded, status: 'CHECKED' } });
  await prisma.mark.create({
    data: { studentId: sub.studentId, subjectId: sub.assignment.subjectId, examType: 'ASSIGNMENT', score: marksAwarded, maxScore: sub.assignment.maxMarks, enteredById: teacher.id },
  });
  await prisma.notification.create({
    data: { userId: sub.student.userId, type: 'ASSIGNMENT', message: `Your assignment "${sub.assignment.title}" was graded: ${marksAwarded}/${sub.assignment.maxMarks}.` },
  });
  res.json(updated);
});

module.exports = { createAssignment, listMine, getMyAssignments, submitAssignment, listSubmissions, gradeSubmission };
