const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const slotInclude = {
  subject: true,
  teacher: { include: { user: { select: { name: true } } } },
  class: { include: { course: true } },
};

/** GET /api/timetable/class/:classId */
const getClassTimetable = asyncHandler(async (req, res) => {
  res.json(await prisma.timetable.findMany({
    where: { classId: Number(req.params.classId) }, include: slotInclude,
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  }));
});

/** GET /api/timetable/my — student's class timetable or teacher's teaching slots */
const getMyTimetable = asyncHandler(async (req, res) => {
  let where = null;
  if (req.user.role === 'STUDENT') {
    const s = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (s?.classId) where = { classId: s.classId };
  } else if (req.user.role === 'TEACHER') {
    const t = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (t) where = { teacherId: t.id };
  }
  if (!where) return res.json([]);
  res.json(await prisma.timetable.findMany({ where, include: slotInclude, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] }));
});

const createSlot = asyncHandler(async (req, res) => {
  const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, roomNumber } = req.body;
  if (!classId || !subjectId || !teacherId || !dayOfWeek || !startTime || !endTime) {
    return res.status(400).json({ error: 'classId, subjectId, teacherId, dayOfWeek, startTime and endTime are required.' });
  }
  if (startTime >= endTime) return res.status(400).json({ error: 'End time must be after start time.' });
  res.status(201).json(await prisma.timetable.create({
    data: { classId: Number(classId), subjectId: Number(subjectId), teacherId: Number(teacherId), dayOfWeek, startTime, endTime, roomNumber },
    include: slotInclude,
  }));
});

const deleteSlot = asyncHandler(async (req, res) => {
  await prisma.timetable.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Timetable slot removed.' });
});

module.exports = { getClassTimetable, getMyTimetable, createSlot, deleteSlot };
