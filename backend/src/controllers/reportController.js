const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { computeAttendancePercentage, groupMarksBySubject } = require('../utils/helpers');

/** Flat rows -> CSV. A UTF-8 BOM is added so Excel opens it correctly (CSV opens directly in Excel). */
function sendCSV(res, filename, rows) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv);
}
const respond = (req, res, name, rows) => (req.query.format === 'csv' ? sendCSV(res, `${name}.csv`, rows) : res.json(rows));
const className = (c) => (c ? `${c.course.name} - Sem ${c.semester} - ${c.section}` : '-');

const attendanceReport = asyncHandler(async (req, res) => {
  const { classId } = req.query;
  const students = await prisma.student.findMany({
    where: classId ? { classId: Number(classId) } : {},
    include: { user: true, attendance: true, class: { include: { course: true } } }, orderBy: { rollNumber: 'asc' },
  });
  respond(req, res, 'attendance_report', students.map((s) => ({
    rollNumber: s.rollNumber, name: s.user.name, class: className(s.class),
    totalClasses: s.attendance.length, attendancePercentage: computeAttendancePercentage(s.attendance),
    status: s.attendance.length && computeAttendancePercentage(s.attendance) < 75 ? 'LOW' : 'OK',
  })));
});

const marksReport = asyncHandler(async (req, res) => {
  const { classId } = req.query;
  const students = await prisma.student.findMany({
    where: classId ? { classId: Number(classId) } : {},
    include: { user: true, marks: { include: { subject: true } }, class: { include: { course: true } } }, orderBy: { rollNumber: 'asc' },
  });
  respond(req, res, 'marks_report', students.map((s) => {
    const by = groupMarksBySubject(s.marks);
    const overall = by.length ? Math.round((by.reduce((a, x) => a + x.percentage, 0) / by.length) * 100) / 100 : 0;
    return { rollNumber: s.rollNumber, name: s.user.name, class: className(s.class), subjectsGraded: by.length, overallPercentage: overall };
  }));
});

const feesReport = asyncHandler(async (req, res) => {
  const fees = await prisma.fee.findMany({ include: { student: { include: { user: true } }, payments: true }, orderBy: { dueDate: 'asc' } });
  respond(req, res, 'fees_report', fees.map((f) => {
    const paid = f.payments.reduce((a, p) => a + Number(p.amountPaid), 0);
    return {
      rollNumber: f.student.rollNumber, student: f.student.user.name, feeType: f.feeType, amount: Number(f.amount),
      paid, remaining: Number(f.amount) - paid, status: f.status, dueDate: f.dueDate.toISOString().slice(0, 10),
    };
  }));
});

const departmentReport = asyncHandler(async (req, res) => {
  const courses = await prisma.course.findMany({
    include: { classes: { include: { students: { include: { attendance: true, marks: { include: { subject: true } } } } } } },
  });
  respond(req, res, 'department_report', courses.map((c) => {
    const students = c.classes.flatMap((x) => x.students);
    const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0);
    return {
      course: c.name, classes: c.classes.length, students: students.length,
      averageAttendance: avg(students.filter((s) => s.attendance.length).map((s) => computeAttendancePercentage(s.attendance))),
      averageMarks: avg(students.map((s) => { const by = groupMarksBySubject(s.marks); return by.length ? by.reduce((a, x) => a + x.percentage, 0) / by.length : null; }).filter((v) => v !== null)),
    };
  }));
});

module.exports = { attendanceReport, marksReport, feesReport, departmentReport };
