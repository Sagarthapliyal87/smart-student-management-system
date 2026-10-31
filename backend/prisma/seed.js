const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';
const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

async function wipe() {
  // Children first, so the seed can be re-run safely on an existing database.
  for (const m of ['message', 'notification', 'notice', 'feePayment', 'fee', 'document', 'submission', 'assignment',
    'studyMaterial', 'exam', 'mark', 'attendance', 'timetable', 'teacherSubject', 'studentParent', 'student',
    'teacher', 'parent', 'subject', 'class', 'course', 'user']) {
    await prisma[m].deleteMany();
  }
}

async function main() {
  console.log('Seeding database (this resets existing data)...');
  await wipe();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const mkUser = (name, email, role) => prisma.user.create({ data: { name, email, passwordHash, role } });

  const course = await prisma.course.create({ data: { name: 'B.Tech Computer Science Engineering', durationYears: 4 } });
  const cls = await prisma.class.create({ data: { courseId: course.id, semester: 5, section: 'B' } });
  const cls2 = await prisma.class.create({ data: { courseId: course.id, semester: 3, section: 'A' } });

  const sub = (name, code, classId) => prisma.subject.create({ data: { name, code, classId } });
  const [dbms, cpp, os, se] = await Promise.all([
    sub('Database Management Systems', 'CSE501', cls.id), sub('C++ Programming', 'CSE502', cls.id),
    sub('Operating Systems', 'CSE503', cls.id), sub('Software Engineering', 'CSE504', cls.id),
  ]);
  await sub('Data Structures', 'CSE301', cls2.id);

  const admin = await mkUser('System Admin', 'admin@college.edu', 'ADMIN');

  const t1u = await mkUser('Dr. Anita Sharma', 'teacher@college.edu', 'TEACHER');
  const t1 = await prisma.teacher.create({ data: { userId: t1u.id, department: 'Computer Science', designation: 'Associate Professor' } });
  const t2u = await mkUser('Prof. Ramesh Iyer', 'teacher2@college.edu', 'TEACHER');
  const t2 = await prisma.teacher.create({ data: { userId: t2u.id, department: 'Computer Science', designation: 'Assistant Professor' } });
  await prisma.teacherSubject.createMany({ data: [
    { teacherId: t1.id, subjectId: dbms.id }, { teacherId: t1.id, subjectId: cpp.id },
    { teacherId: t2.id, subjectId: os.id }, { teacherId: t2.id, subjectId: se.id },
  ] });

  // Timetable: every weekday has classes, so "Today's classes" is populated Mon-Sat
  const slots = [
    ['MON', dbms, t1, '09:00', '10:00', 'A-101'], ['MON', cpp, t1, '10:00', '11:00', 'A-102'], ['MON', se, t2, '11:00', '12:00', 'A-103'],
    ['TUE', os, t2, '09:00', '10:00', 'A-101'], ['TUE', dbms, t1, '10:00', '11:00', 'A-101'], ['TUE', cpp, t1, '11:00', '12:00', 'LAB-2'],
    ['WED', se, t2, '09:00', '10:00', 'A-103'], ['WED', os, t2, '10:00', '11:00', 'A-101'], ['WED', dbms, t1, '11:00', '12:00', 'A-101'],
    ['THU', cpp, t1, '09:00', '10:00', 'A-102'], ['THU', dbms, t1, '10:00', '11:00', 'LAB-1'], ['THU', os, t2, '11:00', '12:00', 'A-101'],
    ['FRI', se, t2, '09:00', '10:00', 'A-103'], ['FRI', cpp, t1, '10:00', '11:00', 'A-102'], ['FRI', os, t2, '11:00', '12:00', 'A-101'],
    ['SAT', dbms, t1, '09:00', '10:00', 'A-101'], ['SAT', se, t2, '10:00', '11:00', 'A-103'],
  ];
  await prisma.timetable.createMany({ data: slots.map(([dayOfWeek, s, t, startTime, endTime, roomNumber]) => (
    { classId: cls.id, subjectId: s.id, teacherId: t.id, dayOfWeek, startTime, endTime, roomNumber })) });

  // Students
  const studentDefs = [
    ['Sagar Verma', 'student@college.edu', 'CSE2023001'], ['Priya Nair', 'student2@college.edu', 'CSE2023002'],
    ['Aman Gupta', 'student3@college.edu', 'CSE2023003'], ['Neha Rawat', 'student4@college.edu', 'CSE2023004'],
  ];
  const students = [];
  for (const [name, email, rollNumber] of studentDefs) {
    const u = await mkUser(name, email, 'STUDENT');
    students.push(await prisma.student.create({
      data: { userId: u.id, rollNumber, classId: cls.id, admissionDate: new Date('2023-08-01'), address: 'Dehradun, Uttarakhand' },
    }));
  }

  const pu = await mkUser('Rakesh Verma', 'parent@college.edu', 'PARENT');
  const parent = await prisma.parent.create({ data: { userId: pu.id, occupation: 'Businessman' } });
  await prisma.studentParent.create({ data: { studentId: students[0].id, parentId: parent.id, relation: 'Father' } });

  // Attendance: last 12 weekdays, DBMS (t1) + OS (t2). Student 1 is deliberately borderline-low in DBMS.
  const att = [];
  let d = new Date(), n = 0;
  while (n < 12) {
    d = new Date(d.getTime() - 86400000);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const date = new Date(d.toISOString().slice(0, 10));
    students.forEach((s, i) => {
      const absentDbms = i === 0 ? n % 3 === 0 : n % 7 === i;
      att.push({ studentId: s.id, subjectId: dbms.id, date, status: absentDbms ? 'ABSENT' : 'PRESENT', markedById: t1.id });
      att.push({ studentId: s.id, subjectId: os.id, date, status: n % 9 === i ? 'LEAVE' : 'PRESENT', markedById: t2.id });
    });
    n++;
  }
  await prisma.attendance.createMany({ data: att });

  // Marks
  const mk = (s, subj, t, examType, score, maxScore) => ({ studentId: s.id, subjectId: subj.id, examType, score, maxScore, enteredById: t.id });
  await prisma.mark.createMany({ data: [
    mk(students[0], dbms, t1, 'INTERNAL', 16, 20), mk(students[0], dbms, t1, 'MID_SEM', 34, 50), mk(students[0], dbms, t1, 'PRACTICAL', 22, 25),
    mk(students[0], cpp, t1, 'INTERNAL', 15, 20), mk(students[0], cpp, t1, 'MID_SEM', 38, 50),
    mk(students[0], os, t2, 'INTERNAL', 12, 20), mk(students[0], os, t2, 'MID_SEM', 27, 50),
    mk(students[0], se, t2, 'INTERNAL', 18, 20), mk(students[0], se, t2, 'MID_SEM', 42, 50),
    mk(students[1], dbms, t1, 'INTERNAL', 19, 20), mk(students[1], dbms, t1, 'MID_SEM', 46, 50),
    mk(students[1], cpp, t1, 'INTERNAL', 17, 20), mk(students[2], dbms, t1, 'INTERNAL', 11, 20),
    mk(students[3], os, t2, 'INTERNAL', 14, 20),
  ] });

  // Assignments (one open, one overdue with a graded submission)
  const a1 = await prisma.assignment.create({ data: {
    subjectId: dbms.id, teacherId: t1.id, title: 'SQL Queries Practice Set',
    description: 'Solve the 10 SQL queries on joins, subqueries and normalization.', deadline: daysFromNow(7), maxMarks: 20,
    submissions: { create: students.map((s) => ({ studentId: s.id, status: 'PENDING' })) },
  } });
  const a2 = await prisma.assignment.create({ data: {
    subjectId: os.id, teacherId: t2.id, title: 'CPU Scheduling Report',
    description: 'Compare FCFS, SJF and Round Robin with worked examples.', deadline: daysFromNow(-3), maxMarks: 10,
    submissions: { create: students.map((s) => ({ studentId: s.id, status: 'PENDING' })) },
  } });
  await prisma.submission.update({
    where: { assignmentId_studentId: { assignmentId: a2.id, studentId: students[1].id } },
    data: { status: 'CHECKED', marksAwarded: 9, submittedAt: daysFromNow(-4), filePath: null },
  });

  // Exams
  await prisma.exam.createMany({ data: [
    { subjectId: dbms.id, title: 'End Semester - DBMS', examType: 'END_SEM', examDate: daysFromNow(12), startTime: '10:00', room: 'Exam Hall 1' },
    { subjectId: se.id, title: 'End Semester - Software Engineering', examType: 'END_SEM', examDate: daysFromNow(15), startTime: '10:00', room: 'Exam Hall 2' },
    { subjectId: os.id, title: 'End Semester - Operating Systems', examType: 'END_SEM', examDate: daysFromNow(18), startTime: '10:00', room: 'Exam Hall 1' },
  ] });

  // Fees
  const fee = (s, feeType, amount, due, status) => prisma.fee.create({ data: { studentId: s.id, feeType, amount, dueDate: due, status } });
  const tuition = await fee(students[0], 'TUITION', 45000, daysFromNow(10), 'PARTIAL');
  await prisma.feePayment.create({ data: { feeId: tuition.id, amountPaid: 20000, receiptNumber: 'RCPT-DEMO-000001' } });
  const exam = await fee(students[0], 'EXAM', 2000, daysFromNow(-5), 'PAID');
  await prisma.feePayment.create({ data: { feeId: exam.id, amountPaid: 2000, receiptNumber: 'RCPT-DEMO-000002' } });
  await fee(students[0], 'HOSTEL', 18000, daysFromNow(20), 'UNPAID');
  await fee(students[1], 'TUITION', 45000, daysFromNow(10), 'UNPAID');

  // Notices + notifications
  await prisma.notice.create({ data: { title: 'End-Semester Examination Schedule Released', content: 'The end-semester timetable has been published. Check the exam schedule on your dashboard.', postedById: admin.id, targetRole: 'ALL' } });
  await prisma.notice.create({ data: { title: 'DBMS Lab Rescheduled', content: 'Thursday DBMS lab is moved to LAB-1.', postedById: t1u.id, targetRole: 'STUDENT', targetClassId: cls.id } });
  await prisma.notification.createMany({ data: [
    { userId: students[0].userId, type: 'LOW_ATTENDANCE', message: 'Low attendance warning: your DBMS attendance is below 75%.' },
    { userId: students[0].userId, type: 'ASSIGNMENT', message: 'New assignment in Database Management Systems: SQL Queries Practice Set' },
    { userId: students[0].userId, type: 'NOTICE', message: 'New notice: End-Semester Examination Schedule Released' },
  ] });

  console.log('\nSeed complete. Demo logins (password for all: ' + DEMO_PASSWORD + ')');
  console.log('  Admin   admin@college.edu');
  console.log('  Teacher teacher@college.edu (DBMS, C++)  |  teacher2@college.edu (OS, SE)');
  console.log('  Student student@college.edu (+ student2/3/4@college.edu)');
  console.log('  Parent  parent@college.edu (linked to student@college.edu)');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
