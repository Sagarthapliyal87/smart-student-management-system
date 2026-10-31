const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { computeAttendancePercentage, LOW_ATTENDANCE_THRESHOLD } = require('../utils/helpers');
const { canViewStudent, teacherTeachesSubject } = require('../utils/access');

const VALID_STATUS = ['PRESENT', 'ABSENT', 'LEAVE'];

/** POST /api/attendance — teacher marks attendance (only for subjects they teach) */
const markAttendance = asyncHandler(async (req, res) => {
  const { subjectId, date, records } = req.body;
  if (!subjectId || !date || !Array.isArray(records) || !records.length) {
    return res.status(400).json({ error: 'subjectId, date and a non-empty records array are required.' });
  }
  if (records.some((r) => !VALID_STATUS.includes(r.status))) {
    return res.status(400).json({ error: 'Each record needs a status of PRESENT, ABSENT or LEAVE.' });
  }
  const teacher = await teacherTeachesSubject(req.user.id, Number(subjectId));
  if (!teacher) return res.status(403).json({ error: 'You can only mark attendance for subjects assigned to you.' });

  const day = new Date(date);
  await prisma.$transaction(records.map((r) =>
    prisma.attendance.upsert({
      where: { studentId_subjectId_date: { studentId: Number(r.studentId), subjectId: Number(subjectId), date: day } },
      update: { status: r.status, markedById: teacher.id },
      create: { studentId: Number(r.studentId), subjectId: Number(subjectId), date: day, status: r.status, markedById: teacher.id },
    })
  ));

  // Notify students who just dropped below the threshold (best-effort)
  try {
    for (const r of records) {
      if (r.status === 'ABSENT') {
        const all = await prisma.attendance.findMany({ where: { studentId: Number(r.studentId), subjectId: Number(subjectId) } });
        if (computeAttendancePercentage(all) < LOW_ATTENDANCE_THRESHOLD) {
          const st = await prisma.student.findUnique({ where: { id: Number(r.studentId) } });
          const subject = await prisma.subject.findUnique({ where: { id: Number(subjectId) } });
          await prisma.notification.create({
            data: { userId: st.userId, type: 'LOW_ATTENDANCE', message: `Low attendance warning: your ${subject.name} attendance is below ${LOW_ATTENDANCE_THRESHOLD}%.` },
          });
        }
      }
    }
  } catch (e) { console.error('Low-attendance notification failed (non-fatal):', e.message); }

  res.status(201).json({ message: 'Attendance recorded.', count: records.length });
});

/** GET /api/attendance/student/:studentId */
const getStudentAttendance = asyncHandler(async (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!(await canViewStudent(req.user, studentId))) return res.status(403).json({ error: 'You are not allowed to view this attendance.' });

  const where = { studentId };
  if (req.query.subjectId) where.subjectId = Number(req.query.subjectId);
  const records = await prisma.attendance.findMany({ where, include: { subject: true }, orderBy: { date: 'desc' } });

  const map = {};
  for (const r of records) (map[r.subjectId] ||= { subject: r.subject, records: [] }).records.push(r);
  const bySubject = Object.values(map).map((s) => {
    const percentage = computeAttendancePercentage(s.records);
    return { subject: s.subject, percentage, total: s.records.length, present: s.records.filter((r) => r.status === 'PRESENT').length, isLow: percentage < LOW_ATTENDANCE_THRESHOLD };
  });

  const overallPercentage = computeAttendancePercentage(records);
  res.json({ records, overallPercentage, bySubject, lowAttendanceWarning: records.length > 0 && overallPercentage < LOW_ATTENDANCE_THRESHOLD, threshold: LOW_ATTENDANCE_THRESHOLD });
});

/** GET /api/attendance/roster?subjectId=&date= — roster of the subject's class with existing statuses */
const getRoster = asyncHandler(async (req, res) => {
  const { subjectId, date } = req.query;
  if (!subjectId || !date) return res.status(400).json({ error: 'subjectId and date are required.' });
  const subject = await prisma.subject.findUnique({ where: { id: Number(subjectId) } });
  if (!subject) return res.status(404).json({ error: 'Subject not found.' });

  const students = await prisma.student.findMany({
    where: { classId: subject.classId }, include: { user: { select: { name: true } } }, orderBy: { rollNumber: 'asc' },
  });
  const existing = await prisma.attendance.findMany({
    where: { subjectId: subject.id, date: new Date(date), studentId: { in: students.map((s) => s.id) } },
  });
  const statusMap = Object.fromEntries(existing.map((e) => [e.studentId, e.status]));
  res.json(students.map((s) => ({ studentId: s.id, rollNumber: s.rollNumber, name: s.user.name, status: statusMap[s.id] || null })));
});

module.exports = { markAttendance, getStudentAttendance, getRoster };
