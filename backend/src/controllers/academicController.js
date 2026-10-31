const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// ---------- Courses ----------
const listCourses = asyncHandler(async (req, res) => {
  res.json(await prisma.course.findMany({ include: { classes: true }, orderBy: { id: 'asc' } }));
});
const createCourse = asyncHandler(async (req, res) => {
  const { name, durationYears } = req.body;
  if (!name || !durationYears) return res.status(400).json({ error: 'name and durationYears are required.' });
  res.status(201).json(await prisma.course.create({ data: { name, durationYears: Number(durationYears) } }));
});
const updateCourse = asyncHandler(async (req, res) => {
  const { name, durationYears } = req.body;
  res.json(await prisma.course.update({
    where: { id: Number(req.params.id) },
    data: { name, durationYears: durationYears ? Number(durationYears) : undefined },
  }));
});
const deleteCourse = asyncHandler(async (req, res) => {
  const count = await prisma.class.count({ where: { courseId: Number(req.params.id) } });
  if (count > 0) return res.status(409).json({ error: 'Cannot delete a course that still has classes.' });
  await prisma.course.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Course deleted.' });
});

// ---------- Classes ----------
const listClasses = asyncHandler(async (req, res) => {
  res.json(await prisma.class.findMany({
    include: { course: true, _count: { select: { students: true, subjects: true } } },
    orderBy: [{ courseId: 'asc' }, { semester: 'asc' }, { section: 'asc' }],
  }));
});
const createClass = asyncHandler(async (req, res) => {
  const { courseId, semester, section } = req.body;
  if (!courseId || !semester || !section) return res.status(400).json({ error: 'courseId, semester and section are required.' });
  res.status(201).json(await prisma.class.create({
    data: { courseId: Number(courseId), semester: Number(semester), section },
    include: { course: true },
  }));
});
const deleteClass = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if ((await prisma.student.count({ where: { classId: id } })) > 0) {
    return res.status(409).json({ error: 'Cannot delete a class that still has students enrolled.' });
  }
  await prisma.class.delete({ where: { id } });
  res.json({ message: 'Class deleted.' });
});

// ---------- Subjects ----------
const listSubjects = asyncHandler(async (req, res) => {
  const where = req.query.classId ? { classId: Number(req.query.classId) } : {};
  res.json(await prisma.subject.findMany({
    where,
    include: { class: { include: { course: true } }, teachers: { include: { teacher: { include: { user: { select: { name: true } } } } } } },
    orderBy: { id: 'asc' },
  }));
});
const createSubject = asyncHandler(async (req, res) => {
  const { name, code, classId } = req.body;
  if (!name || !code || !classId) return res.status(400).json({ error: 'name, code and classId are required.' });
  res.status(201).json(await prisma.subject.create({ data: { name, code, classId: Number(classId) }, include: { class: true } }));
});
const deleteSubject = asyncHandler(async (req, res) => {
  await prisma.subject.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Subject deleted.' });
});

/** GET /api/academics/classes/:id/students — roster used by teachers for attendance/marks */
const classStudents = asyncHandler(async (req, res) => {
  const students = await prisma.student.findMany({
    where: { classId: Number(req.params.id) },
    include: { user: { select: { name: true } } },
    orderBy: { rollNumber: 'asc' },
  });
  res.json(students);
});

module.exports = {
  listCourses, createCourse, updateCourse, deleteCourse,
  listClasses, createClass, deleteClass,
  listSubjects, createSubject, deleteSubject, classStudents,
};
