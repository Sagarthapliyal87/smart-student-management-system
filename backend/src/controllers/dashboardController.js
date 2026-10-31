const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { computeAttendancePercentage, LOW_ATTENDANCE_THRESHOLD, computeSGPA, groupMarksBySubject } = require('../utils/helpers');

// JS getDay(): 0=Sunday. Our enum has no SUN, so Sunday means "no classes".
const DAYS = [null, 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const today = () => DAYS[new Date().getDay()];
const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0));
const slotInclude = { subject: true, teacher: { include: { user: { select: { name: true } } } }, class: { include: { course: true } } };
const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0);

async function studentStats(student) {
  const [attendance, marks, submissions, exams, fees] = await Promise.all([
    prisma.attendance.findMany({ where: { studentId: student.id } }),
    prisma.mark.findMany({ where: { studentId: student.id }, include: { subject: true } }),
    prisma.submission.findMany({ where: { studentId: student.id }, include: { assignment: { include: { subject: true } } } }),
    student.classId
      ? prisma.exam.findMany({ where: { examDate: { gte: startOfToday() }, subject: { classId: student.classId } }, include: { subject: true }, orderBy: { examDate: 'asc' }, take: 5 })
      : [],
    prisma.fee.findMany({ where: { studentId: student.id }, include: { payments: true } }),
  ]);
  const attendancePercentage = computeAttendancePercentage(attendance);
  const bySubject = groupMarksBySubject(marks);
  const now = new Date();
  const pending = submissions.filter((s) => s.status === 'PENDING' && new Date(s.assignment.deadline) >= now);
  const outstanding = fees.reduce((a, f) => a + Number(f.amount) - f.payments.reduce((b, p) => b + Number(p.amountPaid), 0), 0);
  return {
    attendancePercentage,
    lowAttendanceWarning: attendance.length > 0 && attendancePercentage < LOW_ATTENDANCE_THRESHOLD,
    averageMarks: avg(bySubject.map((s) => s.percentage)),
    sgpa: computeSGPA(bySubject),
    pendingAssignments: pending.length,
    pendingList: pending.slice(0, 5).map((s) => ({ id: s.assignment.id, title: s.assignment.title, subject: s.assignment.subject.name, deadline: s.assignment.deadline })),
    totalAssignments: submissions.length,
    upcomingExams: exams,
    outstandingFees: outstanding,
    subjectPerformance: bySubject.map((s) => ({ subject: s.subject.name, percentage: s.percentage })),
  };
}

/** GET /api/dashboard/student */
const studentDashboard = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user.id }, include: { class: { include: { course: true } } } });
  if (!student) return res.status(403).json({ error: 'No student profile linked to this account.' });
  const stats = await studentStats(student);
  const [todaysClasses, notices, activity] = await Promise.all([
    student.classId && today() ? prisma.timetable.findMany({ where: { classId: student.classId, dayOfWeek: today() }, include: slotInclude, orderBy: { startTime: 'asc' } }) : [],
    prisma.notice.findMany({
      where: { OR: [{ targetRole: 'ALL', targetClassId: null }, { targetRole: 'STUDENT', targetClassId: null }, ...(student.classId ? [{ targetClassId: student.classId }] : [])] },
      orderBy: { createdAt: 'desc' }, take: 5,
    }),
    prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 6 }),
  ]);
  res.json({ ...stats, class: student.class, currentSemester: student.class?.semester ?? null, todaysClasses, recentNotices: notices, recentActivity: activity });
});

/** GET /api/dashboard/teacher */
const teacherDashboard = asyncHandler(async (req, res) => {
  const teacher = await prisma.teacher.findUnique({
    where: { userId: req.user.id },
    include: { subjects: { include: { subject: { include: { class: { include: { course: true } } } } } } },
  });
  if (!teacher) return res.status(403).json({ error: 'No teacher profile linked to this account.' });
  const subjectIds = teacher.subjects.map((s) => s.subjectId);

  const [todaysClasses, assignments, notices, marks, attendance] = await Promise.all([
    today() ? prisma.timetable.findMany({ where: { teacherId: teacher.id, dayOfWeek: today() }, include: slotInclude, orderBy: { startTime: 'asc' } }) : [],
    prisma.assignment.findMany({ where: { teacherId: teacher.id }, include: { submissions: { select: { status: true } } } }),
    prisma.notice.findMany({ where: { OR: [{ targetRole: 'ALL' }, { targetRole: 'TEACHER' }] }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.mark.findMany({ where: { subjectId: { in: subjectIds } }, include: { subject: true } }),
    prisma.attendance.findMany({ where: { subjectId: { in: subjectIds } }, select: { subjectId: true, status: true } }),
  ]);

  // Attendance tasks: today's slots for which no attendance has been marked yet
  const marked = await prisma.attendance.findMany({ where: { date: startOfToday(), markedById: teacher.id }, select: { subjectId: true }, distinct: ['subjectId'] });
  const markedIds = new Set(marked.map((m) => m.subjectId));
  const attendanceTasks = todaysClasses.filter((c) => !markedIds.has(c.subjectId));

  const pendingEvaluations = assignments.reduce((n, a) => n + a.submissions.filter((s) => s.status === 'SUBMITTED' || s.status === 'LATE').length, 0);
  const performance = teacher.subjects.map(({ subject }) => {
    const sm = marks.filter((m) => m.subjectId === subject.id);
    const sa = attendance.filter((a) => a.subjectId === subject.id);
    return {
      subject: subject.name, class: `${subject.class.course.name} Sem ${subject.class.semester} ${subject.class.section}`,
      averageMarks: avg(groupMarksBySubject(sm).map((x) => x.percentage)), attendance: computeAttendancePercentage(sa),
    };
  });

  res.json({
    classesAssigned: teacher.subjects.length,
    subjects: teacher.subjects.map((s) => s.subject),
    todaysClasses, attendanceTasks, pendingEvaluations, recentNotices: notices, performance,
  });
});

/** GET /api/dashboard/parent */
const parentDashboard = asyncHandler(async (req, res) => {
  const parent = await prisma.parent.findUnique({ where: { userId: req.user.id } });
  if (!parent) return res.status(403).json({ error: 'No parent profile linked to this account.' });
  const links = await prisma.studentParent.findMany({
    where: { parentId: parent.id },
    include: { student: { include: { user: { select: { name: true, email: true } }, class: { include: { course: true } } } } },
  });
  const children = await Promise.all(links.map(async (l) => ({
    relation: l.relation,
    student: { id: l.student.id, name: l.student.user.name, rollNumber: l.student.rollNumber, class: l.student.class },
    ...(await studentStats(l.student)),
  })));
  const classIds = links.map((l) => l.student.classId).filter(Boolean);
  const notices = await prisma.notice.findMany({
    where: { OR: [{ targetRole: 'ALL', targetClassId: null }, { targetRole: 'PARENT', targetClassId: null }, ...(classIds.length ? [{ targetClassId: { in: classIds } }] : [])] },
    orderBy: { createdAt: 'desc' }, take: 5,
  });
  res.json({ children, recentNotices: notices });
});

/** GET /api/dashboard/admin */
const adminDashboard = asyncHandler(async (req, res) => {
  const [students, teachers, parents, courses, classes, fees, attendance, marks, notices, payments] = await Promise.all([
    prisma.student.count({ where: { user: { isActive: true } } }),
    prisma.teacher.count({ where: { user: { isActive: true } } }),
    prisma.parent.count({ where: { user: { isActive: true } } }),
    prisma.course.count(), prisma.class.count(),
    prisma.fee.findMany({ include: { payments: true } }),
    prisma.attendance.findMany({ select: { status: true } }),
    prisma.mark.findMany({ select: { score: true, maxScore: true } }),
    prisma.notice.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { postedBy: { select: { name: true } } } }),
    prisma.feePayment.findMany({ orderBy: { paidAt: 'desc' }, take: 5, include: { fee: { include: { student: { include: { user: { select: { name: true } } } } } } } }),
  ]);
  const totalDue = fees.reduce((a, f) => a + Number(f.amount), 0);
  const totalCollected = fees.reduce((a, f) => a + f.payments.reduce((b, p) => b + Number(p.amountPaid), 0), 0);
  const feeStatus = { PAID: 0, PARTIAL: 0, UNPAID: 0 };
  fees.forEach((f) => { feeStatus[f.status]++; });
  const att = { PRESENT: 0, ABSENT: 0, LEAVE: 0 };
  attendance.forEach((a) => { att[a.status]++; });
  const totalScore = marks.reduce((a, m) => a + m.score, 0), totalMax = marks.reduce((a, m) => a + m.maxScore, 0);

  const recentActivity = [
    ...notices.map((n) => ({ type: 'Notice', text: `${n.postedBy.name} posted "${n.title}"`, at: n.createdAt })),
    ...payments.map((p) => ({ type: 'Payment', text: `${p.fee.student.user.name} paid Rs. ${Number(p.amountPaid)} (${p.receiptNumber})`, at: p.paidAt })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);

  res.json({
    totalStudents: students, totalTeachers: teachers, totalParents: parents, totalCourses: courses, totalClasses: classes,
    feeOverview: { totalDue, totalCollected, outstanding: totalDue - totalCollected, byStatus: feeStatus },
    attendanceOverview: { percentage: computeAttendancePercentage(attendance), breakdown: att, totalRecords: attendance.length },
    performanceOverview: { averagePercentage: totalMax ? Math.round((totalScore / totalMax) * 10000) / 100 : 0, totalMarksRecorded: marks.length },
    recentNotices: notices, recentActivity,
  });
});

module.exports = { studentDashboard, teacherDashboard, parentDashboard, adminDashboard };
